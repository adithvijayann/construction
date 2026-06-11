import mongoose from "mongoose";

const { Schema } = mongoose;

const workerSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    trade: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    dailyWage: {
      type: Number,
      required: true,
      min: 0
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

workerSchema.index({ project: 1, name: 1 });

export const Worker = mongoose.model("Worker", workerSchema);
