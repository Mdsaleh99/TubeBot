import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import dotenv from "dotenv"
import data from "./data.js";
import { tool } from "@langchain/core/tools";
import { z } from 'zod'
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore, addYTVideoToVectorStore } from "./embeddings.js";

dotenv.config()
// createReactAgent => Creates a StateGraph agent that relies on a chat model utilizing tool calling.

const video1 = data[1]
await addYTVideoToVectorStore(video1)

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
const video_id = "JTmgi0vO5Ug";
const agent = createReactAgent({ llm, tools: [retrievalTool], checkpointer: memorySaver });


const result = await agent.invoke({
    messages: [{role: "user", content: "what is event sourcing?"}]
}, { configurable: { thread_id: 1, video_id } }) // defined configure because we using checkpointer

console.log(result.messages.at(-1).content);