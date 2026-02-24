// require("dotenv").config({path: "./env"});

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./.env"
});

connectDB().
then(()=>{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
}).
catch((err)=>{
    console.log("Mongo db connection failed !!!", err);
});




/*
import dotenv from "dotenv";
import express from "express";

const app = express();

dotenv.config();

(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log("MongoDB connected successfully");
        app.on("error", (error) => {
            console.error("Error in Express app:", error);
        });
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
})()
*/