import mongoose from "mongoose";

const { Schema } = mongoose;

const logPhotoSchema = new Schema(
  {
    dailyLog: {
      type: Schema.Types.ObjectId,
      ref: "DailyLog",
      required: true,
      index: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 240
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
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

export const LogPhoto = mongoose.model("LogPhoto", logPhotoSchema);
