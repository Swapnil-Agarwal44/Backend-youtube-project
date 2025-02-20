import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//any middleware that app is using will have the method of use.
app.use(express.json({ limit: "20kb" })); //this middleware  is used to accept json responses with limit upto 20kb
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes:

//in standard industry pracises, we write import and other statements regarding files separately with that of application configuration.

import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter); // "api/v1/  is  a standard routing address that we use in urls"

export { app };
