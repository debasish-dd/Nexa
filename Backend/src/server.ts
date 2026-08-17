import  dotenv  from "dotenv";
dotenv.config();

import  express  from "express";
import  cors  from "cors";
import cookiParser from "cookie-parser";
import authRouter from "./routes/auth.routes";
import { ApiError } from "./utils/api-error";
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";




const app = express();

const PORT = process.env.PORT || 3000;

// const allowedOrigins = [
//     "*",
// ];

app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookiParser())

app.set("trust proxy", true);

app.use("/api/v1/auth", authRouter);

app.get("/healthcheck", (_req, res) => {
    return res.status(200).json({ message: "Server is running" });
});


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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})