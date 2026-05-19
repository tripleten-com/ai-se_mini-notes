import { Router } from "express";
import { getNotes, patchNote, postNote } from "../controllers/noteController";

const notesRouter = Router();

notesRouter.get("/", getNotes);
notesRouter.post("/", postNote);
notesRouter.patch("/:noteId", patchNote);

export default notesRouter;
