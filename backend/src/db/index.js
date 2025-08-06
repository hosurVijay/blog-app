import express from "express";
import { DBNAME } from "../constant.js";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_DB_URL}/${DBNAME}`
    );
    console.log(
      `\n Mongoose connected || DB Host, ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("mongoose connection failed!!");
    process.exit(1);
  }
};

export { connectDB };
