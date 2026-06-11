import mongoose from "mongoose";

const { Schema } = mongoose;

const materialUsageSchema = new Schema(
  {
    dailyLog: {
      type: Schema.Types.ObjectId,
      ref: "DailyLog",
      required: true,
      index: true
    },
    material: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true
    },
    qtyUsed: {
      type: Number,
      min: 0,
      required: true
    },
    totalCost: {
      type: Number,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

materialUsageSchema.index({ dailyLog: 1, material: 1 }, { unique: true });

export const MaterialUsage = mongoose.model("MaterialUsage", materialUsageSchema);
