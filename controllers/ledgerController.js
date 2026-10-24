import LedgerModel from "../models/LedgerModel.js";
import CustomerModel from "../models/CustomerModel.js";
import UserModel from "../models/UserModel.js";
import RecordModel from "../models/RecordModel.js";
import mongoose from "mongoose";

export const createLedger = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user?.id;
    const { customerId } = req.params;
    const { description, type, payment, amount } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user.",
        success: false,
      });
    }

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID.",
        success: false,
      });
    }

    if (!["credit", "payment"].includes(type)) {
      return res.status(400).json({
        message: "Type must be either credit or payment.",
        success: false,
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" || description.trim().length < 5)
    ) {
      return res.status(400).json({
        message: "Description must contain at least 5 characters.",
        success: false,
      });
    }

    if (
      amount === "" ||
      amount === null ||
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 1
    ) {
      return res.status(400).json({
        message: "Please enter a valid amount.",
        success: false,
      });
    }

    const recordAmount = Number(amount);
    let normalizedPayment;

    if (type === "payment") {
      normalizedPayment =
        typeof payment === "string" ? payment.trim().toLowerCase() : "";

      if (!["cash", "online"].includes(normalizedPayment)) {
        return res.status(400).json({
          message: "Payment method must be cash or online.",
          success: false,
        });
      }
    }

    let newLedger;
    let updatedBalance;

    await session.withTransaction(async () => {
      const customer = await CustomerModel.findOne({
        _id: customerId,
        userId,
      }).session(session);

      if (!customer) {
        const error = new Error("Customer not found.");
        error.statusCode = 404;
        throw error;
      }

      // Credit increases the amount owed.
      // Payment reduces the amount owed.
      const balanceChange = type === "credit" ? recordAmount : -recordAmount;

      const updatedCustomer = await CustomerModel.findOneAndUpdate(
        { _id: customerId, userId },
        {
          $inc: { amountBalance: balanceChange },
          $push: { ledgers: { $each: [] } },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!updatedCustomer) {
        const error = new Error("Customer not found.");
        error.statusCode = 404;
        throw error;
      }

      newLedger = new LedgerModel({
        description:
          description?.trim() ||
          (type === "credit"
            ? `Credit given to ${customer.name}`
            : `Credit repaid by ${customer.name}`),
        type,
        payment: normalizedPayment
          ? normalizedPayment === "cash"
            ? "Cash"
            : "Online"
          : undefined,
        amount: recordAmount,
        userId,
        customerId: customer._id,
      });

      await newLedger.save({ session });

      // Add the ledger reference to the customer.
      await CustomerModel.updateOne(
        { _id: customerId, userId },
        { $push: { ledgers: newLedger._id } },
        { session },
      );

      // Only repayments increase the user's cash/online balance.
      if (type === "payment") {
        const balanceField =
          normalizedPayment === "cash" ? "rokar" : "rokarOnline";

        const updatedUser = await UserModel.findByIdAndUpdate(
          userId,
          { $inc: { [balanceField]: recordAmount } },
          { new: true, session },
        );

        if (!updatedUser) {
          const error = new Error("User not found.");
          error.statusCode = 404;
          throw error;
        }

        const newRecord = new RecordModel({
          type: "sale",
          payment: normalizedPayment === "cash" ? "Cash" : "Online",
          amount: recordAmount,
          description: `Credit repaid by ${customer.name}`,
          category: "Credit Repayment",
          userId,
        });

        await newRecord.save({ session });
      }

      updatedBalance = updatedCustomer.amountBalance;
    });

    return res.status(201).json({
      message: "New ledger created successfully.",
      success: true,
      newLedger,
      amountBalance: updatedBalance,
    });
  } catch (error) {
    console.error("Create ledger error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Internal server error.",
      success: false,
    });
  } finally {
    await session.endSession();
  }
};
export const allLedgers = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.id;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }
    if (!customerId) {
      return res
        .status(400)
        .json({ message: "Invalid customer ID", success: false });
    }

    const ledgers = await LedgerModel.find({
      userId,
      customerId,
    });

    return res.status(200).json({
      message: "Ledgers fetched successfully.",
      success: true,
      ledgers,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
export const deleteLedger = async (req, res) => {
  const { ledgerId } = req.params;
  const userId = req.user.id;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }
    if (!ledgerId) {
      return res
        .status(400)
        .json({ message: "Invalid ledger ID", success: false });
    }

    const deletedLedger = await LedgerModel.findOneAndDelete({
      userId,
      _id: ledgerId,
    });
    if (!deletedLedger) {
      return res
        .status(404)
        .json({ message: "Ledger not found.", success: false });
    }
    const amount =
      deletedLedger.type === "credit"
        ? deletedLedger.amount
        : -deletedLedger.amount;
    await CustomerModel.findOneAndUpdate(
      {
        _id: deletedLedger.customerId,
        userId,
      },
      { $inc: { amountBalance: amount } },
      {
        new: true,
        runValidators: true,
      },
    );
    return res.status(200).json({
      message: "Ledger deleted successfully.",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
