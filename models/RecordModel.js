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
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [20, "Name must be at most 20 characters long"],
    },
    category: {
      type: String,
      default: "Retail Sales",
      minlength: [3, "Shop name must be at least 3 characters long"],
      maxlength: [30, "Shop name must be at most 30 characters long"],
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
