import mongoose from "mongoose";

const { Schema } = mongoose;

export const DAILY_LOG_STATUSES = ["draft", "submitted", "client_viewed"];

const dailyLogSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    logDate: {
      type: Date,
      required: true,
      index: true
    },
    weather: {
      type: String,
      trim: true,
      maxlength: 160
    },
    siteNotes: {
      type: String,
      trim: true,
      maxlength: 4000
    },
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    status: {
      type: String,
      enum: DAILY_LOG_STATUSES,
      default: "draft",
      index: true
    },
    submittedAt: Date,
    clientViewedAt: Date
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

dailyLogSchema.index({ project: 1, logDate: 1 }, { unique: true });

export const DailyLog = mongoose.model("DailyLog", dailyLogSchema);
