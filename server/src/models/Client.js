import mongoose from "mongoose";

const { Schema } = mongoose;

const clientSchema = new Schema(
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

clientSchema.index({ contractor: 1, user: 1 }, { unique: true });

export const Client = mongoose.model("Client", clientSchema);
