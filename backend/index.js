import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {agent} from "./agent.js";
import { addYTVideoToVectorStore } from "./embeddings.js";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({limit: "300mb"})); // Parse JSON bodies of incoming requests
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.get("/", (req, res) => {
    res.send("Hello, World!");
});



app.post("/api/v1/generate", async (req, res) => {
    try {
        const { query, thread_id } = req.body;
        console.log("Received query:", query);

        const result = await agent.invoke(
            {
                messages: [
                    { role: "user", content: query },
                ],
            },
            { configurable: { thread_id } }
        ); // defined configure because we using checkpointer

        console.log(result.messages.at(-1).content);

        res.json(result.messages.at(-1).content);
    } catch (error) {
        console.error("Error generating response:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/api/v1/webhook", async(req, res) => { 
    await Promise.all(
        req.body.map(async (video) => addYTVideoToVectorStore(video))
    );
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
