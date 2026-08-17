import { getPool } from "../../db/pool";

const pool= getPool();



export interface Message {
    id: string;
    createdAt: Date;
    editedAt: Date | null;
    conversationId: string;
    deletedAt: Date | null;
    content: string;
    senderId: string;
}

export const createMessage = async (
    conversationId: string,
    senderId: string,
    content: string,
): Promise<Message> => {
    const result = await pool.query<Message>(
        `
        INSERT INTO messages (
            conversation_id,
            sender_id,
            content
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            created_at AS "createdAt",
            edited_at AS "editedAt",
            conversation_id AS "conversationId",
            deleted_at AS "deletedAt",
            content,
            sender_id AS "senderId"
        `,
        [conversationId, senderId, content],
    );

    const message = result.rows[0];

    if (!message) {
        throw new Error("Failed to create message");
    }

    return message;
};

export const findMessageById = async (
    messageId: string,
): Promise<Message | null> => {
    const result = await pool.query<Message>(
        `
        SELECT
            id,
            created_at AS "createdAt",
            edited_at AS "editedAt",
            conversation_id AS "conversationId",
            deleted_at AS "deletedAt",
            content,
            sender_id AS "senderId"
        FROM messages
        WHERE id = $1
        LIMIT 1
        `,
        [messageId],
    );

    return result.rows[0] ?? null;
};

export const getMessages = async (
    conversationId: string,
    limit: number = 50,
): Promise<Message[]> => {
    const result = await pool.query<Message>(
        `
        SELECT
            id,
            created_at AS "createdAt",
            edited_at AS "editedAt",
            conversation_id AS "conversationId",
            deleted_at AS "deletedAt",
            content,
            sender_id AS "senderId"
        FROM messages
        WHERE conversation_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [conversationId, limit],
    );

    return result.rows;
};

export const editMessage = async (
    messageId: string,
    content: string,
): Promise<Message | null> => {
    const result = await pool.query<Message>(
        `
        UPDATE messages
        SET
            content = $2,
            edited_at = current_timestamp
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING
            id,
            created_at AS "createdAt",
            edited_at AS "editedAt",
            conversation_id AS "conversationId",
            deleted_at AS "deletedAt",
            content,
            sender_id AS "senderId"
        `,
        [messageId, content],
    );

    return result.rows[0] ?? null;
};

export const softDeleteMessage = async (
    messageId: string,
): Promise<Message | null> => {
    const result = await pool.query<Message>(
        `
        UPDATE messages
        SET deleted_at = current_timestamp
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING
            id,
            created_at AS "createdAt",
            edited_at AS "editedAt",
            conversation_id AS "conversationId",
            deleted_at AS "deletedAt",
            content,
            sender_id AS "senderId"
        `,
        [messageId],
    );

    return result.rows[0] ?? null;
};