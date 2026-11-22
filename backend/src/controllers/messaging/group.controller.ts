import type { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler";
import * as groupService from "../../services/messaging/group.service";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";
import {
    closeConversationRoom,
    emitToConversation,
    joinConversationRoom,
    leaveConversationRoom,
} from "../../socket/conversation-events";

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

        // The creator's open connections join the new room right away.
        joinConversationRoom(callerId, group.conversationId);

        res.status(201).json(
            new ApiResponse(201, "Group created successfully", group),
        );
    },
);

/** GET /groups/:conversationId */
export const getGCByConversationId = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        const conversationId = getParam(req, "conversationId");

        const group = await groupService.getGCByConversationId(conversationId, callerId);

        res.status(200).json(
            new ApiResponse(200, "Group fetched successfully", group),
        );
    },
);

export const getGroupInbox = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);

        // Default limit = 10
        const rawLimit = req.query.limit;
        let limit = 10;

        if (rawLimit !== undefined) {
            if (typeof rawLimit !== "string") {
                throw new ApiError(400, "Invalid limit");
            }

            const parsedLimit = Number(rawLimit);

            if (
                !Number.isInteger(parsedLimit) ||
                parsedLimit < 1 ||
                parsedLimit > 50
            ) {
                throw new ApiError(
                    400,
                    "Limit must be an integer between 1 and 50",
                );
            }

            limit = parsedLimit;
        }

        const groups = await groupService.getGroupInbox(callerId, limit);

        res.status(200).json(
            new ApiResponse(
                200,
                "Group inbox fetched successfully",
                groups,
            ),
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

        emitToConversation(conversationId, "group:updated", group);

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

        // Tell everyone, then empty the room.
        emitToConversation(conversationId, "group:deleted", { conversationId });
        closeConversationRoom(conversationId);

        res.status(200).json(
            new ApiResponse(200, "Group deleted successfully", null),
        );
    },
);
export const getDiscoverableGroups = asyncHandler(
    async (req: Request, res: Response) => {
        const callerId = getCallerId(req);
        

        let limit = 20;
        let offset = 0;

        // Validate limit.
        const rawLimit = req.query.limit;

        if (rawLimit !== undefined) {
            if (typeof rawLimit !== "string") {
                throw new ApiError(400, "Invalid limit");
            }

            const parsedLimit = Number(rawLimit);

            if (
                !Number.isInteger(parsedLimit) ||
                parsedLimit < 1 ||
                parsedLimit > 50
            ) {
                throw new ApiError(
                    400,
                    "Limit must be an integer between 1 and 50",
                );
            }

            limit = parsedLimit;
        }

        // Validate offset.
        const rawOffset = req.query.offset;

        if (rawOffset !== undefined) {
            if (typeof rawOffset !== "string") {
                throw new ApiError(400, "Invalid offset");
            }

            const parsedOffset = Number(rawOffset);

            if (
                !Number.isSafeInteger(parsedOffset) ||
                parsedOffset < 0
            ) {
                throw new ApiError(
                    400,
                    "Offset must be a non-negative integer",
                );
            }

            offset = parsedOffset;
        }

        const result = await groupService.getDiscoverableGroups(
            callerId,
            limit,
            offset,
        );

        res.status(200).json(
            new ApiResponse(
                200,
                "Discoverable groups fetched successfully",
                result,
            ),
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

        // Join first, so the new member receives the event too.
        joinConversationRoom(targetUserId, conversationId);
        emitToConversation(conversationId, "group:member-added", {
            conversationId,
            member,
        });

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

        // Announce first, THEN remove the person from the room,
        // so the removed person hears about it too.
        emitToConversation(conversationId, "group:member-removed", {
            conversationId,
            userId: targetUserId,
            removedBy: callerId,
            reason: callerId === targetUserId ? "left" : "removed",
        });
        leaveConversationRoom(targetUserId, conversationId);

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

        emitToConversation(conversationId, "group:role-changed", {
            conversationId,
            member,
        });

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

        emitToConversation(conversationId, "group:admin-changed", {
            conversationId,
            adminId: group.adminId,
            previousAdminId: callerId,
        });

        res.status(200).json(
            new ApiResponse(200, "Admin transferred successfully", group),
        );
    },
);