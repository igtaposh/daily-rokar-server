import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

export const routeProtector = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res
      .status(401)
      .json({ message: "no token provided", success: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "isEmailVerified isActive",
    );
    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized access", success: false });
    }
    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Account not verified", success: false });
    }
    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: "Account is deactivated", success: false });
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized access", success: false });
    }
    return next(error);
  }
};
