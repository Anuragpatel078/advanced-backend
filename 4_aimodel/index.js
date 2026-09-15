import { GoogleGenAI } from "@google/genai";
import express from "express"
import dotenv from "dotenv"
import { ChatGroq } from "@langchain/groq"
import {Annotation,MemorySaver,MessagesAnnotation,StateGraph} from "@langchain/langgraph"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import {ToolNode} from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

dotenv.config();

const app =express();
const port=5000
app.use(express.json())


//without langchain
// const ai=new GoogleGenAI({
//     apiKey:process.env.GEMINI_API_KEY
// })
// app.post("/ai",async(req,res)=>{
//     const {input}=req.body
//      const response=await ai.models.generateContent({
//         model:"gemini-3.5-flash",
//         contents:[
//             {role:"system",
//               parts:[{text:"you are a assistant and your name is jarvis. if you don't know the answer then don't give incorrect answer"}]
//             },
//             {
//                 role:"user",
//                 parts:[{text:input}]


//             }
//         ]
//     })
//     return res.status(200).json({"ai:":response.text})
// })



// const State=Annotation.Root({
//     prompt:Annotation,
//     aiMsg:Annotation
// })

const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

const checkPointer=new MemorySaver()


const tools=[tool]
const toolNode=new  ToolNode(tools)

const llm=new ChatGroq({
    model:"openai/gpt-oss-120b",
    temperature:0,
    maxTokens:500,
    maxRetries:2
}).bindTools(tools)

const callLLM=async (state) =>{
    console.log("state:",state)
    const response=await llm.invoke([
        {  
            role:"system",
            content:"you are a assistant and your name is jarvis. if you don't know the answer then call relevent tool"}
        ,
        ...state.messages
        
    ])
    return {messages:[response]}
}
const shouldContinue=async(state)=>{
    const lastMessage=state.messages[state.messages.length-1]
   if(lastMessage.tool_calls?.length>0){
    return "tools"
   }
   else{
    return "__end__"
   }
}

const graph=new StateGraph(MessagesAnnotation)
.addNode("agent",callLLM)
.addNode("tools",toolNode)
.addEdge("__start__","agent")
// .addEdge("agent","__end__")
.addEdge("tools","agent")
.addConditionalEdges("agent",shouldContinue)
.compile({checkpointer:checkPointer})






app.post("/ai",async(req,res)=>{
    const {input}=req.body
    const response=await graph.invoke({
        messages:[
        {  role:"user",
            content:input
        }
        ]
    },
    {
        configurable:{thread_id:"123"}
    }
)
    
    console.log(response.message)

     
    return res.status(200).json({"ai:":response.messages[response.messages.length-1].content})
})



app.get("/",(req,res)=>{
    return res.json({message:"hello from ai "})
})
app.listen(port,()=>{
    console.log("server started")
})