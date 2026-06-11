import mongoose from "mongoose";
import { Expense } from "../models/Expense.js";
import { roundMoney } from "../utils/money.js";

export const createExpenseFromLog = async ({ project, contractor, type, amount, description, expenseDate, sourceModel, sourceId }) =>
  Expense.create({
    project,
    contractor,
    type,
    amount: roundMoney(amount),
    description,
    expenseDate,
    sourceModel,
    sourceId
  });

export const expenseSummaryForContractor = async (contractorId) => {
  const rows = await Expense.aggregate([
    { $match: { contractor: new mongoose.Types.ObjectId(contractorId) } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  const byType = rows.reduce((acc, row) => {
    acc[row._id] = { total: roundMoney(row.total), count: row.count };
    return acc;
  }, {});

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return { total: roundMoney(total), byType };
};
