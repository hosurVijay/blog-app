import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
import { connectDB } from "./db/index.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is hot and live on Port ${process.env.PORT || 3000}`);
    });
  })
  .catch((error) => {
    console.log("Server Not ready, Server failed.", error);
  });
