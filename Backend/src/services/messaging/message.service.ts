
import {
    createMessage as createMessageRepository,
    findMessageById,
    getMessages as getMessagesRepository,
    editMessage as editMessageRepository,
    softDeleteMessage,
} from "../../repositories/messaging/message.repository";

import { isParticipant } from "../../repositories/messaging/participant.repository";
import { ApiError } from "../../utils/api-error";

export const sendMessage = async (
    conversationId: string,
    senderId: string,
    content: string,
) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
        throw new ApiError(400, "Message content cannot be empty");
    }

    const participant = await isParticipant(
        conversationId,
        senderId,
    );

    if (!participant) {
        throw new ApiError(
            403,
            "User is not a participant in this conversation",
        );
    }

    return createMessageRepository(
        conversationId,
        senderId,
        trimmedContent,
    );
};

export const getMessages = async (
    conversationId: string,
    userId: string,
    limit: number = 50,
) => {
    if (limit < 1 || limit > 100) {
        throw new ApiError(
            400,
            "Message limit must be between 1 and 100",
        );
    }

    const participant = await isParticipant(
        conversationId,
        userId,
    );

    if (!participant) {
        throw new ApiError(
            403,
            "User is not a participant in this conversation",
        );
    }

    return getMessagesRepository(
        conversationId,
        limit,
    );
};

export const editMessage = async (
    messageId: string,
    userId: string,
    content: string,
) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
        throw new ApiError(400, "Message content cannot be empty");
    }

    const message = await findMessageById(messageId);

    if (!message) {
        throw new ApiError(404, "Message not found");
    }

    if (message.deletedAt) {
        throw new ApiError(
            409,
            "Cannot edit a deleted message",
        );
    }

    if (message.senderId !== userId) {
        throw new ApiError(
            403,
            "You can only edit your own messages",
        );
    }

    const updatedMessage = await editMessageRepository(
        messageId,
        trimmedContent,
    );

    if (!updatedMessage) {
        throw new ApiError(
            500,
            "Failed to edit message",
        );
    }

    return updatedMessage;
};

export const deleteMessage = async (
    messageId: string,
    userId: string,
) => {
    const message = await findMessageById(messageId);

    if (!message) {
        throw new ApiError(404, "Message not found");
    }

    if (message.deletedAt) {
        throw new ApiError(
            409,
            "Message is already deleted",
        );
    }

    if (message.senderId !== userId) {
        throw new ApiError(
            403,
            "You can only delete your own messages",
        );
    }

    const deletedMessage = await softDeleteMessage(
        messageId,
    );

    if (!deletedMessage) {
        throw new ApiError(
            500,
            "Failed to delete message",
        );
    }

    return deletedMessage;
};

