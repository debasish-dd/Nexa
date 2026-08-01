import  express  from "express";
import  dotenv  from "dotenv";
import  cors  from "cors";
import cookiParser from "cookie-parser";

dotenv.config();

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

app.get("/healthcheck", (_req, res) => {
    return res.status(200).json({ message: "Server is running" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})