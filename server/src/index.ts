import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";

const port = Number(process.env.PORT ?? 4001);
const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/mini-notes";

async function startServer() {
  await mongoose.connect(mongoUri);

  app.listen(port, () => {
    console.log(`Mini Notes API listening on port ${port}`);
  });
}

void startServer();
