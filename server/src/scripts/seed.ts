import "dotenv/config";
import mongoose from "mongoose";
import { NoteModel } from "../models/Note";
import { UserModel } from "../models/User";

const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/mini-notes";

async function seed() {
  await mongoose.connect(mongoUri);
  await Promise.all([NoteModel.deleteMany({}), UserModel.deleteMany({})]);

  const user = await UserModel.create({
    _id: new mongoose.Types.ObjectId("64a000000000000000000001"),
    name: "Avery Stone",
    email: "avery@example.com"
  });

  await NoteModel.create([
    {
      title: "Contract checklist",
      body: "Confirm the shared note type matches the API response.",
      visibility: "team",
      ownerId: user._id,
      tags: ["typescript", "contracts"],
      comments: [
        {
          id: "comment-1",
          body: "Check mapper output before changing the UI.",
          authorId: user._id.toString(),
          createdAt: new Date().toISOString()
        }
      ],
      archived: false,
      pinned: true
    },
    {
      title: "Validation boundary",
      body: "Client validation helps UX, but backend validation protects data.",
      visibility: "private",
      ownerId: user._id,
      tags: ["validation"],
      comments: [],
      archived: false
    }
  ]);

  await mongoose.disconnect();
}

void seed();
