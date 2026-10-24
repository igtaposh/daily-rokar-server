import mongoose from "mongoose";

const RecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "Retail Sales",
    },
    payment: {
      type: String,
      default: "Cash",
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      default: "Cash Sale",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Record", RecordSchema);
