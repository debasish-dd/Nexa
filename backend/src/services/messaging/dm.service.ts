import type { PoolClient } from "pg";

import { getPool } from "../../db/pool";
import {
    createConversation,
    deleteConversation,
} from "../../repositories/messaging/conversation.repository";
import {
    createDMPair,
    findDMPair,
    findDMPairByConversationId,
} from "../../repositories/messaging/dm.repository";
import {
    addParticipant,
    getParticipants,
} from "../../repositories/messaging/participant.repository";
import { ApiError } from "../../utils/api-error";

const pool = getPool();

export interface DMConversationResult {
    conversationId: string;
    dmPairId: string;
    user1Id: string;
    user2Id: string;
}

export interface DMDetails {
    conversationId: string;
    dmPairId: string;
    user1Id: string;
    user2Id: string;
    participants: {
        userId: string;
        role: string;
        joinedAt: Date;
    }[];
}

interface PostgresError extends Error {
    code?: string;
    constraint?: string;
}

const isPostgresError = (
    error: unknown,
): error is PostgresError => {
    return (
        error instanceof Error &&
        "code" in error
    );
};

const normalizeUserPair = (
    userAId: string,
    userBId: string,
): [string, string] => {
    return userAId < userBId
        ? [userAId, userBId]
        : [userBId, userAId];
};

const toDMConversationResult = (dmPair: {
    id: string;
    conversationId: string;
    user1Id: string;
    user2Id: string;
}): DMConversationResult => {
    return {
        conversationId: dmPair.conversationId,
        dmPairId: dmPair.id,
        user1Id: dmPair.user1Id,
        user2Id: dmPair.user2Id,
    };
};

// Find an existing DM between two users.
export const getDM = async (
    userAId: string,
    userBId: string,
): Promise<DMDetails | null> => {
    if (userAId === userBId) {
        throw new ApiError(
            400,
            "Users cannot create a DM with themselves",
        );
    }

    const [user1Id, user2Id] = normalizeUserPair(
        userAId,
        userBId,
    );

    const dmPair = await findDMPair(
        user1Id,
        user2Id,
    );

    if (!dmPair) {
        return null;
    }

    const participants = await getParticipants(
        dmPair.conversationId,
    );

    return {
        conversationId: dmPair.conversationId,
        dmPairId: dmPair.id,
        user1Id: dmPair.user1Id,
        user2Id: dmPair.user2Id,
        participants: participants.map(
            (participant) => ({
                userId: participant.userId,
                role: participant.role,
                joinedAt: participant.joinedAt,
            }),
        ),
    };
};

export const createDM = async (
    userAId: string,
    userBId: string,
): Promise<DMConversationResult> => {
    if (userAId === userBId) {
        throw new ApiError(
            400,
            "Users cannot create a DM with themselves",
        );
    }

    const [user1Id, user2Id] = normalizeUserPair(
        userAId,
        userBId,
    );

    // Fast path.
    const existingDM = await findDMPair(
        user1Id,
        user2Id,
    );

    if (existingDM) {
        return toDMConversationResult(existingDM);
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const conversation = await createConversation(
            "dm",
            client,
        );

        const dmPair = await createDMPair(
            user1Id,
            user2Id,
            conversation.id,
            client,
        );

        await addParticipant(
            conversation.id,
            user1Id,
            "member",
            client,
        );

        await addParticipant(
            conversation.id,
            user2Id,
            "member",
            client,
        );

        await client.query("COMMIT");

        return toDMConversationResult(dmPair);
    } catch (error) {
        await client.query("ROLLBACK");

        /*
         * Two requests can both pass the fast-path lookup.
         *
         * The DB constraint:
         * UNIQUE (user1_id, user2_id)
         *
         * guarantees that only one request can create the pair.
         *
         * If this request loses that race, fetch and return
         * the DM created by the winning transaction.
         */
        if (
            isPostgresError(error) &&
            error.code === "23505" &&
            error.constraint === "dm_pairs_unique_users"
        ) {
            const existingDM = await findDMPair(
                user1Id,
                user2Id,
            );

            if (existingDM) {
                return toDMConversationResult(
                    existingDM,
                );
            }
        }

        throw error;
    } finally {
        client.release();
    }
};

export const deleteDM = async (
    conversationId: string,
    userId: string,
): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        /*
         * Lock the DM pair while we verify authorization
         * and perform the deletion.
         */
        const dmPair =
            await findDMPairByConversationId(
                conversationId,
                client,
                true,
            );

        if (!dmPair) {
            throw new ApiError(
                404,
                "DM conversation not found",
            );
        }

        const isParticipant =
            dmPair.user1Id === userId ||
            dmPair.user2Id === userId;

        if (!isParticipant) {
            throw new ApiError(
                403,
                "You are not a participant in this conversation",
            );
        }

        const deleted = await deleteConversation(
            conversationId,
            client,
        );

        if (!deleted) {
            throw new ApiError(
                404,
                "DM conversation not found",
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};