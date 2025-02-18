import { app } from "./app.js";
import connectDB from "./db/dbConnect.js";
import dotenv from "dotenv"; // always try to import and configure dotenv package as soon as possible so as to make sure that the environmental variables are available in the files.

dotenv.config({
  path: "./.env", //when we are defining the path of th .env file, we are giving it refernce with respect to the root of the application, so we are using "./.env" instead of "../.env"

  //IMPORTANT NOTE: Also in the official documents, dotenv configuration is not mentioned for modular importy syntax, and we have to some configuration in the package.json file as well for the complete configurations.
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 4000, () => {
      console.log(`The server is listening at port: ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MONGODB connection failed!!", error);
  });
