import  dotenv  from "dotenv";
dotenv.config();

import  express  from "express";
import  cors  from "cors";
import cookiParser from "cookie-parser";
import authRouter from "./routes/auth.routes";



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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})