import { z } from "zod";
import type { RequestHandler } from "express";
import { ApiError } from "../utils/api-error";

export const validate = (schema: z.ZodObject) =>
        ((req, res, next) => {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                throw new ApiError(400, "Validation error", result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
            }

            req.body = result.data;
            next();
        }) satisfies RequestHandler;

