import { User, User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password Changed Successfully "));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new apiError(400, "All fields are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new apiError(400, "Error while uploading on avatar");
  }

  const existingAvatarURL = await User.findById(req.user._id, "avatar");
  //"existingAvatarURL" will be an object containg the id and avatar of the user.

  console.log(existingAvatarURL);

  const result = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (avatar && result) {
    const deleteResult = await deleteFromCloudinary(existingAvatarURL.avatar);

    if (deleteResult) {
      return res
        .status(200)
        .json(
          new apiResponse(
            200,
            deleteResult,
            "Avatar Image updated successfully"
          )
        );
    } else {
      return new apiError(
        400,
        "Something went wrong while deleting Previous Avatar Image"
      );
    }
  } else {
    return new apiError(
      400,
      "Something went wrong while updating Avatar Image"
    );
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover Image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new apiError(400, "Error while uploading on cover image ");
  }

  const existingCoverImage = await User.findById(req.user._id, "coverImage");

  const result = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!result)
    throw new apiError(
      500,
      "Error while updating the new cover image on the database"
    );

  if (!existingCoverImage) {
    return res
      .status(200)
      .json(new apiResponse(200, result, "Cover Image updated successfully"));
  } else if (existingCoverImage) {
    const deleteResult = await deleteFromCloudinary(
      existingCoverImage.coverImage
    );

    if (deleteResult) {
      return res
        .status(200)
        .json(new apiResponse(200, deleteResult, "Cover Image updated successfully"));
    } else {
      return new apiError(
        400,
        "Something went wrong while deleting Previous Cover Image"
      );
    }
  } else {
    return new apiError(400, "Something went wrong while updating Cover Image");
  }
});

const getUserChannelDetails = asyncHandler(async (req, res) => {

  // In this function, we will extract the details of the channel that will be sent and displayed on the front end, like username, channel name, subsribers count, subribed channels count, etc.

  // We will be using the aggregation pipeleines to extract the details of the channel like subscribers count and subscribedToChannels count. 

  const  {userName} = req.params;

  if(!userName?.trim()){
    throw new apiError(400, "Username is required")
  }

  //Now we will be using aggregate pipelines to find the user channel based on it's username and will calculate its subscribers count and subscribed channels count.

  const channel = User.aggregate([
    {
      $match: {
        userName: userName?.toLowerCase()
      } // in this pipeline, we are extracting the channel information using the userName. We can do the same using find() method, however, we are using pipeline to make a consistent code
    }, 
    {
      $lookup: {
        from: "subscriptions", //IMPORTANT NOTE: in the mongoDb, the model name is converted to lower case and is made plural. 
        localField: "_id",
        foreignField: "channel", 
        as: "subscribers"
      } // this pipeline works as a join operation, joining a field (column) in the user document containing the subscribers of the user 
    }, 
    {
      $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "subscriber", 
      as: "subscribedTo"
    }}, // this pipeline works as a join operation, joining a field (column) in the user document containing the subscribed channels of the user

    //IMPORTANT NOTE: Pipelines work on the data passed by the previous pipeline. However there are some pipelines that doesn't modify data, i.e., can only add fields on the data that is passed on them. They include "$lookup", "$addfields", "$set", "$project", etc. So that is the reason the second "$lookup" was able to work independently of the first lookup.
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers"
        }, // this will add a new field which will contain the total count of the user's subscribers.
        channelSubscribedToCount: {
          $size: "subscribedTo"
        }, // this will add a new field which will contain the total count of the user's subscribed channels.
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }// this will add a new field which will contain the boolean value depending if the client has subscribed to the user or not. This value will be used in the front end (react state management). Any client that will view the user's channel, will receive this value. If it is true, then the button beside the channel picture will show "subscribed" button, otherwise it will show "Click to subscribe" button.
      }
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscriberCount: 1, 
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1, 
        email: 1
      } // this pipeline is used to send a limited, and only important data to the front end.
    }
  ]);

  if (!channel?.length){
    throw new apiError(404, "channel does not exist")
  }

  return res.status(200).json(new apiResponse(200, channel[0], "User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
  const User = User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user._id) // IMPORTANT NOTE : In this code, we are trying to find the details of the user whose search history we want. However, the reason why we are passing the user's id in "mongoose.Types.ObjectId" is becasue "req.user._id" contains the string of the mongoDB_id. When we are using mongoose.Schema to extract or to comapre these ids, mongoose internally configure these strings to that of the mongoDB ids. However, in the case of pipelines, we must convert these id strings explicitly into their mongoDB id like this.
      }
    }, {
      $lookup: {
        from: "videos", 
        localField: "watchHistory", 
        foreignField: "_id", 
        as: "watchHistory", 
        pipeline: [ // from the previous pipeline, we are connecting the user's document with that of it's watchHistory videos on the basis of watchVideo_id. However, by doing so, we will only get the videos information, not their owner's information because their owner sections contains user_id of the owner. We need a sub-pipeline for getting the user information as soon as we are getting the videos information.
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id", 
              as: "owner", 
              pipelien: [
                {
                  $project: {
                    fullName: 1, 
                    userName: 1, 
                    avatar: 1
                  }
                }
              ]
            }
          }, 
          {
            $addFields: {
              owner: {
                $first: "$owner"
              } //IMPORTANT NOTE:  this sub-pipeline is used because as we know whenever we are getting data from pipeline or sub-pipeline, we are getting it in the form of array, if it contains only one object. So to make things easier for the front end development, we are already storing the data of owner, that is stored in the first field of the array, in the field of the same name to overwrite it. Because of this, the front end will only receive the data in the form of the object directly, not in the form of array.
            }
          }
        ]
      }
    }
  ]);

  return res.status(200).json(new apiResponse(200, user[0].getWatchHistory, "watch history fetched successfully"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelDetails,
  getWatchHistory
};
