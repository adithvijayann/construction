import mongoose from "mongoose";

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    entityId: {
      type: Schema.Types.ObjectId
    },
    metadata: {
      type: Schema.Types.Mixed
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

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
