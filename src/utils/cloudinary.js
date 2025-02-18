import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//We will be using cloudinary to store our media files like profile pictures and videos. We will be getting their URLS from the cloudinary that will be stored in database.

//We will be first taking the files uploaded on the server by the user and storing it in our local storage. Then we will be sending these files to the cloudinary. After the files are successfully stored in cloudinary, we will remove these files from our local storage.

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadONCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null; //if there is no localFilePath in the directory, then run this condition.
    const response = await cloudinary.uploader //uploading on cloudinary from the local storage.
      .upload(localFilePath, {
        resource_type: "auto",
      });
    console.log(
      "The file was successfully uploaded on cloudinary",
      response.url
    );
    return response;
  } catch (error) {
    fs.unlink(localFilePath); //remove the file from the local storage if there has any error occurred to make sure that there are no malfunctioning file and to make sure that we don't have two files with the same name when the user trys to upload the same file again.
  }
};

export { uploadOnCloudinary };
