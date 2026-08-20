import type { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler";
import * as dmService from "../../services/messaging/dm.service";
import { ApiError } from "../../utils/api-error";

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

        res.status(201).json({
            success: true,
            message: "DM conversation created successfully",
            errors: [],
            data: dm,
        });
    },
);

export const getDM = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user.id;
        const { userId: otherUserId } = req.params;

        if (!otherUserId) {
            throw new ApiError(
                400,
                "User ID is required",
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

        res.status(200).json({
            success: true,
            message: "DM conversation fetched successfully",
            errors: [],
            data: dm,
        });
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

        res.status(200).json({
            success: true,
            message: "DM conversation deleted successfully",
            errors: [],
            data: null,
        });
    },
);