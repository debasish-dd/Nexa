import { addParticipant as addParticipantRepository } from "../../repositories/messaging/participant.repository";
import {
    findParticipant,
    getParticipants,
    isParticipant,
    removeParticipant as removeParticipantRepository,
    updateParticipantRole,
} from "../../repositories/messaging/participant.repository";

export type ParticipantRole = "member" | "mod" | "admin";

export const addParticipant = async (
    conversationId: string,
    userId: string,
    role: ParticipantRole = "member",
) => {
    const existingParticipant = await findParticipant(
        conversationId,
        userId,
    );

    if (existingParticipant) {
        throw new Error("User is already a participant");
    }

    return addParticipantRepository(
        conversationId,
        userId,
        role,
    );
};

export const getConversationParticipants = async (
    conversationId: string,
) => {
    return getParticipants(conversationId);
};

export const checkParticipant = async (
    conversationId: string,
    userId: string,
): Promise<boolean> => {
    return isParticipant(conversationId, userId);
};

export const changeParticipantRole = async (
    conversationId: string,
    userId: string,
    role: ParticipantRole,
) => {
    const participant = await findParticipant(
        conversationId,
        userId,
    );

    if (!participant) {
        return null;
    }

    return updateParticipantRole(
        conversationId,
        userId,
        role,
    );
};

export const removeParticipant = async (
    conversationId: string,
    userId: string,
) => {
    const participant = await findParticipant(
        conversationId,
        userId,
    );

    if (!participant) {
        return false;
    }

    return removeParticipantRepository(
        conversationId,
        userId,
    );
};