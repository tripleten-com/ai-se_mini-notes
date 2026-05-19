import cors from "cors";
import express from "express";
import morgan from "morgan";
import notesRouter from "./routes/notes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

app.use("/api/notes", notesRouter);

export default app;
