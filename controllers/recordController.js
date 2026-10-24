import RecordModel from "../models/RecordModel.js";
import UserModel from "../models/UserModel.js";

export const createRecord = async (req, res) => {
  const userId = req.user.id;
  const { amount, payment = "Cash", category, description, type } = req.body;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }

    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        message: "Description is required to fill.",
        success: false,
      });
    }
    if (description.trim().length < 3 || description.trim().length > 50) {
      return res.status(400).json({
        message: "Description must be between 3 and 50 characters long",
        success: false,
      });
    }
    const recordAmount = Number(amount);
    if (!Number.isFinite(recordAmount) || recordAmount <= 0) {
      return res.status(400).json({
        message: "Please enter a valid amount.",
        success: false,
      });
    }

    const normalizedType =
      typeof type === "string" ? type.trim().toLowerCase() : "";
    if (!["sale", "expense"].includes(normalizedType)) {
      return res.status(400).json({
        message: "Record type must be sale or expense.",
        success: false,
      });
    }

    const normalizedPayment =
      typeof payment === "string" ? payment.trim().toLowerCase() : "";
    if (!["cash", "online"].includes(normalizedPayment)) {
      return res.status(400).json({
        message: "Payment method must be Cash or Online.",
        success: false,
      });
    }

    if (typeof category !== "string" || category.trim().length < 3) {
      return res.status(400).json({
        message: "Please enter a valid category.",
        success: false,
      });
    }

    const newRecord = new RecordModel({
      userId,
      description: description.trim(),
      category: category.trim(),
      payment: normalizedPayment === "cash" ? "Cash" : "Online",
      amount: recordAmount,
      type: normalizedType,
    });
    const amountDelta =
      normalizedType === "sale" ? recordAmount : -recordAmount;
    const balanceField = normalizedPayment === "cash" ? "rokar" : "rokarOnline";
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { [balanceField]: amountDelta } },
      { new: true, projection: { rokar: 1, rokarOnline: 1 } },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    try {
      await newRecord.save();
    } catch (error) {
      try {
        await UserModel.updateOne(
          { _id: userId },
          { $inc: { [balanceField]: -amountDelta } },
        );
      } catch (rollbackError) {
        console.error(
          "Failed to roll back balance after record creation error:",
          rollbackError,
        );
      }
      throw error;
    }

    return res.status(201).json({
      message: "Sale record created successfully.",
      success: true,
      newRecord,
      user: {
        rokar: updatedUser.rokar,
        rokarOnline: updatedUser.rokarOnline,
      },
    });
  } catch (error) {
    console.error("Unable to create record:", error);
    return res
      .status(500)
      .json({ message: "Unable to create any record.", success: false });
  }
};

export const deleteRecord = async (req, res) => {
  const userId = req.user.id;
  const recordId = req.params.recordId;

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }

    if (!recordId) {
      return res
        .status(400)
        .json({ message: "Invalid record id", success: false });
    }

    const record = await RecordModel.findOne({ _id: recordId, userId });

    if (!record) {
      return res
        .status(400)
        .json({ message: "Record not found.", success: false });
    }

    const balanceField = record.payment === "Cash" ? "rokar" : "rokarOnline";
    const amountDelta = record.type === "sale" ? -record.amount : record.amount;

    try {
      await RecordModel.deleteOne({ _id: recordId, userId });
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { [balanceField]: amountDelta } },
        { new: true, projection: { rokar: 1, rokarOnline: 1 } },
      );

      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found.",
          success: false,
        });
      }

      return res.status(200).json({
        message: "Record deleted successfully.",
        success: true,
        user: {
          rokar: updatedUser.rokar,
          rokarOnline: updatedUser.rokarOnline,
        },
      });
    } catch (error) {
      await UserModel.updateOne(
        { _id: userId },
        { $inc: { [balanceField]: -amountDelta } },
      );
      throw error;
    }
  } catch (error) {
    console.error("Unable to delete record:", error);
    return res
      .status(500)
      .json({ message: "Unable to delete any records.", success: false });
  }
};

export const readAllRecords = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      userId: req.user.id,
    };

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

    const sales = await RecordModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
