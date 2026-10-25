import CashManagementModel from "../models/CashManagementModel.js";
import UserModel from "../models/UserModel.js";
import mongoose from "mongoose";

export const createCMS = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { amount, type, name, description, method } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user.",
        success: false,
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Please enter a valid name.",
        success: false,
      });
    }

    if (
      description !== undefined &&
      description !== "" &&
      (typeof description !== "string" || description.trim().length < 5)
    ) {
      return res.status(400).json({
        message: "Please enter a valid description.",
        success: false,
      });
    }

    const transactionAmount = Number(amount);

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(transactionAmount) ||
      transactionAmount <= 0
    ) {
      return res.status(400).json({
        message: "Please enter a valid amount.",
        success: false,
      });
    }

    if (!["cash-in", "cash-out"].includes(type)) {
      return res.status(400).json({
        message: "Transaction type must be cash-in or cash-out.",
        success: false,
      });
    }

    if (!["cash", "online"].includes(method)) {
      return res.status(400).json({
        message: "Method must be cash or online.",
        success: false,
      });
    }

    const balanceField = method === "cash" ? "aeps" : "aepsOnline";

    const balanceDelta =
      type === "cash-in" ? transactionAmount : -transactionAmount;

    const newCMS = new CashManagementModel({
      userId,
      type,
      amount: transactionAmount,
      name: name.trim(),
      description: description?.trim() || "",
      method,
    });

    // Update the user's balance first.
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { [balanceField]: balanceDelta } },
      {
        new: true,
        projection: { aeps: 1, aepsOnline: 1 },
        runValidators: true,
      },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    try {
      await newCMS.save();
    } catch (saveError) {
      await UserModel.updateOne(
        { _id: userId },
        { $inc: { [balanceField]: -balanceDelta } },
      );

      throw saveError;
    }

    return res.status(201).json({
      message: "CMS transaction created successfully.",
      success: true,
      newCMS,
      user: {
        aeps: updatedUser.aeps,
        aepsOnline: updatedUser.aepsOnline,
      },
    });
  } catch (error) {
    console.error("Unable to create CMS transaction:", error);

    return res.status(500).json({
      message: "Unable to create CMS transaction.",
      success: false,
    });
  }
};
export const getAllCMS = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user.",
        success: false,
      });
    }

    const transactions = await CashManagementModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "CMS transactions fetched successfully.",
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Unable to fetch CMS transactions:", error);

    return res.status(500).json({
      message: "Unable to fetch CMS transactions.",
      success: false,
    });
  }
};
export const deleteCMS = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { cmsId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user.",
        success: false,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cmsId)) {
      return res.status(400).json({
        message: "Invalid CMS transaction ID.",
        success: false,
      });
    }

    // Find only a transaction belonging to the logged-in user.
    const transaction = await CashManagementModel.findOne({
      _id: cmsId,
      userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "CMS transaction not found.",
        success: false,
      });
    }

    const { amount, type, method } = transaction;

    if (
      !["cash-in", "cash-out"].includes(type) ||
      !["cash", "online"].includes(method) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid transaction data. Cannot safely reverse balance.",
        success: false,
      });
    }

    const balanceField = method === "cash" ? "aeps" : "aepsOnline";

    // Reverse the original transaction.
    const balanceDelta = type === "cash-in" ? -Number(amount) : Number(amount);

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { [balanceField]: balanceDelta } },
      {
        new: true,
        projection: { aeps: 1, aepsOnline: 1 },
      },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    try {
      await CashManagementModel.deleteOne({
        _id: cmsId,
        userId,
      });
    } catch (deleteError) {
      await UserModel.updateOne(
        { _id: userId },
        { $inc: { [balanceField]: -balanceDelta } },
      );

      throw deleteError;
    }

    return res.status(200).json({
      message: "CMS transaction deleted successfully.",
      success: true,
      deletedTransactionId: cmsId,
      user: {
        aeps: updatedUser.aeps,
        aepsOnline: updatedUser.aepsOnline,
      },
    });
  } catch (error) {
    console.error("Unable to delete CMS transaction:", error);

    return res.status(500).json({
      message: "Unable to delete CMS transaction.",
      success: false,
    });
  }
};
