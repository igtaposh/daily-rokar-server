import mongoose from "mongoose";

const CashManagementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    name: {
      type: String,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      default: "cash-in",
      enum: ["cash-in", "cash-out"],
    },
    method: {
      type: String,
      default: "cash",
      enum: ["cash", "online"],
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("CashManagement", CashManagementSchema);
