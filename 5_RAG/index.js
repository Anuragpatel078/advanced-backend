import express from "express"
import dotenv from "dotenv"
import { ChatGroq } from "@langchain/groq"
import fs from "fs"
import { PDFParse } from "pdf-parse";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters"
import { TaskType } from "@google/generative-ai";
import {QdrantVectorStore} from "@langchain/qdrant"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
dotenv.config();

const app =express();
const port=5000
app.use(express.json())


const llm=new ChatGroq({
    model:"openai/gpt-oss-120b",
    temperature:0,
    maxTokens:500,
    maxRetries:2
})
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "grocery-store",
});


const upload=async()=>{
    const pdfpath="./knowledge.pdf"
    const buffer=fs.readFileSync(pdfpath)
    const pdfResult=new PDFParse({data:buffer})
    const text=await pdfResult.getText()
    const spilitter=new RecursiveCharacterTextSplitter({
          chunkSize:500,
          chunkOverlap:200
    })
const docs=await spilitter.createDocuments([text.text])
console.log(docs)
await vectorStore.addDocuments(docs)
}
upload()

app.post("/ai",async(req,res)=>{
    const {input}=req.body

    const docs=await vectorStore.similaritySearch(input,5)
    const context=docs.map((d)=>d.pageContent).join('/n')
    
    const response=await llm.invoke([
        new SystemMessage(`You are a RAG AI assistant.
            answer only fron context,do not use outside knowledge,if answer not found say,
            "I don't know from uploaded PDF"
            
            context:
            ${context}
            
            `),
           new HumanMessage(input)
    ])
    return res.status(200).json({"ai:":response.content})
    
})


app.get("/",(req,res)=>{
    return res.json({message:"hello from ai "})
})
app.listen(port,()=>{
    console.log("server started")
})