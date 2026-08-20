import type { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler";
import * as groupService from "../../services/messaging/group.service";
import { ApiError } from "../../utils/api-error";

export const createGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const adminId = req.user.id;

        const {
            name,
            description,
            groupProfile,
        } = req.body;

        if (!name) {
            throw new ApiError(
                400,
                "Group name is required",
            );
        }

        const group = await groupService.createGC({
            adminId,
            name,
            description,
            groupProfile,
        });

        res.status(201).json({
            success: true,
            message: "Group created successfully",
            errors: [],
            data: group,
        });
    },
);

export const getGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const { groupId } = req.params;

        if (!groupId) {
            throw new ApiError(
                400,
                "Group ID is required",
            );
        }

        const group = await groupService.getGC(
            groupId,
        );

        if (!group) {
            throw new ApiError(
                404,
                "Group not found",
            );
        }

        res.status(200).json({
            success: true,
            message: "Group fetched successfully",
            errors: [],
            data: group,
        });
    },
);

export const updateGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const { groupId } = req.params;

        if (!groupId) {
            throw new ApiError(
                400,
                "Group ID is required",
            );
        }

        const {
            name,
            description,
            groupProfile,
        } = req.body;

        const group = await groupService.updateGroup(
            groupId,
            {
                name,
                description,
                groupProfile,
            },
        );

        if (!group) {
            throw new ApiError(
                404,
                "Group not found",
            );
        }

        res.status(200).json({
            success: true,
            message: "Group updated successfully",
            errors: [],
            data: group,
        });
    },
);

export const deleteGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const { groupId } = req.params;

        if (!groupId) {
            throw new ApiError(
                400,
                "Group ID is required",
            );
        }

        await groupService.deleteGroup(groupId);

        res.status(200).json({
            success: true,
            message: "Group deleted successfully",
            errors: [],
            data: null,
        });
    },
);