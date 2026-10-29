import type { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { ApiResponse } from "../utils/api-response"; // ADJUST: copy from auth.controllers.ts
import { searchUsersQuerySchema } from "../validations/user.validation";
import { findPublicUserById, searchUsers, type UserSearchRow } from "../repositories/users/user-search.repository";

// Postgres LIKE treats % and _ as wildcards (and \ as the escape character).
// Usernames can contain _, so escape all three to match them literally.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const cursorSchema = z.object({ k: z.string().max(30), id: z.uuid() });

function encodeCursor(row: UserSearchRow): string {
    return Buffer.from(JSON.stringify({ k: row.sort_key, id: row.id })).toString("base64url");
}

function decodeCursor(cursor: string): { sortKey: string; id: string } {
    try {
        const parsed = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
        return { sortKey: parsed.k, id: parsed.id };
    } catch {
        throw new ApiError(400, "Invalid cursor");
    }
}

export const searchUsersController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = searchUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new ApiError(
            400,
            "Validation error",
            parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
        );
    }
    const { q, limit, cursor } = parsed.data;

    const viewerId = req.user!.userId;

    const rows = await searchUsers({
        prefix: escapeLike(q.toLowerCase()),
        viewerId,
        limit,
        ...(cursor ? { after: decodeCursor(cursor) } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const lastRow = page[page.length - 1];

    const nextCursor =
        hasMore && lastRow
            ? encodeCursor(lastRow)
            : null;

    return res.status(200).json(
        new ApiResponse(200, "Users fetched", {
            users: page.map(({ id, username, avatar_url }) => ({ id, username, avatar_url })),
            nextCursor,
        })
    );
});

export const getUserByIdController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id || Array.isArray(id)) {
            throw new ApiError(400, "Invalid user ID");
        }

        const user = await findPublicUserById(id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, "User fetched successfully", { user }));
    },
);