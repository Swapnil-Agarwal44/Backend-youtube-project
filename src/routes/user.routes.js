import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// in the above code, we have to configure our register route in such a way that it will also be able to accept files uploaded through multer.

//Since we have two files that need to be accepted, i.e. - profile, coverImage, we will be using the upload.fields()

//upload has many methods that can be used for differnt purposes. Read the documentation for more information. Also upload.array is a method that is used to accept many files of the same field.

export default router;
