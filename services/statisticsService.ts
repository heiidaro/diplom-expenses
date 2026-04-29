import { Category, Expense } from "../types/models";

export type ChartPeriod = "week" | "month" | "year" | "custom";

export type CategoryChartItem = {
  categoryId: string;
  name: string;
  total: number;
  count: number;
  percent: number;
  color: string;
};

const FALLBACK_COLORS = [
  "#5CC8FF",
  "#FF9B71",
  "#3DDC97",
  "#C084FC",
  "#F9C74F",
  "#94A3B8",
  "#FB7185",
  "#2DD4BF",
];

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getStartOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

export function getExpensesByPeriod(
  expenses: Expense[],
  period: ChartPeriod,
  baseDate: Date = new Date()
) {
  let startDate: Date;

  if (period === "week") {
    startDate = getStartOfWeek(baseDate);
  } else if (period === "year") {
    startDate = getStartOfYear(baseDate);
  } else {
    startDate = getStartOfMonth(baseDate);
  }

  const endDate = new Date(baseDate);
  endDate.setHours(23, 59, 59, 999);

  return expenses.filter((expense) => {
    const date = new Date(expense.date);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date >= startDate && date <= endDate;
  });
}

export function getExpensesByDateRange(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return expenses.filter((expense) => {
    const date = new Date(expense.date);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date >= start && date <= end;
  });
}

export function getPeriodLabel(period: ChartPeriod) {
  if (period === "week") {
    return "за неделю";
  }

  if (period === "year") {
    return "за год";
  }

  if (period === "custom") {
    return "за выбранный период";
  }

  return "за месяц";
}

export function buildCategoryChartData(data: {
  expenses: Expense[];
  categories: Category[];
}): CategoryChartItem[] {
  const totalAmount = data.expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const map = new Map<string, CategoryChartItem>();

  data.expenses.forEach((expense) => {
    const categoryId = expense.categoryId || "unknown";
    const category = data.categories.find((item) => item.$id === categoryId);

    const existing = map.get(categoryId) || {
      categoryId,
      name: category?.name || "Без категории",
      total: 0,
      count: 0,
      percent: 0,
      color:
        category?.color ||
        FALLBACK_COLORS[map.size % FALLBACK_COLORS.length],
    };

    existing.total += Number(expense.amount || 0);
    existing.count += 1;

    map.set(categoryId, existing);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      percent: totalAmount > 0 ? (item.total / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}