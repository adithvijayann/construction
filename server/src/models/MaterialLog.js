import mongoose from "mongoose";

const { Schema } = mongoose;

export const MATERIAL_LOG_PERIODS = ["daily", "monthly"];

const materialLogSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    usagePeriod: {
      type: String,
      enum: MATERIAL_LOG_PERIODS,
      default: "daily",
      index: true
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

export const MaterialLog = mongoose.model("MaterialLog", materialLogSchema);
