import { asyncHandler } from "../Utils/asyncHandler.js";
import { User } from "../Modles/user.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sendToUserEMailId } from "../Utils/otpVerity.js";

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
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "all fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(500, "Password and confirm Password does't match.");
  }

  const existUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });
  if (existUser) {
    throw new ApiError(400, "User already exist with same username and email");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullname,
    email,
    password,
    isVerified: false,
  });

  const userOtp = user.generateOtp();
  await user.save();

  await sendToUserEMailId(
    user.email,
    "your 6-digit OTP code for Signup",
    `Your OTP is : ${userOtp}. "This will expiry in 5 minutes"`
  );

  const createdUser = await User.findById(user._id);

  if (!createdUser) {
    throw new ApiError(400, "Failed to create Account");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Account created Successfully", { email }));
});

const verifyUserOtp = asyncHandler(async (req, res) => {
  const { email, userOtp } = req.body;

  if (!email || !userOtp) {
    throw new ApiError(500, "Email and Otp required.");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(200, "Falied to fetch user.");
  }

  if (user.otp !== userOtp) {
    throw new ApiError(500, "Otp did't match.");
  }

  if (Date.now() > user.otpExpiry) {
    throw new ApiError(
      500,
      "Invalid OTP or OTP expired. \n Please request a new OTP."
    );
  }

  const { refreshToken, accessToken } = user.generateAccessRefreshToken();
  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  const safeUserInfo = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  if (!safeUserInfo) {
    throw new ApiError(500, "No user found.");
  }

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "LAX",
    maxAge: 10 * 24 * 60 * 60 * 1000,
  });
  res
    .status(200)
    .json(new ApiResponse(200, "Account verified successful.", safeUserInfo));
});

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required or missing");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "No User found.");
  }

  if (user.isVerified) {
    throw new ApiError(500, "Account is Already verified.");
  }

  const nowDate = Date.now();

  if (!user.otpRequest) user.otpRequest = [];

  user.otpRequest = user.otpRequest.filter(
    (timestamp) => nowDate - timestamp < 30 * 60 * 1000
  );

  if (user.otpRequest.length >= 3) {
    throw new ApiError(
      400,
      "Too many Otp request. Try again after 30 minutes."
    );
  }

  const newOtp = user.generateOtp();
  user.otpRequest.push(nowDate);
  await user.save();

  await user.sendToUserEMailId(
    user.email,
    "Your new OTP for sign Up",
    `"Your new OTP is" ${newOtp}. this will expriy in 5 minutes.`
  );

  res.status(200).json(new ApiResponse(200, "OTP sent successful", { email }));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(500, "Email is required.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "No user found.");
  }

  const resetOtp = user.generateOtp();
  user.otpExpiry = Date.now() + 5 * 60 * 1000;
  await user.save();

  await sendToUserEMailId(
    user.email,
    "Your OTP to rest the Password",
    `"Your password to reset the Password" ${resetOtp}`
  );

  res.status(200).json(
    new ApiResponse(200, "Otp to Reset the password sent successful", {
      email,
    })
  );
});

const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!(email || otp)) {
    throw new ApiError(400, "Email and otp is required.");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "No user found");
  }

  if (Date.now() > user.otpExpiry) {
    throw new ApiError("Invalid OTP or otp expired.");
  }

  if (user.otp !== otp) {
    throw new ApiError(400, "Otp didn't match. Try again");
  }

  res.status(200).json(new ApiResponse(200, "OTP verified Successfully", null));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword, confrimNewPassword } = req.body;

  if (!email || !newPassword || !confrimNewPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (newPassword !== confrimNewPassword) {
    throw new ApiError(500, "Both Password didn't match. Try again");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "NO user found");
  }
  user.password = newPassword;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully", null));
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
