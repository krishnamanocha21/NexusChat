import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file from local storage to Cloudinary
 * @param {string} localFilePath - Path to the file stored by Multer
 */
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Automatically detects if it's an image, video, or raw file
      folder: "nexus_chat_assets"
    });

    // File has been uploaded successfully, remove from local server
    fs.unlinkSync(localFilePath);
    return response;

  } catch (error) {
    // Remove the locally saved temporary file if the upload operation failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload failed:", error);
    return null;
  }
};

/**
 * Delete a file from Cloudinary using publicId
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary deletion failed:", error);
    return null;
  }
};
export const deleteBatchFromCloudinary = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) return null;
    
    // Cloudinary allows max 100 IDs per request
    return await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error("Bulk deletion failed:", error);
    return null;
  }
};