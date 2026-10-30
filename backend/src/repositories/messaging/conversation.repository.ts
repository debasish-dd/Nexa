import type { Pool, PoolClient } from "pg";

import { getPool } from "../../db/pool";

const pool = getPool();

type QueryExecutor = Pool | PoolClient;
export type ConversationType = "dm" | "gc";

export interface Conversation {
    id: string;
    createdAt: Date;
    type: ConversationType;
}

export interface InboxRow {
    conversationId: string;
    otherUserId: string;
    otherUsername: string;
    otherUserAvatar: string | null;
    lastMessageId: string;
    lastMessageSenderId: string;
    lastMessageContent: string | null; // null when the message was deleted
    lastMessageCreatedAt: Date;
    lastMessageDeletedAt: Date | null;
    unreadCount: number;
}



export const createConversation = async (
    type: ConversationType,
    client?: PoolClient,
): Promise<Conversation> => {
    const db = client ?? pool;

    const result = await db.query<Conversation>(
        `
        INSERT INTO conversations (type)
        VALUES ($1)
        RETURNING
            id,
            created_at AS "createdAt",
            type
        `,
        [type],
    );

    const conversation = result.rows[0];

    if (!conversation) {
        throw new Error("Failed to create conversation");
    }

    return conversation;
};

export const findConversationById = async (
    conversationId: string,
): Promise<Conversation | null> => {
    const result = await pool.query<Conversation>(
        `
        SELECT
            id,
            created_at AS "createdAt",
            type
        FROM conversations
        WHERE id = $1
        LIMIT 1
        `,
        [conversationId],
    );

    return result.rows[0] ?? null;
};

export const getConversationType = async (
    conversationId: string,
): Promise<ConversationType | null> => {
    const result = await pool.query<{ type: ConversationType }>(
        `
        SELECT type
        FROM conversations
        WHERE id = $1
        LIMIT 1
        `,
        [conversationId],
    );

    return result.rows[0]?.type ?? null;
};

export const deleteConversation = async (
    conversationId: string,
    executor: QueryExecutor = pool,
): Promise<boolean> => {
    const result = await executor.query(
        `
        DELETE FROM conversations
        WHERE id = $1
        RETURNING id
        `,
        [conversationId],
    );

    return result.rowCount === 1;
};

export const getInboxForUser = async (
    userId: string,
    limit: number,
): Promise<InboxRow[]> => {
    // COUNT(*)::int matters: COUNT returns bigint, which pg hands back as a string.
    // LIMIT 100 inside the count caps the work; the UI shows 99+.
    const result = await pool.query<InboxRow>(
        `
        SELECT
            c.id AS "conversationId",
            other.id AS "otherUserId",
            other.username AS "otherUsername",
            other.avatar_url AS "otherUserAvatar",
            lm.id AS "lastMessageId",
            lm.sender_id AS "lastMessageSenderId",
            CASE WHEN lm.deleted_at IS NULL THEN lm.content END
                AS "lastMessageContent",
            lm.created_at AS "lastMessageCreatedAt",
            lm.deleted_at AS "lastMessageDeletedAt",
            (
                SELECT COUNT(*)::int
                FROM (
                    SELECT 1
                    FROM messages um
                    WHERE um.conversation_id = c.id
                      AND um.sender_id <> me.user_id
                      AND um.deleted_at IS NULL
                      AND (
                          rm.id IS NULL
                          OR (um.created_at, um.id) > (rm.created_at, rm.id)
                      )
                    LIMIT 100
                ) unread
            ) AS "unreadCount"
        FROM conversation_participants me
        JOIN conversations c
            ON c.id = me.conversation_id
           AND c.type = 'dm'
        JOIN dm_pairs dp
            ON dp.conversation_id = c.id
        JOIN users other
            ON other.id = CASE
                WHEN dp.user1_id = me.user_id THEN dp.user2_id
                ELSE dp.user1_id
            END
        LEFT JOIN messages rm
            ON rm.id = me.last_read_message_id
        JOIN LATERAL (
            SELECT m.id, m.sender_id, m.content, m.created_at, m.deleted_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) lm ON TRUE
        WHERE me.user_id = $1
        ORDER BY lm.created_at DESC
        LIMIT $2
        `,
        [userId, limit],
    );

    return result.rows;
};