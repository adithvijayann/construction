import mongoose from "mongoose";

const { Schema } = mongoose;

export const DOCUMENT_TYPES = ["agreement", "plot_photo", "progress_photo"];

const documentSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    storagePath: {
      type: String,
      required: true
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

export const Document = mongoose.model("Document", documentSchema);
