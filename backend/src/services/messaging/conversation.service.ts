import {
    findConversationById,
    getConversationType,
    getInboxForUser,
} from "../../repositories/messaging/conversation.repository";
import { ApiError } from "../../utils/api-error";



const DEFAULT_INBOX_LIMIT = 30;
const MAX_INBOX_LIMIT = 100;

export const getConversation = async (conversationId: string) => {
    return findConversationById(conversationId);
};

export const getConversationTypeById = async (conversationId: string) => {
    return getConversationType(conversationId);
};

export const getInbox = async (
    userId: string,
    limit: number = DEFAULT_INBOX_LIMIT,
) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_INBOX_LIMIT) {
        throw new ApiError(
            400,
            `Limit must be a whole number between 1 and ${MAX_INBOX_LIMIT}`,
        );
    }

    const rows = await getInboxForUser(userId, limit);

    return rows.map((row) => ({
        conversationId: row.conversationId,
        otherUser: {
            id: row.otherUserId,
            username: row.otherUsername,
            avatarUrl: row.otherUserAvatar,
        },
        lastMessage: {
            id: row.lastMessageId,
            senderId: row.lastMessageSenderId,
            content: row.lastMessageContent,
            createdAt: row.lastMessageCreatedAt,
            isDeleted: row.lastMessageDeletedAt !== null,
        },
    }));
};