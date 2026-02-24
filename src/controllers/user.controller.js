import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import User from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
        //get user details from frontend
        const { fullName, email, username, password } = req.body;

        //validate user details- not empty
        if(
            [fullName, email, username, password].some(field => !field || field.trim() === "")
        ){
            throw new ApiError(400, "All fields are required");
        }

        if(password.length < 8){
            throw new ApiError(400, "Password must be at least 8 characters long");
        }

        if(email.indexOf("@") === -1){
            throw new ApiError(400, "Invalid email address");
        }

        if(username.length < 6){
            throw new ApiError(400, "Username must be at least 6 characters long");
        }

        if(username.indexOf(" ") !== -1){
            throw new ApiError(400, "Username cannot contain spaces");
        }

        //check if user already exists: username or email

        const existingUser = await User.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        });

        if(existingUser){
            throw new ApiError(409, "User with this email or username already exists");
        }

        //check for images, check for avatar
        const avatarLocalPath = req.files?.avatar[0]?.path;
        if(!avatarLocalPath){
            throw new ApiError(400, "Avatar is required");
        }

        //upload them to cloudinary and get the url, avatar
        const avatarUploadResponse = await uploadOnCloudinary(avatarLocalPath);
        if(!avatarUploadResponse){
            throw new ApiError(500, "Failed to upload avatar");
        }

        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
        let coverImage = null;
        if(coverImageLocalPath){
            coverImage = await uploadOnCloudinary(coverImageLocalPath);
            if(!coverImage){
                throw new ApiError(500, "Failed to upload cover image");
            }
        }

        //create user object -create user in database
        const user = await User.create({
            fullname: fullName,
            email,
            username: username.toLowerCase(),
            password,
            avatar: avatarUploadResponse.url,
            coverImage: coverImage?.url || null
        });

        //remove password and refresh token from response
        //check for user creation success
        //return response to frontend
        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if(!createdUser){
            throw new ApiError(500, "Failed to fetch user after creation");
        }
        res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };