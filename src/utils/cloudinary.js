 import {v2 as cloudinary} from 'cloudinary';
 import fs from 'fs';

 cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadOnCloudinary = async(localFilePath) => {
        try {
            if(!localFilePath) return null;

            // Upload the file on Cloudinary
            const response= await cloudinary.uploader.upload(localFilePath, {
                resource_type: 'auto',
            })
            fs.unlinkSync(localFilePath); // Delete the local file after successful upload
            return response;
        } catch (error) {
            console.log('Error uploading file to Cloudinary:', error);
            fs.unlinkSync(localFilePath); // Delete the local file if upload fails
            return null;
        }
    }

    export { uploadOnCloudinary };