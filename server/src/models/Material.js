import mongoose from "mongoose";

const { Schema } = mongoose;

const materialSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    orderedQty: {
      type: Number,
      min: 0,
      default: 0
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

materialSchema.index({ project: 1, name: 1 }, { unique: true });

export const Material = mongoose.model("Material", materialSchema);
