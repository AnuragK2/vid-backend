import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import User from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //update the user with refresh token in db
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
    }
};


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

const loginUser= asyncHandler(async (req, res) => {

    //req body-> data
    const { username, email, password } = req.body;
    //username or email, password
    if(!password || password.trim() === ""){
        throw new ApiError(400, "Password is required");
    }

    if((!username || username.trim() === "") && (!email || email.trim() === "")){
        throw new ApiError(400, "Username or email is required");
    }
    //find the user
    const user = await User.findOne({
        $or: [
            { email: email },
            { username: username }
        ]
    });

    if(!user){
        throw new ApiError(404, "User not found with this email or username");
    }
    //password comparison
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials");
    }

    //generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    //set cookies with access and refresh tokens
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    if(!loggedInUser){
        throw new ApiError(500, "Failed to fetch user after login");
    }
    const options = {
        httpOnly: true,
        secure: true,
    };

    //return response with access token and user details
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200,{
        user: loggedInUser, accessToken,refreshToken
    },"User logged in successfully"));    
    
});


const logoutUser = asyncHandler(async (req, res) => {
    //get user id from req.user
   const user = await User.findByIdAndUpdate(req.user._id,{
    $set:{
        refreshToken: undefined
    }
   })
   const options = {
        httpOnly: true,
        secure: true,
    };

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken= asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if(incomingRefreshToken){
        throw new ApiError(401, "unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is not expired or invalid");
        }
        
        const options = {   
            httpOnly: true,
            secure: true,
        };
        
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(new ApiResponse(200,{ accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
    
});

export { registerUser , loginUser, logoutUser, refreshAccessToken};