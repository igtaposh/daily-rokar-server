import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [20, "Name must be at most 20 characters long"],
    },
    shopName: {
      type: String,
      required: true,
      minlength: [3, "Shop name must be at least 3 characters long"],
      maxlength: [30, "Shop name must be at most 30 characters long"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long"],
    },
    rokar: {
      type: Number,
      default: 0,
    },
    rokarOnline: {
      type: Number,
      default: 0,
    },
    aeps: {
      type: Number,
      default: 0,
    },
    aepsOnline: {
      type: Number,
      default: 0,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
