import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { QdrantVectorStore } from "@langchain/qdrant";
import dotenv from "dotenv"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

dotenv.config()

// const embeddings = new OpenAIEmbeddings({
//     model: "text-embedding-3-small",
//     apiKey: process.env.OPENAI_API_KEY
// })

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "embedding-001",
    apiKey: process.env.GEMINI_API_KEY,
});

// export const vectorStore = new MemoryVectorStore(embeddings)
export const vectorStore = new QdrantVectorStore(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: "youtube_video_rag"
});

export const addYTVideoToVectorStore = async (videoData) => {
    const { transcript, video_id } = videoData
    console.log(transcript);
    console.log(video_id);

    const docs = [
        new Document({
            pageContent: transcript,
            metadata: { video_id},
        }),
    ];
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    })

    const chunks = await splitter.splitDocuments(docs);
    console.log(chunks);
    
    await vectorStore.addDocuments(chunks);
}