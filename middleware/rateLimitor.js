import rateLimit from "express-rate-limit";

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 4,
  message: "Too many OTP requests. Try again later.",
});

export default otpLimiter;
