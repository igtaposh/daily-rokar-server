import AepsModel from "../models/AepsModel.js";
import UserModel from "../models/UserModel.js";

export const createTransaction = async (req, res) => {
  const userId = req.user.id;
  const { amount, type, name, adharNumber } = req.body;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }

    if (adharNumber) {
      if (adharNumber.length != 12) {
        return res.status(400).json({
          message: "Please enter a valid Aadhar number",
          success: false,
        });
      }
    }
    if (!name) {
      return res.status(400).json({
        message: "Please enter a valid name",
        success: false,
      });
    }
    const transactionAmount = Number(amount);
    if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
      return res.status(400).json({
        message: "Please enter a valid amount.",
        success: false,
      });
    }

    const normalizedType =
      type === undefined
        ? "withdrawal"
        : typeof type === "string"
          ? type.trim().toLowerCase()
          : "";
    if (!["withdrawal", "deposit"].includes(normalizedType)) {
      return res.status(400).json({
        message: "Transaction type must be withdrawal or deposit.",
        success: false,
      });
    }

    const newAEPS = new AepsModel({
      userId: userId.trim(),
      type: normalizedType,
      amount: transactionAmount,
      name,
      adharNumber,
    });

    const balanceField =
      normalizedType === "withdrawal" ? "aepsOnline" : "aeps";
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { [balanceField]: transactionAmount } },
      { new: true, projection: { aeps: 1, aepsOnline: 1 } },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    try {
      await newAEPS.save();
    } catch (error) {
      try {
        await UserModel.updateOne(
          { _id: userId },
          { $inc: { [balanceField]: -transactionAmount } },
        );
      } catch (rollbackError) {
        console.error(
          "Failed to roll back balance after AEPS transaction creation error:",
          rollbackError,
        );
      }
      throw error;
    }

    return res.status(201).json({
      message: "AEPS transation created successfully.",
      success: true,
      newAEPS,
      user: {
        aeps: updatedUser.aeps,
        aepsOnline: updatedUser.aepsOnline,
      },
    });
  } catch (error) {
    console.error("Unable to create AEPS transaction:", error);
    return res.status(500).json({
      message: "Unable to create any AEPS transation.",
      success: false,
    });
  }
};
export const getAllTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }

    const { startDate, endDate } = req.query;
    const filter = { userId };

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte = new Date(`${startDate}T00:00:00.000+05:30`);
      }

      if (endDate) {
        const nextDay = new Date(`${endDate}T00:00:00.000+05:30`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        filter.createdAt.$lt = nextDay;
      }
    }

    const aeps = await AepsModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "All transactions fetched successfully.",
      success: true,
      aeps,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unble to get any transactions.", success: false });
  }
};
export const deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const transactionId = req.params.transactionId;

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }
    if (!transactionId) {
      return res
        .status(400)
        .json({ message: "Invalid transaction id", success: false });
    }

    const deletedTransaction = await AepsModel.findOneAndDelete({
      _id: transactionId,
      userId,
    });
    if (!deletedTransaction) {
      return res
        .status(400)
        .json({ message: "Aeps transaction not found.", success: false });
    }
    return res.status(200).json({
      message: "Aeps transaction deleted successfully.",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to delete any transaction.", success: false });
  }
};
