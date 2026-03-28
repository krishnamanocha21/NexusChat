import {asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";

const generateAccessAndRefereshTokens =async (userId)=>{
    try{
        const user =await User.findById(userId);

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken =refreshToken ;
        await user.save({validateBeforeSave :false})
        return {accessToken , refreshToken }
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, username, phoneNumber } = req.body;

    // 1. Validation check
    if ([username, password, fullName, email].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // 2. Prepare the $or query dynamically
    // Only include phoneNumber in the check if it exists!
    const existedUserQuery = [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
    ];

    if (phoneNumber && phoneNumber.trim() !== "") {
        existedUserQuery.push({ phoneNumber });
    }

    const existedUser = await User.findOne({
        $or: existedUserQuery
    });

    if (existedUser) {
        throw new ApiError(409, "User with this username, email, or phone already exists");
    }

    // 3. Create the user
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email: email.toLowerCase(), // Normalize email too!
        phoneNumber: phoneNumber || null, // Explicitly set to null if missing
        password,
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

export const loginUser = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        throw new ApiError(400, "User Credential are required");
    }

    const user  =await User.findOne({
        $or: [{email:identifier },{phoneNumber :identifier },{ username: identifier }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged In successfully"
            )
        );
});


export const logoutUser = asyncHandler(async(req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1
            }

        },
        {
            new:true
        }
    )

    const options ={
        httpOnly:true ,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json (new ApiResponse(200,{},"User logged Out"))
});


export const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
});

export const getAllUsers = asyncHandler(async (req, res) => {
    // Finds all users except the current logged-in user
    const users = await User.find({
        _id: { $ne: req.user._id }
    }).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, users, "Users fetched successfully")
    );
});

