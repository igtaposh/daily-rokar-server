import express from "express";
import {
  getUserData,
  deleteUser,
  registerUser,
  sentOtp,
  userEmailVerification,
  userLogin,
  userUpdate,
  verifyOtp,
  userLogout,
  changePassword,
} from "../controllers/userControllers.js";
import { routeProtector } from "../middleware/routeProtector.js";
import otpLimiter from "../middleware/rateLimitor.js";

const router = express.Router();

router.post("/sign-up", registerUser);
router.post("/login", userLogin);
router.post("/logout", userLogout);

router.get("/", routeProtector, getUserData);
router.patch("/update", routeProtector, userUpdate);
router.patch("/update-password", changePassword);
router.post("/sent-otp", otpLimiter, sentOtp);
router.post("/verify-otp", verifyOtp);
router.patch("/update-verified-email", routeProtector, userEmailVerification);
router.patch("/deactivate-account", routeProtector, deleteUser);
export default router;
