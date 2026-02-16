import {asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js";
import User from "../models/user.model.js";

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

export const registerUser =asyncHandler (async (req, res)=>{
    const {fullName ,email,password ,username,phoneNumber  }=req.body;

    if([username ,password,fullName ].some((field)=>field?.trim()=== "")){
        throw new ApiError (400,"Username ,password and full name are required");

    }

   const existedUser = await User.findOne({
        $or: [{ username }, { email }, { phoneNumber }]
    });

    if (existedUser) {
        throw new ApiError(409, "A user with this username, email, or phone already exists");
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        phoneNumber,
        password,
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Registration failed, please try again");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
})

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
        secure: true
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
        secure:true
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

