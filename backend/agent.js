import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import dotenv from "dotenv"
import data from "./data.js";
import { tool } from "@langchain/core/tools";
import { z } from 'zod'
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore, addYTVideoToVectorStore } from "./embeddings.js";
import { triggerYoutubeVideoScrape } from "./brightdata.js";

dotenv.config()
// createReactAgent => Creates a StateGraph agent that relies on a chat model utilizing tool calling.

const video1 = data[1]
// await addYTVideoToVectorStore(video1)

const triggerYoutubeVideoScrapeTool = tool(async ({ url }) => {
    // console.log("Triggering YouTube video scrape for URL:", url);
    const snapshotId = await triggerYoutubeVideoScrape(url);
    return snapshotId;
}, {
    name: "triggerYoutubeVideoScrape",
    description:
        "Trigger a scrape of a YouTube video using the url. The tool start scraping job, that usually takes around 7 seconds. The tool return the snapshot/job id, that can be used to check the status of the scraping job. Use the tool only if the video is not already in the vector store.",
    schema: z.object({
        url: z.string()
    })
});

// Retreval tool
const retrievalTool = tool(async ({query}, {configurable: {video_id}}) => {
    const retrievedDocs = await vectorStore.similaritySearch(query, 3, {video_id});
    const serializedDocs = retrievedDocs.map((doc) => doc.pageContent).join("\n ")
    console.log(serializedDocs);
    
    return serializedDocs
}, {
    name: 'retrieve',
    description: 'Retrieve the most relevant chunks of text from the transcript of a youtube video',
    schema: z.object({
        query: z.string()
    })
}) 

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",  // 10 RPM and 500 req/day
    apiKey: process.env.GEMINI_API_KEY,
});

const memorySaver = new MemorySaver();
// MemorySaver is used to save the state of the agent between invocations, allowing it to remember past interactions.
export const agent = createReactAgent({
    llm,
    tools: [retrievalTool, triggerYoutubeVideoScrapeTool],
    checkpointer: memorySaver,
});


