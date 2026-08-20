import { getPool } from "../../db/pool";
import {
    createConversation,
    deleteConversation,
    findConversationById,
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


//   Find an existing DM between two users.

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

    const existingDm = await findDMPair(
        userAId,
        userBId,
    );

    if (!existingDm) {
        return null;
    }

    const convo = await findConversationById(
        existingDm.conversationId,
    );

    if (!convo) {
        throw new ApiError(
            404,
            "DM conversation not found",
        );
    }

    const participants = await getParticipants(
        existingDm.conversationId,
    );

    return {
        conversationId: existingDm.conversationId,
        dmPairId: existingDm.id,
        user1Id: existingDm.user1Id,
        user2Id: existingDm.user2Id,
        participants: participants.map((participant) => ({
            userId: participant.userId,
            role: participant.role,
            joinedAt: participant.joinedAt,
        })),
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

    // Fast path: DM already exists.
    const existingDM = await findDMPair(
        userAId,
        userBId,
    );

    if (existingDM) {
        return {
            conversationId: existingDM.conversationId,
            dmPairId: existingDM.id,
            user1Id: existingDM.user1Id,
            user2Id: existingDM.user2Id,
        };
    }

    const [user1Id, user2Id] =
        userAId < userBId
            ? [userAId, userBId]
            : [userBId, userAId];

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

        return {
            conversationId: conversation.id,
            dmPairId: dmPair.id,
            user1Id: dmPair.user1Id,
            user2Id: dmPair.user2Id,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const deleteDM = async (
    conversationId: string,
    userId: string,
): Promise<void> => {
    const dmPair = await findDMPairByConversationId(
        conversationId,
    );

    if (!dmPair) {
        throw new ApiError(404, "DM conversation not found");
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
    );

    if (!deleted) {
        throw new ApiError(
            404,
            "DM conversation not found",
        );
    }
};