import type { Pool, PoolClient } from "pg";
import { getPool } from "../../db/pool";
import type { ConversationParticipant, ParticipantRole } from "./participant.repository";

const pool = getPool();

type QueryExecutor = Pool | PoolClient;

export type JoinGroupResult =
    | { status: "joined"; participant: ConversationParticipant }
    | { status: "already_member" }
    | { status: "not_found" };


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

export interface GroupInboxRow {
    conversationId: string;
    groupName: string;
    groupProfile: string | null;
    myRole: "member" | "mod" | "admin";
    memberCount: number;

    lastMessageId: string | null;
    lastMessageSenderId: string | null;
    lastMessageContent: string | null;
    lastMessageCreatedAt: Date | null;
    lastMessageIsDeleted: boolean | null;
    lastMessageSenderName: string | null;

    lastActivityAt: Date;
    unreadCount: number;
}

export interface DiscoverableGroupRow {
    conversationId: string;
    name: string;
    description: string | null;
    groupProfile: string | null;
    memberCount: number;
    createdAt: Date;
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

export const getGroupInboxForUser = async (
    userId: string,
    limit: number,
    executor: QueryExecutor = pool,
): Promise<GroupInboxRow[]> => {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);

    const result = await executor.query<GroupInboxRow>(
        `
        SELECT
            g.conversation_id AS "conversationId",
            g.name AS "groupName",
            g.group_profile AS "groupProfile",

            me.role AS "myRole",

            (
                SELECT COUNT(*)::int
                FROM conversation_participants cp
                WHERE cp.conversation_id = g.conversation_id
            ) AS "memberCount",

            lm.id AS "lastMessageId",
            lm.sender_id AS "lastMessageSenderId",

            CASE
                WHEN lm.deleted_at IS NOT NULL THEN NULL
                ELSE lm.content
            END AS "lastMessageContent",

            lm.created_at AS "lastMessageCreatedAt",

            CASE
                WHEN lm.id IS NULL THEN NULL
                ELSE lm.deleted_at IS NOT NULL
            END AS "lastMessageIsDeleted",

            COALESCE(
                NULLIF(sender.display_name, ''),
                sender.username
            ) AS "lastMessageSenderName",

            COALESCE(lm.created_at, g.created_at) AS "lastActivityAt",

            (
                SELECT COUNT(*)::int
                FROM messages unread
                WHERE unread.conversation_id = g.conversation_id
                    AND unread.sender_id <> me.user_id
                    AND unread.created_at >= me.joined_at
                    AND (
                        read_marker.id IS NULL
                        OR (unread.created_at, unread.id) >
                           (read_marker.created_at, read_marker.id)
                    )
            ) AS "unreadCount"

        FROM groups g

        INNER JOIN conversation_participants me
            ON me.conversation_id = g.conversation_id
            AND me.user_id = $1

        LEFT JOIN LATERAL (
            SELECT
                m.id,
                m.sender_id,
                m.content,
                m.created_at,
                m.deleted_at
            FROM messages m
            WHERE m.conversation_id = g.conversation_id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) lm ON TRUE

        LEFT JOIN users sender
            ON sender.id = lm.sender_id

        LEFT JOIN messages read_marker
            ON read_marker.id = me.last_read_message_id
            AND read_marker.conversation_id = g.conversation_id

        ORDER BY
            COALESCE(lm.created_at, g.created_at) DESC,
            g.conversation_id DESC

        LIMIT $2
        `,
        [userId, safeLimit],
    );

    return result.rows;
};

export const joinDiscoverableGroup = async (
    conversationId: string,
    userId: string,
    executor: QueryExecutor = pool,
): Promise<JoinGroupResult> => {
    // One statement: the group must exist and be a 'gc', and if the user
    // is already in it, ON CONFLICT silently skips the insert.
    const inserted = await executor.query<ConversationParticipant>(
        `
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        SELECT g.conversation_id, $2::uuid, 'member'
        FROM groups g
        INNER JOIN conversations c
            ON c.id = g.conversation_id
            AND c.type = 'gc'
        WHERE g.conversation_id = $1
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        RETURNING
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role,
            last_read_message_id AS "lastReadMessageId"
        `,
        [conversationId, userId],
    );

    const participant = inserted.rows[0];
    if (participant) return { status: "joined", participant };

    // No row came back: either the group doesn't exist, or the user was
    // already in it. This second query tells the two cases apart.
    const group = await executor.query(
        `SELECT 1 FROM groups WHERE conversation_id = $1`,
        [conversationId],
    );

    return group.rows.length > 0
        ? { status: "already_member" }
        : { status: "not_found" };
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

export const getDiscoverableGroupsForUser = async (
    userId: string,
    limit: number,
    offset: number,
    executor: QueryExecutor = pool,
): Promise<DiscoverableGroupRow[]> => {
    const safeLimit = Math.min(
        Math.max(Math.trunc(limit) || 20, 1),
        51,
    );

    const safeOffset = Number.isSafeInteger(offset) && offset >= 0
        ? offset
        : 0;

    const result = await executor.query<DiscoverableGroupRow>(
        `
        SELECT
            g.conversation_id AS "conversationId",
            g.name,
            g.description,
            g.group_profile AS "groupProfile",
            g.created_at AS "createdAt",

            (
                SELECT COUNT(*)::int
                FROM conversation_participants cp
                WHERE cp.conversation_id = g.conversation_id
            ) AS "memberCount"

        FROM groups g

        INNER JOIN conversations c
            ON c.id = g.conversation_id
            AND c.type = 'gc'

        WHERE NOT EXISTS (
            SELECT 1
            FROM conversation_participants me
            WHERE me.conversation_id = g.conversation_id
                AND me.user_id = $1
        )

        ORDER BY
            g.created_at DESC,
            g.conversation_id DESC

        LIMIT $2 OFFSET $3
        `,
        [userId, safeLimit, safeOffset],
    );

    return result.rows;
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