import { getPool } from "../../db/pool";

export type ConversationType = "dm" | "gc";

export interface Conversation {
    id: string;
    createdAt: Date;
    type: ConversationType;
}


export const createConversation = async (
    type: ConversationType,
): Promise<Conversation> => {
    const pool = getPool();
    const result = await pool.query(`
        INSERT INTO conversations (type)
        RETURNING
            id,
            created_at AS "createdAt",
            type

        `, [type]);
    const conversation = result.rows[0];

    if (!conversation) {
        throw new Error("Failed to create conversation");
    }

    return conversation;
};


export const findConversationById = async (
    conversationId: string,
): Promise<Conversation | null> => {
    const pool = getPool();
    const result = await pool.query<Conversation>(
        `
        SELECT id, type, created_at, updated_at
        FROM conversations
        WHERE id = $1
        `,
        [conversationId],
    );

    return result.rows[0] ?? null;
};


export const getConversationType = async (
    conversationId: string,
): Promise<ConversationType | null> => {
    const pool = getPool();
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
): Promise<boolean> => {
    const pool = getPool();
    const result = await pool.query(
        `
        DELETE FROM conversations
        WHERE id = $1
        `,
        [conversationId],
    );

    return result.rowCount === 1;
};