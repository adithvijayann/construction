import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { Schema } = mongoose;

export const USER_ROLES = ["admin", "contractor", "supervisor", "client"];
export const USER_STATUSES = ["active", "inactive"];

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "contractor",
      index: true
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: "active",
      index: true
    },
    contractor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    refreshTokenHash: {
      type: String,
      select: false
    },
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        return ret;
      }
    }
  }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
