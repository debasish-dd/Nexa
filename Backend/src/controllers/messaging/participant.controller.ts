import type { Request, Response } from "express";
import asyncHandler from "../../utils/async-handler";
import { ApiError } from "../../utils/api-error";
import { ApiResponse } from "../../utils/api-response";
import {
    addParticipant as addParticipantService,
    changeParticipantRole as changeParticipantRoleService,
    checkParticipant as checkParticipantService,
    getConversationParticipants as getConversationParticipantsService,
    removeParticipant as removeParticipantService,
    type ParticipantRole,
} from "../../services/messaging/participant.service";

const ALLOWED_ROLES: ParticipantRole[] = ["member", "mod", "admin"];


export const addParticipant = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
        throw new ApiError(400, "userId is required");
    }
    if (role && !ALLOWED_ROLES.includes(role)) {
        throw new ApiError(400, `role must be one of: ${ALLOWED_ROLES.join(", ")}`);
    }

    const participant = await addParticipantService(conversationId, userId, role);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Participant role updated",
            participant,
        ),
    );
});


export const getConversationParticipants = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;

    const participants = await getConversationParticipantsService(conversationId);

    return res
        .status(200)
        .json(new ApiResponse(200, "Participants fetched successfully", participants));
});


export const checkParticipant = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const isParticipant = await checkParticipantService(conversationId, userId);

    return res
        .status(200)
        .json(new ApiResponse(200, "Participant status fetched", { isParticipant }));
});


export const changeParticipantRole = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;

    if (!conversationId || Array.isArray(conversationId)) {
        throw new ApiError(400, "Invalid conversation ID");
    }
    const { userId, role } = req.body;

    if (!userId || !role) {
        throw new ApiError(400, "userId and role are required");
    }
    if (!ALLOWED_ROLES.includes(role)) {
        throw new ApiError(400, `role must be one of: ${ALLOWED_ROLES.join(", ")}`);
    }

    const updatedParticipant = await changeParticipantRoleService(conversationId, userId, role);

    if (!updatedParticipant) {
        throw new ApiError(404, "Participant not found in this conversation");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Participant role updated", updatedParticipant));
});


export const removeParticipant = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        throw new ApiError(400, "userId is required");
    }

    const removed = await removeParticipantService(conversationId, userId);

    if (!removed) {
        throw new ApiError(404, "Participant not found in this conversation");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Participant removed successfully", null));
});