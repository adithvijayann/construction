import mongoose from "mongoose";

const { Schema } = mongoose;

const supervisorSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    contractor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    },
    qualification: {
      type: String,
      trim: true,
      maxlength: 160
    },
    specialty: {
      type: String,
      trim: true,
      maxlength: 120
    },
    assignedProjects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
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

export const Supervisor = mongoose.model("Supervisor", supervisorSchema);
