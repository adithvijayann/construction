import mongoose from "mongoose";

const { Schema } = mongoose;

const projectClientSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    clientUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    invitedAt: {
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

projectClientSchema.index({ project: 1, clientUser: 1 }, { unique: true });

export const ProjectClient = mongoose.model("ProjectClient", projectClientSchema);
