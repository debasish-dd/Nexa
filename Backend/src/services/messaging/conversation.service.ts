import {
    findConversationById,
    getConversationType,
} from "../../repositories/messaging/conversation.repository";

export const getConversation = async (conversationId: string) => {
    return findConversationById(conversationId);
};

export const getConversationTypeById = async (conversationId: string) => {
    return getConversationType(conversationId);
};