import { getPool } from "../../db/pool";

export interface DMConversation {
    conversationId: string;
    dmPairId: string;
}

export interface DMParticipant {
    id: string;
    conversationId: string;
    userId: string;
    joinedAt: Date;
    role: string;
}

export interface DMConversationDetails {
    conversationId: string;
    dmPairId: string;
    user1Id: string;
    user2Id: string;
    createdAt: Date;
}

export const findDM = async (
    userAId: string,
    userBId: string,
): Promise<DMConversationDetails | null> => {

    const [user1Id, user2Id] = userAId < userBId
        ? [userAId, userBId]
        : [userBId, userAId];


    const pool = getPool()
    const result = await pool.query<DMConversationDetails>(`
            SECLECT 
            dp.id AS "dmPairId",
            dp.conversation_id AS "conversationId",
            dp.user1_id AS "user1Id",
            dp.user2_id AS "user2Id",
            c.created_at AS "createdAt"
        FROM dm_pairs dp
        INNER JOIN conversations c
            ON c.id = dp.conversation_id
        WHERE dp.user1_id = $1
          AND dp.user2_id = $2
        LIMIT 1
        ` , [user1Id, user2Id])

    return result.rows[0] ?? null;
}

export const createDM = async (
    userAId: string,
    userBId: string,
): Promise<DMConversation> => {
    if (userAId === userBId) {
        throw new Error("Users cannot create a DM with themselves");
    }

    const [user1Id, user2Id] =
        userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    // fast path — most calls hit this, no transaction needed
    const existing = await findDM(userAId, userBId);
    if (existing) {
        return { conversationId: existing.conversationId, dmPairId: existing.dmPairId };
    }
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const conversationResult = await client.query<{ id: string }>(
            `INSERT INTO conversations (type) VALUES ('dm') RETURNING id`,
        );
        const [conversationRow] = conversationResult.rows;
        if (!conversationRow) throw new Error("Failed to create conversation");
        const conversationId = conversationRow.id;

        const dmPairResult = await client.query<{ id: string }>(
            `
            INSERT INTO dm_pairs (user1_id, user2_id, conversation_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user1_id, user2_id) DO NOTHING
            RETURNING id
            `,
            [user1Id, user2Id, conversationId],
        );

        if (dmPairResult.rows.length === 0) {
            // lost the race — someone else's insert won between our check
            // and this insert. Throw away our half-built conversation.
            await client.query("ROLLBACK");
            const winner = await findDM(userAId, userBId);
            if (!winner) throw new Error("DM conflict but no row found — retry");
            return { conversationId: winner.conversationId, dmPairId: winner.dmPairId };
        }

        const [dmPairRow] = dmPairResult.rows;

        if (!dmPairRow) {
            // lost the race — someone else's insert won between our check and this insert
            await client.query("ROLLBACK");
            const winner = await findDM(userAId, userBId);
            if (!winner) throw new Error("DM conflict but no row found — retry");
            return { conversationId: winner.conversationId, dmPairId: winner.dmPairId };
        }

        const dmPairId = dmPairRow.id;

        await client.query(
            `
            INSERT INTO conversation_participants (conversation_id, user_id, role)
            VALUES ($1, $2, 'member'), ($1, $3, 'member')
            `,
            [conversationId, user1Id, user2Id],
        );

        await client.query("COMMIT");
        return { conversationId, dmPairId };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};


export const getDMParticipants = async (
    conversationId: string,
): Promise<DMParticipant[]> => {
    const pool = getPool();

    const result =  await pool.query<DMParticipant>(`
            SELECT
            id,
            conversation_id AS "conversationId",
            user_id AS "userId",
            joined_at AS "joinedAt",
            role
        FROM conversation_participants
        WHERE conversation_id = $1
        ORDER BY joined_at ASC
        ` , [conversationId])
       return result.rows; 

}

export const isDMParticipant = async (
    conversationId: string,
    userId: string,
): Promise<boolean> => {
    const pool = getPool();
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