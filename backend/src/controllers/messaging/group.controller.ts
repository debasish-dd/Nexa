import type { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler";
import * as groupService from "../../services/messaging/group.service";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";

// The caller always comes from the login, never from the request body.
const getCallerId = (req: Request): string => {
    const id = req.user?.userId;

    if (!id) {
        throw new ApiError(401, "Unauthorized");
    }

    return id;
};

const getParam = (req: Request, name: string): string => {
    const value = req.params[name];

    if (!value || Array.isArray(value)) {
        throw new ApiError(400, `Invalid ${name}`);
    }

    return value;
};

const getBodyUserId = (req: Request): string => {
    const { userId } = req.body ?? {};

    if (typeof userId !== "string" || !userId) {
        throw new ApiError(400, "userId is required");
    }

    return userId;
};

/** POST /groups  body: { name, description?, groupProfile? } */
export const createGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const { name, description, groupProfile } = req.body ?? {};

        const group = await groupService.createGC(callerId, {
            name,
            description,
            groupProfile,
        });

        res.status(201).json(
            new ApiResponse(201, "Group created successfully", group),
        );
    },
);

/** GET /groups/:conversationId */
export const getGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");

        const group = await groupService.getGC(conversationId, callerId);

        res.status(200).json(
            new ApiResponse(200, "Group fetched successfully", group),
        );
    },
);

/** PATCH /groups/:conversationId  body: { name?, description?, groupProfile? } */
export const updateGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");
        const { name, description, groupProfile } = req.body ?? {};

        const group = await groupService.updateGroup(conversationId, callerId, {
            name,
            description,
            groupProfile,
        });

        res.status(200).json(
            new ApiResponse(200, "Group updated successfully", group),
        );
    },
);

/** DELETE /groups/:conversationId */
export const deleteGroup = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");

        await groupService.deleteGroup(conversationId, callerId);

        res.status(200).json(
            new ApiResponse(200, "Group deleted successfully", null),
        );
    },
);

/** POST /groups/:conversationId/members  body: { userId } */
export const addMember = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");
        const targetUserId = getBodyUserId(req);

        const member = await groupService.addMember(
            conversationId,
            callerId,
            targetUserId,
        );

        res.status(201).json(
            new ApiResponse(201, "Member added successfully", member),
        );
    },
);

/** DELETE /groups/:conversationId/members/:userId  (your own id = leave) */
export const removeMember = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");
        const targetUserId = getParam(req, "userId");

        await groupService.removeMember(conversationId, callerId, targetUserId);

        res.status(200).json(
            new ApiResponse(200, "Member removed successfully", null),
        );
    },
);

/** PATCH /groups/:conversationId/members/:userId/role  body: { role: "member" | "mod" } */
export const changeMemberRole = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");
        const targetUserId = getParam(req, "userId");
        const { role } = req.body ?? {};

        const member = await groupService.changeMemberRole(
            conversationId,
            callerId,
            targetUserId,
            role,
        );

        res.status(200).json(
            new ApiResponse(200, "Member role updated", member),
        );
    },
);

/** POST /groups/:conversationId/transfer-admin  body: { userId } */
export const transferAdmin = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");
        const targetUserId = getBodyUserId(req);

        const group = await groupService.transferAdmin(
            conversationId,
            callerId,
            targetUserId,
        );

        res.status(200).json(
            new ApiResponse(200, "Admin transferred successfully", group),
        );
    },
);