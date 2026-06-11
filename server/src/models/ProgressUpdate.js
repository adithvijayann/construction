import mongoose from "mongoose";

const { Schema } = mongoose;

export const PROGRESS_UPDATE_STATUSES = ["not_started", "in_progress", "delayed", "completed"];

const progressUpdateSchema = new Schema(
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
    status: {
      type: String,
      enum: PROGRESS_UPDATE_STATUSES,
      default: "in_progress",
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 3000
    },
    updateDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    photos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document"
      }
    ]
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

export const ProgressUpdate = mongoose.model("ProgressUpdate", progressUpdateSchema);
