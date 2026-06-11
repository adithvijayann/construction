import mongoose from "mongoose";

const { Schema } = mongoose;

export const LOG_PERIODS = ["daily", "monthly"];

const workerLogSchema = new Schema(
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
    workerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    salary: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    paymentType: {
      type: String,
      enum: LOG_PERIODS,
      required: true
    },
    logPeriod: {
      type: String,
      enum: LOG_PERIODS,
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

export const WorkerLog = mongoose.model("WorkerLog", workerLogSchema);
