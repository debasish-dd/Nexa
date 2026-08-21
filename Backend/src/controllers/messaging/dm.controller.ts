import type { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler";
import * as dmService from "../../services/messaging/dm.service";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";

export const createDM = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user.id;
        const { userId: otherUserId } = req.body;

        if (!otherUserId) {
            throw new ApiError(
                400,
                "Other user ID is required",
            );
        }

        const dm = await dmService.createDM(
            userId,
            otherUserId,
        );

        res.status(201).json(new ApiResponse(
            201,
            "DM conversation created successfully",
            dm
        ));
    },
);

export const getDM = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user.id;
        const { userId: otherUserId } = req.params;

        if (!otherUserId) {
            throw new ApiError(
                400,
                "Other user ID is required",
            );
        }

        const dm = await dmService.getDM(
            userId,
            otherUserId,
        );

        if (!dm) {
            throw new ApiError(
                404,
                "DM conversation not found",
            );
        }

        res.status(200).json(new ApiResponse(
            200,
            "DM conversation retrieved successfully",
            dm,
        ));
    },
);

export const deleteDM = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user.id;
        const { conversationId } = req.params;

        if (!conversationId) {
            throw new ApiError(
                400,
                "Conversation ID is required",
            );
        }

        await dmService.deleteDM(
            conversationId,
            userId,
        );

        res.status(200).json(new ApiResponse(
            200,
            "DM conversation deleted successfully",
            null
        ));
    },
);