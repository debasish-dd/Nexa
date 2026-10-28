import type { Request, Response } from "express";
import asyncHandler from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";
import { getInbox as getInboxService } from "../../services/messaging/conversation.service";

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