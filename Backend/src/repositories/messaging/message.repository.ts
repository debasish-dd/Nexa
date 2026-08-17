import { getPool } from "../../db/pool";

const pool= getPool();

export type ParticipantRole = "member" | "mod" | "admin";

export interface ConversationParticipant {
    id: string;
    conversationId: string;
    userId: string;
    joinedAt: Date;
    role: ParticipantRole;
    lastReadMessageId: string | null;
}

export const addParticipant = async (
    conversationId: string,
    userId: string,
    role: ParticipantRole = "member",
): Promise<ConversationParticipant> => {

    const result = await pool.query(`
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role,
            last_read_message_id AS "lastReadMessageId"
    `, [conversationId, userId, role]);

    const participant = result.rows[0];

    if (!participant) {
        throw new Error("Failed to add participant");
    }

    return participant;
}

export const isParticipant = async (
    conversationId: string,
    userId: string,
): Promise<boolean> => {
    const result = await pool.query(
        `
        SELECT 1
        FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
        LIMIT 1
        `,
        [conversationId, userId],
    );

    return result.rowCount === 1;
};

export const findParticipant = async (
    conversationId: string,
    userId: string,
): Promise<ConversationParticipant | null> => {
    const result = await pool.query<ConversationParticipant>(
        `
        SELECT
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role,
            last_read_message_id AS "lastReadMessageId"
        FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
        LIMIT 1
        `,
        [conversationId, userId],
    );

    return result.rows[0] ?? null;
};

export const getParticipants = async (
    conversationId: string,
): Promise<ConversationParticipant[]> => {
    const result = await pool.query<ConversationParticipant>(
        `
        SELECT
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role,
            last_read_message_id AS "lastReadMessageId"
        FROM conversation_participants
        WHERE conversation_id = $1
        ORDER BY joined_at ASC
        `,
        [conversationId],
    );

    return result.rows;
};

export const updateParticipantRole = async (
    conversationId: string,
    userId: string,
    role: ParticipantRole,
): Promise<ConversationParticipant | null> => {
    const result = await pool.query<ConversationParticipant>(
        `
        UPDATE conversation_participants
        SET role = $3
        WHERE conversation_id = $1
          AND user_id = $2
        RETURNING
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role,
            last_read_message_id AS "lastReadMessageId"
        `,
        [conversationId, userId, role],
    );

    return result.rows[0] ?? null;
};

export const updateLastReadMessage = async (
    conversationId: string,
    userId: string,
    messageId: string | null,
): Promise<ConversationParticipant | null> => {
    const result = await pool.query<ConversationParticipant>(
        `
        UPDATE conversation_participants
        SET last_read_message_id = $3
        WHERE conversation_id = $1
          AND user_id = $2
        RETURNING
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role,
            last_read_message_id AS "lastReadMessageId"
        `,
        [conversationId, userId, messageId],
    );

    return result.rows[0] ?? null;
};

export const removeParticipant = async (
    conversationId: string,
    userId: string,
): Promise<boolean> => {
    const result = await pool.query(
        `
        DELETE FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
        `,
        [conversationId, userId],
    );

    return result.rowCount === 1;
};