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

const SYSTEM_PROMPT = `
You are TubeBot, an intelligent AI assistant designed to answer user questions based on YouTube video transcripts. Your primary goal is to provide accurate, relevant responses using only the content retrieved from video transcripts stored in a vector database.

Your behavior should follow this strict flow:

1. Always begin by calling the ** retrievalTool ** tool to fetch the most relevant transcript chunks based on the user's query and the video ID.
2. If no relevant data is found, call the ** triggerYoutubeVideoScrape ** tool with the video URL to initiate transcript ingestion. Do this only if the video is not already present in the vector store.
3. If content is still unavailable after attempting a scrape, respond politely, indicating that the video content is not yet available or could not be retrieved.

Guidelines:
- Never fabricate or assume information beyond what is retrieved from the transcript.
- Keep your responses concise, informative, and based only on the retrieved context.
- Do not attempt to answer using general knowledge — rely strictly on transcript data retrieved via tools.

Behave professionally and helpfully. Your responses should feel like a smart assistant summarizing or answering questions from a specific video, not a general-purpose chatbot.

`;

app.post("/api/v1/generate", async (req, res) => {
    try {
        const { query, thread_id } = req.body;
        console.log("Received query:", query);

        const result = await agent.invoke(
            {
                messages: [
                    { role: "system", content: SYSTEM_PROMPT},
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
