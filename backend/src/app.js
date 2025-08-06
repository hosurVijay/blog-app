import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-Parser";

const app = express();
app.use(
  cors({
    origin: "*",
    Credential: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

export { app };
