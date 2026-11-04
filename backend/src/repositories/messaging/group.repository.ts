import type { Pool, PoolClient } from "pg";
import { getPool } from "../../db/pool";
import type { ParticipantRole } from "./participant.repository";

const pool = getPool();

type QueryExecutor = Pool | PoolClient;

export interface Group {
    id: string;
    conversationId: string;
    createdAt: Date;
    adminId: string;
    name: string;
    description: string | null;
    groupProfile: string;
}

export interface GroupMember {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: ParticipantRole;
    joinedAt: Date;
}

// Constants, not user input, so it is safe to splice them into the SQL below.
const GROUP_COLUMNS = `
    id,
    conversation_id AS "conversationId",
    created_at AS "createdAt",
    admin_id AS "adminId",
    name,
    description,
    group_profile AS "groupProfile"
`;

const MEMBER_SELECT = `
    SELECT
        cp.user_id AS "userId",
        u.username,
        u.display_name AS "displayName",
        u.avatar_url AS "avatarUrl",
        cp.role,
        cp.joined_at AS "joinedAt"
    FROM conversation_participants cp
    JOIN users u ON u.id = cp.user_id
`;

/**
 * Create a group for an existing group conversation.
 */
export const createGroup = async (
    conversationId: string,
    adminId: string,
    name: string,
    description: string | null = null,
    groupProfile: string = "default_url",
    client?: PoolClient,
): Promise<Group> => {
    const db = client ?? pool;

    const result = await db.query<Group>(
        `
        INSERT INTO groups (
            conversation_id,
            admin_id,
            name,
            description,
            group_profile
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${GROUP_COLUMNS}
        `,
        [conversationId, adminId, name, description, groupProfile],
    );

    const group = result.rows[0];

    if (!group) {
        throw new Error("Failed to create group");
    }

    return group;
};

/**
 * Find a group by its conversation id. With forUpdate = true the row is locked
 * until the surrounding transaction ends, which serializes changes to one group.
 */
export const findGroupByConversationId = async (
    conversationId: string,
    executor: QueryExecutor = pool,
    forUpdate = false,
): Promise<Group | null> => {
    const result = await executor.query<Group>(
        `
        SELECT ${GROUP_COLUMNS}
        FROM groups
        WHERE conversation_id = $1
        ${forUpdate ? "FOR UPDATE" : ""}
        `,
        [conversationId],
    );

    return result.rows[0] ?? null;
};

/**
 * Partial update done in SQL, so two people editing different fields at the
 * same moment can't overwrite each other. undefined means "leave it alone".
 */
export const updateGroupFields = async (
    conversationId: string,
    fields: {
        name?: string | undefined;
        description?: string | null | undefined;
        groupProfile?: string | undefined;
    },
    executor: QueryExecutor = pool,
): Promise<Group | null> => {
    const result = await executor.query<Group>(
        `
        UPDATE groups
        SET
            name = COALESCE($2, name),
            description = CASE WHEN $3::boolean THEN $4 ELSE description END,
            group_profile = COALESCE($5, group_profile)
        WHERE conversation_id = $1
        RETURNING ${GROUP_COLUMNS}
        `,
        [
            conversationId,
            fields.name ?? null,
            fields.description !== undefined,
            fields.description ?? null,
            fields.groupProfile ?? null,
        ],
    );

    return result.rows[0] ?? null;
};

export const setGroupAdminId = async (
    conversationId: string,
    adminId: string,
    executor: QueryExecutor = pool,
): Promise<boolean> => {
    const result = await executor.query(
        `
        UPDATE groups
        SET admin_id = $2
        WHERE conversation_id = $1
        `,
        [conversationId, adminId],
    );

    return result.rowCount === 1;
};

export const deleteGroupByConversationId = async (
    conversationId: string,
    executor: QueryExecutor = pool,
): Promise<boolean> => {
    const result = await executor.query(
        `
        DELETE FROM groups
        WHERE conversation_id = $1
        `,
        [conversationId],
    );

    return result.rowCount === 1;
};

export const getMemberRole = async (
    conversationId: string,
    userId: string,
    executor: QueryExecutor = pool,
): Promise<ParticipantRole | null> => {
    const result = await executor.query<{ role: ParticipantRole }>(
        `
        SELECT role
        FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
        LIMIT 1
        `,
        [conversationId, userId],
    );

    return result.rows[0]?.role ?? null;
};

export const setMemberRole = async (
    conversationId: string,
    userId: string,
    role: ParticipantRole,
    executor: QueryExecutor = pool,
): Promise<boolean> => {
    const result = await executor.query(
        `
        UPDATE conversation_participants
        SET role = $3
        WHERE conversation_id = $1
          AND user_id = $2
        `,
        [conversationId, userId, role],
    );

    return result.rowCount === 1;
};

export const removeMember = async (
    conversationId: string,
    userId: string,
    executor: QueryExecutor = pool,
): Promise<boolean> => {
    const result = await executor.query(
        `
        DELETE FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
        `,
        [conversationId, userId],
    );

    return result.rowCount === 1;
};

/**
 * Members with names and avatars, admin first, then mods, then members.
 */
export const listMembers = async (
    conversationId: string,
    executor: QueryExecutor = pool,
): Promise<GroupMember[]> => {
    const result = await executor.query<GroupMember>(
        `
        ${MEMBER_SELECT}
        WHERE cp.conversation_id = $1
        ORDER BY
            CASE cp.role WHEN 'admin' THEN 0 WHEN 'mod' THEN 1 ELSE 2 END,
            cp.joined_at ASC
        `,
        [conversationId],
    );

    return result.rows;
};

export const findMember = async (
    conversationId: string,
    userId: string,
    executor: QueryExecutor = pool,
): Promise<GroupMember | null> => {
    const result = await executor.query<GroupMember>(
        `
        ${MEMBER_SELECT}
        WHERE cp.conversation_id = $1
          AND cp.user_id = $2
        LIMIT 1
        `,
        [conversationId, userId],
    );

    return result.rows[0] ?? null;
};