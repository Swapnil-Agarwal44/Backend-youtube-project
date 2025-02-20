import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

// We will have to generate the access token and refresh token together again and again, that's why we are going to do the same in a function.

const generateAccessTokenAndRefreshToken = async (userID) => {
  try {
    const storedUser = await User.findById(userID);
    const userEmail = storedUser.email;

    const accessToken = storedUser.generateAccessToken();
    const refreshToken = storedUser.generateRefreshToken();

    await User.findOneAndUpdate({ userEmail }, { refreshToken });
    // the above code will work even for the first time login because even if there is no field present initially, findOneAndUpdate will create the field.

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

// series of steps needed to perform register functionality:

// get user details from frontend
// validation - not empty
// check if user already exists: either through username, or email
// check for images, check for avatar
// upload them to cloudinary, avatar
// create user object - create entry in database
// remove password and refresh token field from response
// check for user creation
// return res

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;
  //console.log("email: ", email);

  if (
    [fullName, email, userName, password].some((field) => field.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }
  // In the above code, we have included a condition statement in which we will be checking if we have entered all the fields or not. For that we will be passing an array of all the fields that we have received from the req.body and will use the method of some to check if all the fields are entered correctly or not. If any of the fields is empty, condition will return true and and will throw an error.

  // In the condtional statement, we have used the method of "some()", which works like map and return a boolean value.

  // We can do the same process with the help of map() function, however then we will have to define what we have to return and what is the final return. In the some case, due to its method nature, it was easily done in a simple one line.

  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  // the above code checks if the user already exists on the basis of either userName and email with the help of the operators. This is so that both the emails and userName of the user are unique.

  if (existingUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.avatar[0]?.path;   // Whenever we are trying to optionally select files dependent on the availability, we may encounter some errors (such as undefined). To prevent these errors, we can use traditional conditional check statements.

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // we will check for if we have the access to the files or not and store their local path in our system.

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  // the above code is used to check if the avatar file is successfully uploaded by the user or not.

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar file was not uploaded on Cloudinary");
  }

  // we are again checking if avatar file is successfully uploaded on the cloudinary or not because avatar is a require field, and if it is not uploaded, then it can crash our application.

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // coverImage validation.
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // in the above code, we have tried to find the user that we created using _id and retrieve the information based on our preferences.

  // We will be using select to retrieve the selected information. It's syntax is although weird, because we have to write the fields that we don't required in the string with a negative sign (-) priour to their name because by default all the fields are already selected.

  if (!createdUser) {
    throw new apiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

// series of steps needed to perform login functionality:

// taking email and password from the user.
// finding a user based on email from database and retrieving it if found.
// comparing the password entered by the user with that of the retrieved user password.
// If details are not matched, give error.
// If details are matched, give access token and refresh token to the user.
// Direct the user to the index or home page of the application.

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const storedUser = await User.findOne({ email: email });

  if (!storedUser) {
    throw new apiError(400, "User not found");
  }

  const loginVerification = await storedUser.passwordVerfication(password);

  if (!loginVerification) {
    throw new apiError(400, "password not matched");
  }

  // const accessToken = storedUser.generateAccessToken();
  // const refreshToken = storedUser.generateRefreshToken();

  // if(!accessToken) {
  //   throw new apiError(500, "There was a problem in generating an Access Token");
  // }

  // if(!refreshToken) {
  //   throw new apiError(500, "There was a problem in generating a Refresh Token");
  // }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(storedUser._id);

  const loggedInUser = await User.findById(storedUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  // this object "options" is created to configure the cookies that we will send to the user, so that they cannot be altered or rewrited, they can only be veiwed.

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
  // We will be sending two cookies to the front end that included accessToken and refreshToken.
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshAccessToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new apiError(401, "Unauthorized Access");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new apiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Refresh Token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
