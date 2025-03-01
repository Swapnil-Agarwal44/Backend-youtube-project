import mongoose, { connect } from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`
    ); // assignment is to console.log connectionInstance to know more about this thing.
  } catch (error) {
    console.log(
      "There was some error while connecting to the mongoDB database: ",
      error
    );
    process.exit(1); //this command is given by directly node, so there is no need to install any packages for this command. It treats every function as an exit, and it will handle any of the error through the exit code given in the command. Read the official documents for more information.
  }
};

export default connectDB;
