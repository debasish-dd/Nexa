import type { PoolClient } from "pg";
import { getPool } from "../../db/pool";
import { ApiError } from "../../utils/api-error";
import {
    createConversation,
    deleteConversation,
} from "../../repositories/messaging/conversation.repository";
import {
    createGroup,
    deleteGroupByConversationId,
    findGroupByConversationId,
    findMember,
    getMemberRole,
    listMembers,
    removeMember as removeMemberRepository,
    setGroupAdminId,
    setMemberRole,
    updateGroupFields,
    type Group,
    type GroupMember,
} from "../../repositories/messaging/group.repository";
import {
    addParticipant,
    type ParticipantRole,
} from "../../repositories/messaging/participant.repository";

const MAX_NAME_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const DEFAULT_GROUP_PROFILE = "default_url";

export interface CreateGroupInput {
    name: unknown;
    description?: unknown;
    groupProfile?: unknown;
}

export interface UpdateGroupInput {
    name?: unknown;
    description?: unknown;
    groupProfile?: unknown;
}

export interface GroupResult {
    conversationId: string;
    adminId: string;
    name: string;
    description: string | null;
    groupProfile: string;
    createdAt: Date;
}

export interface GroupDetails extends GroupResult {
    myRole: ParticipantRole;
    members: GroupMember[];
}

/* ---------- small helpers ---------- */

const hasPgCode = (error: unknown, code: string): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code;

// 22P02 = "invalid input syntax": a malformed id in the URL or body.
const mapDbError = (error: unknown): unknown =>
    hasPgCode(error, "22P02") ? new ApiError(400, "Invalid id") : error;

const toGroupResult = (group: Group): GroupResult => ({
    conversationId: group.conversationId,
    adminId: group.adminId,
    name: group.name,
    description: group.description,
    groupProfile: group.groupProfile,
    createdAt: group.createdAt,
});

const cleanName = (value: unknown): string => {
    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(400, "Group name is required");
    }

    const name = value.trim();

    if (name.length > MAX_NAME_LENGTH) {
        throw new ApiError(
            400,
            `Group name must be at most ${MAX_NAME_LENGTH} characters`,
        );
    }

    return name;
};

// Empty or null clears the description.
const cleanDescription = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;

    if (typeof value !== "string") {
        throw new ApiError(400, "Description must be text");
    }

    const description = value.trim();

    if (description.length > MAX_DESCRIPTION_LENGTH) {
        throw new ApiError(
            400,
            `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
        );
    }

    return description || null;
};

// Only http(s) URLs: this blocks things like "javascript:...".
const cleanProfileUrl = (value: unknown): string => {
    if (typeof value !== "string" || value.length > MAX_URL_LENGTH) {
        throw new ApiError(400, "groupProfile must be a URL");
    }

    try {
        const url = new URL(value);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("bad protocol");
        }
    } catch {
        throw new ApiError(400, "groupProfile must be an http or https URL");
    }

    return value;
};

/**
 * Runs `work` in a transaction after locking the group's row. Everything that
 * changes a group goes through here, so changes to one group happen one at a
 * time and every permission check sees fresh data.
 */
const withGroupLock = async <T>(
    conversationId: string,
    work: (client: PoolClient, group: Group) => Promise<T>,
): Promise<T> => {
    const client = await getPool().connect();

    try {
        await client.query("BEGIN");

        const group = await findGroupByConversationId(
            conversationId,
            client,
            true,
        );

        if (!group) {
            throw new ApiError(404, "Group not found");
        }

        const result = await work(client, group);

        await client.query("COMMIT");

        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw mapDbError(error);
    } finally {
        client.release();
    }
};

// Non-members get the same answer as "group doesn't exist".
const requireRole = async (
    client: PoolClient,
    conversationId: string,
    userId: string,
    allowed: ParticipantRole[],
): Promise<ParticipantRole> => {
    const role = await getMemberRole(conversationId, userId, client);

    if (!role) {
        throw new ApiError(404, "Group not found");
    }

    if (!allowed.includes(role)) {
        throw new ApiError(403, "You don't have permission to do that");
    }

    return role;
};

/* ---------- group ---------- */

export const createGC = async (
    adminId: string,
    input: CreateGroupInput,
): Promise<GroupResult> => {
    const name = cleanName(input.name);
    const description = cleanDescription(input.description);
    const groupProfile =
        input.groupProfile === undefined
            ? DEFAULT_GROUP_PROFILE
            : cleanProfileUrl(input.groupProfile);

    const client = await getPool().connect();

    try {
        await client.query("BEGIN");

        const conversation = await createConversation("gc", client);

        const group = await createGroup(
            conversation.id,
            adminId,
            name,
            description,
            groupProfile,
            client,
        );

        await addParticipant(conversation.id, adminId, "admin", client);

        await client.query("COMMIT");

        return toGroupResult(group);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getGC = async (
    conversationId: string,
    callerId: string,
): Promise<GroupDetails> => {
    try {
        const myRole = await getMemberRole(conversationId, callerId);
        const group = myRole
            ? await findGroupByConversationId(conversationId)
            : null;

        if (!myRole || !group) {
            throw new ApiError(404, "Group not found");
        }

        const members = await listMembers(conversationId);

        return { ...toGroupResult(group), myRole, members };
    } catch (error) {
        throw mapDbError(error);
    }
};

export const updateGroup = async (
    conversationId: string,
    callerId: string,
    input: UpdateGroupInput,
): Promise<GroupResult> => {
    // Check the input before taking any lock.
    const fields = {
        name: input.name !== undefined ? cleanName(input.name) : undefined,
        description:
            input.description !== undefined
                ? cleanDescription(input.description)
                : undefined,
        groupProfile:
            input.groupProfile !== undefined
                ? cleanProfileUrl(input.groupProfile)
                : undefined,
    };

    if (
        fields.name === undefined &&
        fields.description === undefined &&
        fields.groupProfile === undefined
    ) {
        throw new ApiError(400, "Nothing to update");
    }

    return withGroupLock(conversationId, async (client) => {
        await requireRole(client, conversationId, callerId, ["admin", "mod"]);

        const updated = await updateGroupFields(conversationId, fields, client);

        if (!updated) {
            throw new ApiError(404, "Group not found");
        }

        return toGroupResult(updated);
    });
};

export const deleteGroup = async (
    conversationId: string,
    callerId: string,
): Promise<void> => {
    await withGroupLock(conversationId, async (client) => {
        await requireRole(client, conversationId, callerId, ["admin"]);

        await deleteGroupByConversationId(conversationId, client);
        await deleteConversation(conversationId, client);
    });
};

/* ---------- members ---------- */

export const addMember = async (
    conversationId: string,
    callerId: string,
    targetUserId: string,
): Promise<GroupMember> =>
    withGroupLock(conversationId, async (client) => {
        await requireRole(client, conversationId, callerId, ["admin", "mod"]);

        const existing = await getMemberRole(
            conversationId,
            targetUserId,
            client,
        );

        if (existing) {
            throw new ApiError(409, "User is already a member of this group");
        }

        try {
            await addParticipant(conversationId, targetUserId, "member", client);
        } catch (error) {
            // 23503 = foreign key violation: there is no such user.
            if (hasPgCode(error, "23503")) {
                throw new ApiError(404, "User not found");
            }
            throw error;
        }

        const member = await findMember(conversationId, targetUserId, client);

        if (!member) {
            throw new Error("Member was added but could not be read back");
        }

        return member;
    });

// Covers both kicking someone and leaving (when targetUserId is yourself).
export const removeMember = async (
    conversationId: string,
    callerId: string,
    targetUserId: string,
): Promise<void> => {
    await withGroupLock(conversationId, async (client) => {
        const callerRole = await requireRole(
            client,
            conversationId,
            callerId,
            ["admin", "mod", "member"],
        );

        if (callerId === targetUserId) {
            if (callerRole === "admin") {
                throw new ApiError(
                    409,
                    "Transfer admin to someone else before leaving, or delete the group",
                );
            }

            await removeMemberRepository(conversationId, callerId, client);
            return;
        }

        if (callerRole === "member") {
            throw new ApiError(403, "You don't have permission to remove members");
        }

        const targetRole = await getMemberRole(
            conversationId,
            targetUserId,
            client,
        );

        if (!targetRole) {
            throw new ApiError(404, "Member not found");
        }

        if (targetRole === "admin") {
            throw new ApiError(403, "The admin cannot be removed");
        }

        if (callerRole === "mod" && targetRole !== "member") {
            throw new ApiError(403, "Mods can only remove regular members");
        }

        await removeMemberRepository(conversationId, targetUserId, client);
    });
};

export const changeMemberRole = async (
    conversationId: string,
    callerId: string,
    targetUserId: string,
    role: unknown,
): Promise<GroupMember> => {
    if (role !== "member" && role !== "mod") {
        throw new ApiError(
            400,
            'Role must be "member" or "mod". Use transfer-admin to change the admin.',
        );
    }

    return withGroupLock(conversationId, async (client) => {
        await requireRole(client, conversationId, callerId, ["admin"]);

        if (callerId === targetUserId) {
            throw new ApiError(400, "You can't change your own role");
        }

        const targetRole = await getMemberRole(
            conversationId,
            targetUserId,
            client,
        );

        if (!targetRole) {
            throw new ApiError(404, "Member not found");
        }

        if (targetRole === "admin") {
            throw new ApiError(400, "Use transfer-admin to change the admin");
        }

        await setMemberRole(conversationId, targetUserId, role, client);

        const member = await findMember(conversationId, targetUserId, client);

        if (!member) {
            throw new Error("Member role changed but could not be read back");
        }

        return member;
    });
};

export const transferAdmin = async (
    conversationId: string,
    callerId: string,
    targetUserId: string,
): Promise<GroupResult> =>
    withGroupLock(conversationId, async (client) => {
        await requireRole(client, conversationId, callerId, ["admin"]);

        if (callerId === targetUserId) {
            throw new ApiError(400, "You are already the admin");
        }

        const targetRole = await getMemberRole(
            conversationId,
            targetUserId,
            client,
        );

        if (!targetRole) {
            throw new ApiError(404, "Member not found");
        }

        // Order matters: free the admin slot first, because the database
        // allows only one admin per conversation. The old admin becomes a mod.
        await setMemberRole(conversationId, callerId, "mod", client);
        await setMemberRole(conversationId, targetUserId, "admin", client);
        await setGroupAdminId(conversationId, targetUserId, client);

        const updated = await findGroupByConversationId(conversationId, client);

        if (!updated) {
            throw new ApiError(404, "Group not found");
        }

        return toGroupResult(updated);
    });