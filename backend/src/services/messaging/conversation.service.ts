import {
    findConversationById,
    getConversationType,
    getInboxForUser,
} from "../../repositories/messaging/conversation.repository";
import { ApiError } from "../../utils/api-error";
import {
    advanceLastReadMessage,
    isParticipant,
} from "../../repositories/messaging/participant.repository";


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
        unreadCount: row.unreadCount,
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

export const markConversationRead = async (
    conversationId: string,
    userId: string,
    messageId: string,
) => {
    const participant = await isParticipant(conversationId, userId);

    if (!participant) {
        throw new ApiError(
            403,
            "User is not a participant in this conversation",
        );
    }

    try {
        await advanceLastReadMessage(conversationId, userId, messageId);
    } catch (error) {
        // 22P02 = malformed id
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "22P02"
        ) {
            throw new ApiError(400, "Invalid message id");
        }
        throw error;
    }
};

