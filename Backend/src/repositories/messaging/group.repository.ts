import type { PoolClient } from "pg";
import { getPool } from "../../db/pool";

const pool = getPool();

export interface Group {
    id: string;
    conversationId: string;
    createdAt: Date;
    adminId: string;
    name: string;
    description: string | null;
    groupProfile: string;
}

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
        RETURNING
            id,
            conversation_id AS "conversationId",
            created_at AS "createdAt",
            admin_id AS "adminId",
            name,
            description,
            group_profile AS "groupProfile"
        `,
        [
            conversationId,
            adminId,
            name,
            description,
            groupProfile,
        ],
    );

    const group = result.rows[0];

    if (!group) {
        throw new Error("Failed to create group");
    }

    return group;
};

/**
 * Find a group by its ID.
 */
export const findGroupById = async (
    groupId: string,
): Promise<Group | null> => {
    const result = await pool.query<Group>(
        `
        SELECT
            id,
            conversation_id AS "conversationId",
            created_at AS "createdAt",
            admin_id AS "adminId",
            name,
            description,
            group_profile AS "groupProfile"
        FROM groups
        WHERE id = $1
        LIMIT 1
        `,
        [groupId],
    );

    return result.rows[0] ?? null;
};

/**
 * Find a group by its conversation ID.
 */
export const findGroupByConversationId = async (
    conversationId: string,
): Promise<Group | null> => {
    const result = await pool.query<Group>(
        `
        SELECT
            id,
            conversation_id AS "conversationId",
            created_at AS "createdAt",
            admin_id AS "adminId",
            name,
            description,
            group_profile AS "groupProfile"
        FROM groups
        WHERE conversation_id = $1
        LIMIT 1
        `,
        [conversationId],
    );

    return result.rows[0] ?? null;
};

/**
 * Update group information.
 */
export const updateGroup = async (
    groupId: string,
    name: string,
    description: string | null,
    groupProfile: string,
): Promise<Group | null> => {
    const result = await pool.query<Group>(
        `
        UPDATE groups
        SET
            name = $2,
            description = $3,
            group_profile = $4
        WHERE id = $1
        RETURNING
            id,
            conversation_id AS "conversationId",
            created_at AS "createdAt",
            admin_id AS "adminId",
            name,
            description,
            group_profile AS "groupProfile"
        `,
        [groupId, name, description, groupProfile],
    );

    return result.rows[0] ?? null;
};

/**
 * Change the group administrator.
 */
export const updateGroupAdmin = async (
    groupId: string,
    adminId: string,
): Promise<Group | null> => {
    const result = await pool.query<Group>(
        `
        UPDATE groups
        SET admin_id = $2
        WHERE id = $1
        RETURNING
            id,
            conversation_id AS "conversationId",
            created_at AS "createdAt",
            admin_id AS "adminId",
            name,
            description,
            group_profile AS "groupProfile"
        `,
        [groupId, adminId],
    );

    return result.rows[0] ?? null;
};

/**
 * Delete a group by its ID.
 */
export const deleteGroup = async (
    groupId: string,
): Promise<boolean> => {
    const result = await pool.query(
        `
        DELETE FROM groups
        WHERE id = $1
        `,
        [groupId],
    );

    return result.rowCount === 1;
};