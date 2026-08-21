import { Request, Response } from "express";
import asyncHandler from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";
import {
    sendMessage as sendMessageService,
    getMessages as getMessagesService,
    editMessage as editMessageService,
    deleteMessage as deleteMessageService,
} from "../../services/messaging/message.service";

const DEFAULT_LIMIT = 50;

/**
 * POST /conversations/:conversationId/messages
 * body: { content: string }
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { content } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
        throw new ApiError(401, "Unauthorized");
    }
    if (typeof content !== "string" || !content.trim()) {
        throw new ApiError(400, "Message content is required");
    }

    const message = await sendMessageService(conversationId, senderId, content);

    return res
        .status(201)
        .json(new ApiResponse(201,  "Message sent successfully", message));
});

/**
 * GET /conversations/:conversationId/messages?limit=50
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const rawLimit = req.query.limit;
    const parsedLimit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;

    if (Number.isNaN(parsedLimit)) {
        throw new ApiError(400, "limit must be a number");
    }

    const messages = await getMessagesService(conversationId, userId, parsedLimit);

    return res
        .status(200)
        .json(new ApiResponse(200,  "Messages fetched successfully", messages));
});

/**
 * PATCH /messages/:messageId
 * body: { content: string }
 */
export const editMessage = asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }
    if (typeof content !== "string" || !content.trim()) {
        throw new ApiError(400, "Message content is required");
    }

    const updatedMessage = await editMessageService(messageId, userId, content);

    return res
        .status(200)
        .json(new ApiResponse(200,  "Message edited successfully", updatedMessage));
});

/**
 * DELETE /messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const deletedMessage = await deleteMessageService(messageId, userId);

    return res
        .status(200)
        .json(new ApiResponse(200,  "Message deleted successfully" , deletedMessage));
});