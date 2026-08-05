import { ZodObject } from "zod";
import type { RequestHandler } from "express";

export const validate = (schema: ZodObject) =>
        ((req, res, next) => {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: result.error.issues,
                });
            }

            req.body = result.data;
            next();
        }) satisfies RequestHandler;

