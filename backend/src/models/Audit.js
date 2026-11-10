
import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    website: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      default: "Website Audit",
    },

    audit: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Audit = mongoose.model("Audit", auditSchema);

export default Audit;
