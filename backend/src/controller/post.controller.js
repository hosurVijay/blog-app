import { User } from "../Modles/user.model.js";
import { Post } from "../Modles/post.model.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { uploadCloudinary } from "../Utils/cloudinary.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { title } from "process";

const createPost = asyncHandler(async (req, res) => {
  const { title, content, postImage } = req.body;
  if ([title, content, postImage].some((field) => field.trim() === "")) {
    throw new ApiError(401, "All fields are Required.");
  }
  const postImageLocalPath = req.files?.postImage[0]?.path;
  if (!postImageLocalPath) {
    throw new ApiError(400, "Post Image is required");
  }

  const uplaodPostImage = await uploadCloudinary(postImageLocalPath);

  if (!uplaodPostImage) {
    throw new ApiError(400, "Post Image is required.");
  }

  const newPost = await Post.create({
    title: title,
    postImage: uplaodPostImage.url,
    content: content,
    owner: req.user?._id,
  });

  if (!newPost) {
    throw new ApiError(500, "Failed to upload the Post");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Post uploaded successfully", newPost));
});

const editPost = asyncHandler(async (req, res) => {
  const { newTitle, newPostImage, newContent } = req.body;
  const { postId } = req.params;

  const userPost = await Post.findById(postId);

  if (!userPost) {
    throw new ApiError(400, "No Post found");
  }
  const updateImage = {
    postImage: userPost.postImage,
  };

  if (req.files?.newPostImage[0]?.path) {
    const newPostImageLocalPath = req.files?.newPostImage[0]?.path;
    const uplaodNewPostImage = await uploadCloudinary(newPostImageLocalPath);

    if (!uplaodNewPostImage) {
      throw new ApiError(500, "Failed to edit the Post image");
    }

    updateImage.postImage = uplaodNewPostImage;
  }

  const editDetailsPost = await Post.findByIdAndUpdate(
    postId,
    {
      $set: {
        title: newTitle,
        content: newContent,
        postImage: updateImage.postImage,
      },
    },
    { new: true }
  );

  if (!editDetailsPost) {
    throw new ApiError(500, "Failed to Update the details ");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Post edited Successfull", editDetailsPost));
});

const totalPost = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const countTotalPost = await Post.countDocuments({ owner: userId });

  if (countTotalPost == undefined || countTotalPost == null) {
    throw new ApiError(500, "Failed to count the total Post.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, "Total post fetched successfully", countTotalPost)
    );
});

const countLikesOnPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(400, "NO post found!");
  }

  const alreadyLiked = post.likes.includes(userId);

  if (alreadyLiked) {
    post.likes.pull(userId);
    post.likesCount = post.likes.length;
    await post.save();

    res.status(200).json(
      new ApiResponse(200, "Unliked the Post successfully", {
        likesCount: post.likesCount,
      })
    );
  } else {
    post.likes.push(userId);
    post.likesCount = post.likes.length;
    await post.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, "Post liked", { likesCount: post.likesCount })
      );
  }
});

const countViewsOnPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const updateViewCount = await Post.findByIdAndUpdate(
    postId,
    {
      $inc: {
        views: 1,
      },
    },
    { new: true }
  );

  if (!updateViewCount) {
    throw new ApiError(400, "No post found");
  }

  res.status(200).json(
    new ApiResponse(200, "Post view increased", {
      postId: updateViewCount,
      totalViews: updateViewCount.views,
    })
  );
});

const filterQuery = asyncHandler(async (req, res) => {
  const { year, keyWord, category } = req.query;

  let query = {};

  if (year) {
    const startYear = new Date(`${year}-01-01`);
    const endYear = new Date(`${parseInt(year) + 1} -01-01`);
    query.createdAt = { $gte: startYear, $lt: endYear };
  }

  if (keyWord) {
    query.title = { $regex: keyWord, $option: "i" };
  }

  if (category) {
    query.category = category;
  }
  const post = await Post.find(query).sort({ createdAt: -1 });

  const total = await Post.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, "Filter successfull", {
      totalFiltered: total,
      totalPost: post,
    })
  );
});

const searchSinglePostByID = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const searchPost = await Post.findById(postId);
  if (!searchPost) {
    throw new ApiError(400, "No post exist");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Post fetched successfull", searchPost));
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const removePost = await Post.findByIdAndDelete(postId);
  if (!removePost) {
    throw new ApiError(400, "Post not found");
  }

  res.status(200).json(new ApiError(200, "Post delted successfully", null));
});

const searchPost = asyncHandler(async (req, res) => {
  const { postQuery } = req.query;

  const post = await Post.find({
    $or: [
      {
        title: { $regex: postQuery, $option: "i" },
        content: { $regex: postQuery, $option: "i" },
      },
    ],
  });

  if (!post) {
    throw new ApiError(400, "No Result");
  }

  res.status(200).json(new ApiError(200, "Success", post));
});

export {
  createPost,
  editPost,
  totalPost,
  countLikesOnPost,
  countViewsOnPost,
  filterQuery,
  searchSinglePostByID,
  deletePost,
};
