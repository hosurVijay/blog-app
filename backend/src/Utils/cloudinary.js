import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadCloudinary = async (filePath) => {
  try {
    if (!filePath) {
      console.log("File path required");
      return null;
    }
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(filePath);
    return response;
  } catch (error) {
    console.log("Failed to upload.");
    fs.unlinkSync(filePath);
  }
};

export { uploadCloudinary };
