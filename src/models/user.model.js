import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      index: true, // this value is used to make sure that that this model parameter(username) is used for indexing in the mongoDB so as to improve the search results in huge dataset. However this field cannot be implemented in every parameter, so be careful while using it.
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary URL
      required: true,
    },
    coverImage: {
      type: String, //cloudinary URL
    },
    watchHistory: [
      // for these type of data records in the database, we will be using the aggregate functions, which will help in improving the efficiency of managing large data sets in database. The "mongoose-aggregate-paginate-v2" package is installed for these aggregate functions.
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      req: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  // we are using a mongoose middleware "pre" to store the passwords in hashed format in the database. Pre middleware is used to execute a function just before an event, in this case is "save" event.
  if (this.isModified("password")) {
    // this condition makes sure that the password hasing code only executes when the password field is modified in the database.
    this.password = await bcrypt.hash(this.password, 10);
    return next();
  }
  next();
});

//IMP NOTE: In the above code we cannot use arrow function as a callback function, because we don't have any access of "this" in the arrow function. So we have to use normal function configuration only.

userSchema.methods.passwordVerfication = async function (password) {
  // similarly like plugins, we can also define methods for our schemas, using this code. In this we are comparing the password entered by the user with that present in the database.
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
