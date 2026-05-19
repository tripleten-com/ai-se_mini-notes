import { Schema, model } from "mongoose";

export type UserDocument = {
  name: string;
  email: string;
};

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

export const UserModel = model<UserDocument>("User", userSchema);
