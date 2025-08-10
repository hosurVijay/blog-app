import { asyncHandler } from "../Utils/asyncHandler.js";
import { User } from "../Modles/user.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { use } from "react";
const generateAccessRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate Tokens");
  }
};

const signUpUser = asyncHandler(async (req, res) => {
  const { username, fullname, email, password, confirmPassword } = req.body;
  if (
    [username, fullname, email, password, confirmPassword].some(
      (field) => field?.trim === ""
    )
  ) {
    throw new ApiError(400, "all fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(500, "Password and confirm Password does't match.");
  }

  const existUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existUser) {
    throw new ApiError(400, "User already exist with same username and email");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullname,
    email,
    password,
  });

  const { refreshToken, accessToken } = await User.findById(
    user._id
  ).generateAccessRefreshToken();

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(400, "Failed to create Account");
  }

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "LAX",
    secure: false,
    maxAge: 10 * 24 * 60 * 60 * 1000,
  });
  res
    .status(200)
    .json(new ApiResponse(200, "Account created Successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(400, "No user found with such Username or email");
  }

  const checkPassword = await user.isPasswordCorrect(password);

  if (!checkPassword) {
    throw new ApiError(400, "Incorrect password");
  }

  const { refreshToken, accessToken } = await user.generateAccessRefreshToken(
    user._id
  );

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedUser) {
    throw new ApiError(400, "Failed to Login");
  }

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "LAX",
    secure: false,
    maxAge: 10 * 24 * 60 * 60 * 1000,
  });

  res
    .status(200)
    .json(new ApiResponse(200, "LoggedIn successfull", loggedUser));
});

const logoutUser = asyncHandler(async (res, req) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: false,
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "Successful logout"));
});

const getUser = asyncHandler(async (req, res) => {
  const user = await req.user;
  const post = await Post.find({ owner: req._id });

  res
    .status(200)
    .json(new ApiResponse(200, "User fetched successful.", { user, post }));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!(oldPassword || newPassword)) {
    throw new ApiError(400, "Both password is required");
  }
  const user = await User.findById(req.user?._id);
  const givenOldPassword = await user.isPasswordCorrect(oldPassword);
  if (!givenOldPassword) {
    throw new ApiError(400, "Old password is incorrect \n please try again.");
  }
  user.password = newPassword;
  user.save({ validateBeforeSave: false });
  res.status(200).json(new ApiResponse(200, "Passwoed changed successful"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullname, username, currentPassword, email, newPassword } = req.body;

  if (!currentPassword) {
    throw new ApiError(400, "Current password is Required.");
  }

  const user = await User.findByIdAndUpdate(req.user?._id);
  if (!user) {
    throw new ApiError(400, "Failed to fetch user details.");
  }
  const verifyPassword = await user.isPasswordCorrect(currentPassword);
  if (!verifyPassword) {
    throw new ApiError(400, "Incorrect password.");
  }
  if (username) user.username = username;
  if (fullname) user.fullname = fullname;
  if (email) user.email = email;
  if (newPassword) user.password = newPassword;

  const updatedUser = user.save({ validateBeforeSave: false });
  const { password, refreshToken, ...safeUpdatedDetails } =
    updatedUser.toObject();
  res
    .status(200)
    .json(
      new ApiResponse(200, "Details updated Successfully", safeUpdatedDetails)
    );
});
