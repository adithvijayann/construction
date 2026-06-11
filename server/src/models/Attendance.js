import mongoose from "mongoose";

const { Schema } = mongoose;

export const ATTENDANCE_STATUSES = ["present", "absent", "half_day"];

const attendanceSchema = new Schema(
  {
    dailyLog: {
      type: Schema.Types.ObjectId,
      ref: "DailyLog",
      required: true,
      index: true
    },
    worker: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      required: true,
      default: "present"
    },
    hoursWorked: {
      type: Number,
      min: 0,
      max: 24,
      default: 8
    },
    wageForDay: {
      type: Number,
      min: 0,
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
        return ret;
      }
    }
  }
);

attendanceSchema.index({ dailyLog: 1, worker: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
