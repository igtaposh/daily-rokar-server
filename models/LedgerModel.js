import mongoose from "mongoose";

const LedgerSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Customer",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      default: "credit",
    },
    payment: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Ledger", LedgerSchema);
