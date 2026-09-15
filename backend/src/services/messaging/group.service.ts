import { getPool } from "../../db/pool";

import { createConversation } from "../../repositories/messaging/conversation.repository";
import { createGroup, findGroupById } from "../../repositories/messaging/group.repository";
import { addParticipant, getParticipants } from "../../repositories/messaging/participant.repository";
import {
    updateGroup as updateGroupRepository,
    deleteGroup as deleteGroupRepository,
} from "../../repositories/messaging/group.repository";
export interface CreateGroupInput {
    adminId: string;
    name: string;
    description?: string | null;
    groupProfile?: string;
}

export interface GroupResult {
    groupId: string;
    conversationId: string;
    adminId: string;
    name: string;
    description: string | null;
    groupProfile: string;
}
export interface GroupDetails {
    groupId: string;
    conversationId: string;
    createdAt: Date;
    adminId: string;
    name: string;
    description: string | null;
    groupProfile: string;
    participants: {
        userId: string;
        role: string;
        joinedAt: Date;
    }[];
}

export interface CreateGroupInput {
    adminId: string;
    name: string;
    description?: string | null;
    groupProfile?: string;
}

export interface UpdateGroupInput {
    name?: string;
    description?: string | null;
    groupProfile?: string;
}

export interface GroupResult {
    groupId: string;
    conversationId: string;
    adminId: string;
    name: string;
    description: string | null;
    groupProfile: string;
}
export interface GroupDetails extends GroupResult {
    createdAt: Date;
    participants: {
        userId: string;
        role: string;
        joinedAt: Date;
    }[];
}

export const createGC = async (
    input: CreateGroupInput,
): Promise<GroupResult> => {

    const {
        adminId,
        name,
        description = null,
        groupProfile = "default_url",
    } = input;
    if (!adminId) {
        throw new Error("Admin ID is required");
    }

    if (!name.trim()) {
        throw new Error("Group name is required");
    }
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const conversation = await createConversation(
            "gc",
            client,
        );

        const group = await createGroup(
            conversation.id,
            adminId,
            name.trim(),
            description,
            groupProfile,
            client,
        );

        await addParticipant(
            conversation.id,
            adminId,
            "admin",
            client,
        );

        await client.query("COMMIT");
        return {
            groupId: group.id,
            conversationId: group.conversationId,
            adminId: group.adminId,
            name: group.name,
            description: group.description,
            groupProfile: group.groupProfile,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }finally {
        client.release();
    }
}

export const getGC = async(groupId: string): Promise<GroupDetails | null> =>{
    const group = await findGroupById(groupId);

    if (!group) {
        return null;
    }
    const participants = await getParticipants(
        group.conversationId,
    );

    return {
        groupId: group.id,
        conversationId: group.conversationId,
        createdAt: group.createdAt,
        adminId: group.adminId,
        name: group.name,
        description: group.description,
        groupProfile: group.groupProfile,
        participants: participants.map((participant) => ({
            userId: participant.userId,
            role: participant.role,
            joinedAt: participant.joinedAt,
        })),
    };

}

export const updateGroup = async (
    groupId: string,
    input: UpdateGroupInput,
): Promise<GroupResult | null> => {
    const existingGroup = await findGroupById(groupId);

    if (!existingGroup) {
        return null;
    }

    const name = input.name !== undefined
        ? input.name.trim()
        : existingGroup.name;

    const description = input.description !== undefined
        ? input.description
        : existingGroup.description;

    const groupProfile = input.groupProfile !== undefined
        ? input.groupProfile
        : existingGroup.groupProfile;

    if (!name) {
        throw new Error("Group name cannot be empty");
    }
      const updatedGroup = await updateGroupRepository(
        groupId,
        name,
        description,
        groupProfile,
    );

    if (!updatedGroup) {
        return null;
    }

    return {
        groupId: updatedGroup.id,
        conversationId: updatedGroup.conversationId,
        adminId: updatedGroup.adminId,
        name: updatedGroup.name,
        description: updatedGroup.description,
        groupProfile: updatedGroup.groupProfile,
    };
};

export const deleteGroup = async (
    groupId: string,
): Promise<boolean> => {
    const group = await findGroupById(groupId);

    if (!group) {
        return false;
    }
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `
            DELETE FROM groups
            WHERE id = $1
            `,
            [groupId],
        );
                await client.query(
            `
            DELETE FROM conversations
            WHERE id = $1
            `,
            [group.conversationId],
        );

        await client.query("COMMIT");

        return true;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};