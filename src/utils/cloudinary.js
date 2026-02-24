 import {v2 as cloudinary} from 'cloudinary';
 import fs from 'fs';
 import path from 'path';

 cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadOnCloudinary = async(localFilePath) => {
        try {
            if(!localFilePath) return null;

            // Check if file exists before uploading
            if(!fs.existsSync(localFilePath)) {
                console.log(`File not found at path: ${localFilePath}`);
                return null;
            }

            // Upload the file on Cloudinary
            const response= await cloudinary.uploader.upload(localFilePath, {
                resource_type: 'auto',
            })
            // Delete the local file after successful upload
            if(fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
            return response;
        } catch (error) {
            console.log('Error uploading file to Cloudinary:', error);
            // Delete the local file if upload fails (if it exists)
            if(fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
            return null;
        }
    }

    export { uploadOnCloudinary };