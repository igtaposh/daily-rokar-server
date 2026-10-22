import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import Otp from "../models/OtpModel.js";
import User from "../models/UserModel.js";
import { sendRegistrationOTP } from "../utils/sentEmailOtp.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const getSaltRounds = () => {
  const saltRounds = Number.parseInt(process.env.SALT_ROUNDS, 10);
  return Number.isInteger(saltRounds) && saltRounds >= 4 ? saltRounds : 12;
};

export const sentOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  try {
    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email", success: false });
    }
    const otp = randomInt(100000, 1000000).toString();
    await sendRegistrationOTP(email, otp);
    await Otp.findOneAndUpdate(
      { email },
      { email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      message: "Verification code sent successfully.",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to send verification code.", success: false });
  }
};
export const verifyOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  try {
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Enter a valid email and 6-digit code.",
        success: false,
      });
    }
    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email", success: false });
    }
    const otpRecord = await Otp.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() },
    });
    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid or expired verification code.",
        success: false,
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { isEmailVerified: true },
      { new: true, runValidators: true },
    );
    if (!user) {
      return res.status(404).json({
        message: "No account exists for this email.",
        success: false,
      });
    }
    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      message: "Email verified successfully",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to verify email.", success: false });
  }
};
export const registerUser = async (req, res) => {
  const { name, shopName, email, password } = req.body ?? {};
  try {
    const normalizedEmail = normalizeEmail(email);
    if (
      typeof name !== "string" ||
      typeof shopName !== "string" ||
      typeof password !== "string" ||
      !normalizedEmail
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all the fields", success: false });
    }
    if (name.trim().length < 3 || name.trim().length > 20) {
      return res.status(400).json({
        message: "Name must be between 3 and 20 characters long",
        success: false,
      });
    }
    if (shopName.trim().length < 3 || shopName.trim().length > 30) {
      return res.status(400).json({
        message: "Shop name must be between 3 and 30 characters long",
        success: false,
      });
    }
    if (!emailPattern.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email", success: false });
    }
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
        success: false,
      });
    }
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User already exists. Please login or use a different email to register.",
        success: false,
      });
    }
    const passwordHash = await bcrypt.hash(password, getSaltRounds());
    const newUser = new User({
      name: name.trim(),
      shopName: shopName.trim(),
      email: normalizedEmail,
      password: passwordHash,
      isEmailVerified: false,
    });
    await newUser.save();

    return res.status(201).json({
      message:
        "User created successfully, Please verify your email there after",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Unable to create account.", success: false });
  }
};
export const userLogin = async (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  try {
    if (!normalizedEmail || typeof password !== "string" || !password) {
      return res
        .status(400)
        .json({ message: "Please fill all the fields", success: false });
    }
    if (!emailPattern.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email", success: false });
    }
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
        success: false,
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: "Invalid Credintials.",
        success: false,
      });
    }

    const comparedPassword = await bcrypt.compare(password, user.password);

    if (!comparedPassword) {
      return res.status(401).json({
        message: "Email id or password is incorrect.",
        success: false,
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        message: "This account is deactivated.",
        success: false,
      });
    }
    if (!user.isEmailVerified) {
      return res.status(400).json({
        message:
          "Your email is not verified please verify you email to continue.",
        success: false,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Authentication is not configured.",
        success: false,
      });
    }
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        shopName: user.shopName,
        email: user.email,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    return res.status(200).json({
      message: "Logged in successfully.",
      success: true,
      user: {
        id: user._id,
        name: user.name,
        shopName: user.shopName,
        email: user.email,
        rokar: user.rokar,
        rokarOnline: user.rokarOnline,
        cms: user.cms,
        cmsOnline: user.cmsOnline,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
      },
      token,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to log in.", success: false });
  }
};
export const userLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res
      .status(200)
      .json({ message: "Logout successful", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};
export const userEmailVerification = async (req, res) => {
  const id = req.user.id;
  try {
    if (!id) {
      return res
        .status(400)
        .json({ message: "Use an valid ID.", success: false });
    }
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isEmailVerified: true },
      { new: true, runValidators: true },
    );
    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User not found.", success: false });
    }
    return res.status(200).json({
      message: "Email verified successfully.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update email verification.",
      success: false,
    });
  }
};

export const userUpdate = async (req, res) => {
  const { name, shopName, password, rokar, rokarOnline, aeps, aepsOnine } =
    req.body ?? {};
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(400).json({
        message: "A valid user ID is required.",
        success: false,
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    const updates = {};

    // Validate and compare name
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 3 ||
        name.trim().length > 20
      ) {
        return res.status(400).json({
          message: "Name must be between 3 and 20 characters long.",
          success: false,
        });
      }

      const trimmedName = name.trim();

      if (trimmedName === user.name) {
        return res.status(400).json({
          message: "New name must be different from the current name.",
          success: false,
        });
      }

      updates.name = trimmedName;
    }

    // Validate and compare shop name
    if (rokar !== undefined) {
      if (typeof rokar !== Number || rokar.length <= 0) {
        return res.status(400).json({
          message: "Enter a valid Amount",
          success: false,
        });
      }

      updates.rokar = rokar;
    }
    if (rokarOnline !== undefined) {
      if (typeof rokarOnline !== Number || rokarOnline.length <= 0) {
        return res.status(400).json({
          message: "Enter a valid Amount",
          success: false,
        });
      }

      updates.rokarOnline = rokarOnline;
    }
    if (aeps !== undefined) {
      if (typeof aeps !== Number || aeps.length <= 0) {
        return res.status(400).json({
          message: "Enter a valid Amount",
          success: false,
        });
      }

      updates.aeps = aeps;
    }
    if (aepsOnine !== undefined) {
      if (typeof aepsOnine !== Number || aepsOnine.length <= 0) {
        return res.status(400).json({
          message: "Enter a valid Amount",
          success: false,
        });
      }

      updates.aepsOnine = aepsOnine;
    }

    if (shopName !== undefined) {
      if (
        typeof shopName !== "string" ||
        shopName.trim().length < 3 ||
        shopName.trim().length > 30
      ) {
        return res.status(400).json({
          message: "Shop name must be between 3 and 30 characters long.",
          success: false,
        });
      }

      const trimmedShopName = shopName.trim();

      if (trimmedShopName === user.shopName) {
        return res.status(400).json({
          message:
            "New shop name must be different from the current shop name.",
          success: false,
        });
      }

      updates.shopName = trimmedShopName;
    }
    // Validate and compare password
    if (password !== undefined) {
      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 128
      ) {
        return res.status(400).json({
          message: "Password must be between 8 and 128 characters long.",
          success: false,
        });
      }

      const isSamePassword = await bcrypt.compare(password, user.password);

      if (isSamePassword) {
        return res.status(400).json({
          message: "New password must be different from the current password.",
          success: false,
        });
      }

      updates.password = await bcrypt.hash(password, getSaltRounds());
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No updates provided.",
        success: false,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      message: "User details updated successfully.",
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update user details.",
      success: false,
    });
  }
};

export const changePassword = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "Invalid Credintials.",
        success: false,
      });
    }
    if (password !== undefined) {
      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 128
      ) {
        return res.status(400).json({
          message: "Password must be between 8 and 128 characters long.",
          success: false,
        });
      }

      const isSamePassword = await bcrypt.compare(password, user.password);

      if (isSamePassword) {
        return res.status(400).json({
          message: "New password must be different from the current password.",
          success: false,
        });
      }

      const newPassword = await bcrypt.hash(password, getSaltRounds());
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { password: newPassword } },
        {
          new: true,
          runValidators: true,
        },
      );
      if (!updatedUser) {
        return res.status(400).json({
          message: "Something went wrong...",
          success: false,
        });
      }

      return res.status(200).json({
        message: "User password changed successfully.",
        success: true,
        user,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update user password.",
      success: false,
    });
  }
};
export const getUserData = async (req, res) => {
  const id = req.user.id;
  try {
    if (!id) {
      return res
        .status(400)
        .json({ message: "Use an valid ID.", success: false });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found.", success: false });
    }
    return res.status(200).json({
      message: "User details fetched successfully.",
      success: true,
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to fetch user details.", success: false });
  }
};
export const deleteUser = async (req, res) => {
  const id = req.user.id;
  try {
    if (!id) {
      return res
        .status(400)
        .json({ message: "Use an valid ID.", success: false });
    }
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).select("-password");
    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User not found.", success: false });
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(200).json({
      message: "User account deactivated successfully.",
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to deactivate account.", success: false });
  }
};
