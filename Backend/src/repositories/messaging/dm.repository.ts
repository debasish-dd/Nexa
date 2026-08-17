import { getPool } from "../../db/pool";

export interface DMPair {
    id: string;
    user1Id: string;
    user2Id: string;
    conversationId: string;
}

export const findDMPair = async (
    userAId: string,
    userBId: string,
): Promise<DMPair | null> => {

    const [user1Id, user2Id] =
        userAId < userBId
            ? [userAId, userBId]
            : [userBId, userAId];
    const pool = getPool();
    const result = await pool.query<DMPair>(
        `
        SELECT
            id,
            user1_id AS "user1Id",
            user2_id AS "user2Id",
            conversation_id AS "conversationId"
        FROM dm_pairs
        WHERE user1_id = $1
          AND user2_id = $2
        LIMIT 1
        `,
        [user1Id, user2Id],
    );

    return result.rows[0] ?? null;

}

export const createDMPair = async (
    userAId: string,
    userBId: string,
    conversationId: string,
): Promise<DMPair> => {
    if (userAId === userBId) {
        throw new Error("Users cannot create a DM with themselves");
    }

    const [user1Id, user2Id] =
        userAId < userBId
            ? [userAId, userBId]
            : [userBId, userAId];
    const pool = getPool();
    const result = await pool.query<DMPair>(
        `
        INSERT INTO dm_pairs (
            user1_id,
            user2_id,
            conversation_id
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            user1_id AS "user1Id",
            user2_id AS "user2Id",
            conversation_id AS "conversationId"
        `,
        [user1Id, user2Id, conversationId],
    );

    const dmPair = result.rows[0];

    if (!dmPair) {
        throw new Error("Failed to create DM pair");
    }

    return dmPair;
};
export const findDMPairByConversationId = async (
    conversationId: string,
): Promise<DMPair | null> => {
    const pool = getPool();
    const result = await pool.query<DMPair>(
        `
        SELECT
            id,
            user1_id AS "user1Id",
            user2_id AS "user2Id",
            conversation_id AS "conversationId"
        FROM dm_pairs
        WHERE conversation_id = $1
        LIMIT 1
        `,
        [conversationId],
    );

    return result.rows[0] ?? null;
};

export const deleteDMPair = async (
    dmPairId: string,
): Promise<boolean> => {
    const pool = getPool();
    const result = await pool.query(
        `
        DELETE FROM dm_pairs
        WHERE id = $1
        `,
        [dmPairId],
    );

    return result.rowCount === 1;
};