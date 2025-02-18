import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
// series of steps needed to perform:
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
  console.log("email: ", email);

  if (
    [fullName, email, userName, password].some((field) => field.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }
  // In the above code, we have included a condition statement in which we will be checking if we have entered all the fields or not. For that we will be passing an array of all the fields that we have received from the req.body and will use the method of some to check if all the fields are entered correctly or not. If any of the fields is empty, condition will return true and and will throw an error.

  // In the condtional statement, we have used the method of "some()", which works like map and return a boolean value.

  // We can do the same process with the help of map() function, however then we will have to define what we have to return and what is the final return. In the some case, due to its method nature, it was easily done in a simple one line.

  const existingUser = User.findOne({
    $or: [{ userName }, { email }],
  });

  // the above code checks if the user already exists on the basis of either userName and email with the help of the operators. This is so that both the emails and userName of the user are unique.

  if (existingUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.avatar[0]?.path;

  // we will check for if we have the access to the files or not and store their local path in our system.

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  // the above code is used to check if the avatar file is successfully uploaded by the user or not.

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar file is required");
  }

  // we are again checking if avatar file is successfully uploaded on the cloudinary or not because avatar is a require field, and if it is not uploaded, then it can crash our application.

  const user = User.create({
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

export { registerUser };
