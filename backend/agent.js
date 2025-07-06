import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import dotenv from "dotenv";
import data from "./data.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore, addYTVideoToVectorStore } from "./embeddings.js";
import { triggerYoutubeVideoScrape } from "./brightdata.js";
import { ChatGroq } from "@langchain/groq";

dotenv.config();
// createReactAgent => Creates a StateGraph agent that relies on a chat model utilizing tool calling.

const video1 = data[1];
// await addYTVideoToVectorStore(video1)

const triggerYoutubeVideoScrapeTool = tool(
    async ({ url }) => {
        // console.log("Triggering YouTube video scrape for URL:", url);
        const snapshotId = await triggerYoutubeVideoScrape(url);
        return snapshotId;
    },
    {
        name: "triggerYoutubeVideoScrape",
        description: `
        Trigger the scraping of a youtube video using the url. 
        The tool start a scraping job, that usually takes around 7 seconds
        The tool will return a snapshot/job id, that can be used to check the status of the scraping job
        Before calling this tool, make sure that it is not already in the vector store`,
        schema: z.object({
            url: z.string(),
        }),
    }
);

// Retreval tool
const retrievalTool = tool(
    async ({ query, video_id }, { configurable: {} }) => {
        const retrievedDocs = await vectorStore.similaritySearch(query, 3, {
            video_id,
        });
        const serializedDocs = retrievedDocs
            .map((doc) => doc.pageContent)
            .join("\n ");
        console.log(serializedDocs);

        return serializedDocs;
    },
    {
        name: "retrieve",
        description:
            "Retrieve the most relevant chunks of text from the transcript for a specific youtube video",
        schema: z.object({
            query: z.string(),
            video_id: z
                .string()
                .describe("The ID of the YouTube video to retrieve data from"),
        }),
    }
);

// retrieveal similar videos tool
const retrieveSimilarVideosTool = tool(
    async ({ query }) => {
        const retrievedDocs = await vectorStore.similaritySearch(query, 30);

        const ids = retrievedDocs
            .map((doc) => doc.metadata.video_id)
            .join("\n ");

        return ids;
    },
    {
        name: "retrieveSimilarVideos",
        description: "Retrieve the ids of the most similar videos to the query",
        schema: z.object({
            query: z.string(),
        }),
    }
);

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
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

const memorySaver = new MemorySaver();
// MemorySaver is used to save the state of the agent between invocations, allowing it to remember past interactions.
export const agent = createReactAgent({
    llm,
    systemMessage: SYSTEM_PROMPT,
    tools: [
        retrievalTool,
        triggerYoutubeVideoScrapeTool,
        retrieveSimilarVideosTool,
    ],
    checkpointer: memorySaver,
});
