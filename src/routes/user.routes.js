import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifiedJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser);

//secured routes

router.route("/logout").post(verifiedJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-avatar").post(verifiedJWT, upload.single("avatar"), updateUserAvatar);
router.route("/update-coverImage").post(verifiedJWT, upload.single("Cover-Image"), updateUserCoverImage);

export default router;
