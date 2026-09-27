import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";
import { ApiError } from "./utils/api-error";
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import dmRouter from "./routes/dm.routes";
import groupRouter from "./routes/group.routes";
import conversationRouter from "./routes/conversation.routes";



const app = express();

app.use(cors({
    origin: "http://localhost:3000", // still needs fixing — see note below
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.set("trust proxy", true);

app.use("/api/v1/auth", authRouter);

app.get("/healthcheck", (_req, res) => {
    return res.status(200).json({ message: "Server is running" });
});

app.use("/api/v1/dms", dmRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/conversations", conversationRouter);

app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        errors: [],
        data: null,
    });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            data: err.data,
        });
    }

    console.error(err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        errors: [],
        data: null,
    });
};

app.use(errorHandler);

export default app;