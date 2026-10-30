import type { Request, Response } from "express";
import asyncHandler from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";
import { getInbox as getInboxService } from "../../services/messaging/conversation.service";
import { markConversationRead as markConversationReadService } from "../../services/messaging/conversation.service";

const DEFAULT_LIMIT = 30;

/**
 * GET /conversations?limit=30
 */
export const getInbox = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const rawLimit = req.query.limit;
    const limit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;

    if (Number.isNaN(limit)) {
        throw new ApiError(400, "limit must be a number");
    }

    const inbox = await getInboxService(userId, limit);

    return res
        .status(200)
        .json(new ApiResponse(200, "Inbox fetched successfully", inbox));
});

/**
 * POST /conversations/:conversationId/read
 * body: { messageId: string }  (the newest message the user has seen)
 */
export const markConversationRead = asyncHandler(
    async (req: Request, res: Response) => {
        const { conversationId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            throw new ApiError(401, "Unauthorized");
        }
        if (!conversationId || Array.isArray(conversationId)) {
            throw new ApiError(400, "Invalid conversation ID");
        }

        const { messageId } = req.body;

        if (typeof messageId !== "string" || !messageId) {
            throw new ApiError(400, "messageId is required");
        }

        await markConversationReadService(conversationId, userId, messageId);

        return res
            .status(200)
            .json(new ApiResponse(200, "Conversation marked as read", null));
    },
);