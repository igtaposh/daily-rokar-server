import mongoose from "mongoose";

const AepsSchema = new mongoose.Schema(
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
    adharNumber: {
      type: String,
    },

    type: {
      type: String,
      default: "withdrawal",
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("AEPS", AepsSchema);
