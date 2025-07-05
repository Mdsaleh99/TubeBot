import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import dotenv from "dotenv"
// import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import data from "./data.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { tool } from "@langchain/core/tools";
import {z} from 'zod'

// createReactAgent => Creates a StateGraph agent that relies on a chat model utilizing tool calling.

dotenv.config()

//! STEP: 1 Split the video into chunks
const video1 = data[1]
// console.log(video1.transcript);
const docs = [
    new Document({
        pageContent: video1.transcript,
        metadata: { video_id: video1.video_id },
    }),
];

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
})

const chunks = await splitter.splitDocuments(docs)
// console.log(chunks);

//! STEP: 2 Embed the chunks
const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY
})

const vectorStore = new MemoryVectorStore(embeddings)
await vectorStore.addDocuments(chunks)

//! STEP: 3 Retrieve most relevant chunks
// const retrievedDocs = await vectorStore.similaritySearch(query, 3) // Number of similar results to return. Defaults to 4.
// console.log(retrievedDocs);

//! Retreval tool
const retrievalTool = tool(async ({query}) => {
    console.log("query", query);
    const retrievedDocs = await vectorStore.similaritySearch(query, 3);
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

const agent = createReactAgent({ llm, tools: [retrievalTool] });

const result = await agent.invoke({
    messages: [{role: "user", content: "what is event sourcing"}]
})

// console.log(result);
// console.log(result.messages[0].content);
// console.log(result.messages[1].content);
console.log(result.messages.at(-1).content);




// const loader = YoutubeLoader.createFromUrl("https://www.youtube.com/watch?v=kEtGm75uBes", {
//     language: "en",
//     addVideoInfo: true,
//     includeTimestamps: true
// });

// const docs = await loader.load();

// console.log(docs);