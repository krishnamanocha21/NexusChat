import mongoose from "mongoose";

import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileUrl: { type: String },
  bio: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isBot: { type: Boolean, default: false },
  refreshToken: { type: String },
}, { timestamps: true });




userSchema.pre("save",async function (){
  if(!this.isModified("password"))return ;
  this.password =await bcrypt.hash(this.password,10);
  
})

userSchema.methods.isPasswordCorrect =async function(password){
  return await  bcrypt.compare(password ,this.password)
}

userSchema.methods.generateAccessToken =function (){
  return jwt.sign(
    {
      _id:this.id,
      email:this.email,
      fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken =function (){
  return jwt.sign(
    {
      _id:this.id,
      email:this.email,
      fullName:this.fullName
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

const User = mongoose.model("User", userSchema);
export default User;