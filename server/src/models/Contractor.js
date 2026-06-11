import mongoose from "mongoose";

const { Schema } = mongoose;

const contractorSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
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

export const Contractor = mongoose.model("Contractor", contractorSchema);
