import mongoose from "mongoose";

const { Schema } = mongoose;

export const PROJECT_STATUSES = ["active", "on_hold", "completed"];
export const PROJECT_PROGRESS_STATUSES = ["planning", "in_progress", "on_hold", "completed"];

const projectSchema = new Schema(
  {
    contractor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    supervisors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    },
    workLocation: {
      type: String,
      trim: true,
      maxlength: 220
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    startDate: Date,
    endDate: Date,
    estimatedCost: {
      type: Number,
      min: 0,
      default: 0
    },
    progressStatus: {
      type: String,
      enum: PROJECT_PROGRESS_STATUSES,
      default: "planning",
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 4000
    },
    agreementFile: {
      type: Schema.Types.ObjectId,
      ref: "Document"
    },
    plotPhoto: {
      type: Schema.Types.ObjectId,
      ref: "Document"
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "active",
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Project = mongoose.model("Project", projectSchema);
