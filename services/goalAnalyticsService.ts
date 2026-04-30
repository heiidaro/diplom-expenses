import { Expense, SpendingGoal } from "../types/models";

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeDate(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getGoalStartDate(goal: SpendingGoal) {
  return normalizeDate(new Date(goal.startDate));
}

function getGoalEndDate(goal: SpendingGoal) {
  const endDate = normalizeDate(new Date(goal.endDate));
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

function isExpenseInsideGoalPeriod(expense: Expense, goal: SpendingGoal) {
  const expenseDate = new Date(expense.date);

  if (Number.isNaN(expenseDate.getTime())) {
    return false;
  }

  const startDate = getGoalStartDate(goal);
  const endDate = getGoalEndDate(goal);

  return expenseDate >= startDate && expenseDate <= endDate;
}

function getDaysRemaining(goal: SpendingGoal) {
  const today = normalizeDate(new Date());
  const startDate = getGoalStartDate(goal);
  const endDate = normalizeDate(new Date(goal.endDate));

  if (today > endDate) {
    return 0;
  }

  const countingStartDate = today < startDate ? startDate : today;

  return Math.max(
    0,
    Math.ceil((endDate.getTime() - countingStartDate.getTime()) / DAY_MS) + 1
  );
}

export function calculateGoalProgress(data: {
  goal: SpendingGoal;
  expenses: Expense[];
}) {
  const spentAmount = data.expenses
    .filter((expense) => isExpenseInsideGoalPeriod(expense, data.goal))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const limitAmount = Number(data.goal.limitAmount || 0);
  const remainingAmount = limitAmount - spentAmount;
  const exceededAmount = Math.max(0, spentAmount - limitAmount);
  const daysRemaining = getDaysRemaining(data.goal);

  const dailyAvailable =
    remainingAmount > 0 && daysRemaining > 0
      ? remainingAmount / daysRemaining
      : 0;

  const progressPercent =
    limitAmount > 0 ? Math.min((spentAmount / limitAmount) * 100, 100) : 0;

  const rawProgressPercent =
    limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

  const isExceeded = spentAmount > limitAmount;

  return {
    limitAmount,
    spentAmount,
    remainingAmount: Math.max(0, remainingAmount),
    exceededAmount,
    daysRemaining,
    dailyAvailable,
    progressPercent,
    rawProgressPercent,
    isExceeded,
  };
}