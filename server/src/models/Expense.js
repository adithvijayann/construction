import mongoose from "mongoose";

const { Schema } = mongoose;

export const EXPENSE_TYPES = ["worker", "material", "other"];

const expenseSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    contractor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: EXPENSE_TYPES,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    expenseDate: {
      type: Date,
      required: true,
      index: true
    },
    sourceModel: {
      type: String,
      enum: ["WorkerLog", "MaterialLog", "Manual"]
    },
    sourceId: {
      type: Schema.Types.ObjectId
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

export const Expense = mongoose.model("Expense", expenseSchema);
