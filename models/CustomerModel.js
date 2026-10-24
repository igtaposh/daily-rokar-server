import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    amountBalace: {
      type: Number,
      default: 0,
    },
    ledgers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ledger",
        required: true,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Customer", CustomerSchema);
