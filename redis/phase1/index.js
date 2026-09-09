import express from "express";
import dotenv from "dotenv";
import connectDb from "./lib/db.js";
import User from "./model/user.model.js";
import Redis from "ioredis";

dotenv.config();

const port=process.env.PORT||5000;
const app=express();

const redis=new Redis(process.env.REDIS_URL)

app.use(express.json());

app.get("/",(req,res)=>{
  return res.status(200).json({
    message: "hello from redis"
   });
});

app.post("/create",async (req,res)=>{
    const {name,email,password}=req.body
    await redis.del("user:all")
    const user=await User.create({
        name,email,password

    })
    return res.json(user)

})

app.get("/get",async (req,res)=>{
    const user=await User.find({})
    return res.json(user)
})

app.get("/redis-get",async (req,res)=>{

    const data=await redis.get("user:all")
    if(data){
        const user=JSON.parse(data)
        return res.json(user)
    }

    const user=await User.find({})
    await redis.set("user:all", JSON.stringify(user))
    return res.json(user)
})

app.listen(port,()=>{
    connectDb();
    console.log(`server started on port ${port}`)
})