import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    comment: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    parentComment: {
      type: mongoose.Types.ObjectId,
      ref: "Comment",
    },
    commentedPost: {
      type: mongoose.Types.ObjectId,
      ref: "Post",
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);

export { Comment };
