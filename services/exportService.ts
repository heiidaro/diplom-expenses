import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { Category, Expense } from "../types/models";
import { getCategoryName } from "./categoryService";

function getSourceLabel(sourceType?: string): string {
  if (sourceType === "manual") return "Ручной ввод";
  if (sourceType === "receipt_qr") return "QR-чек";
  if (sourceType === "receipt_ocr") { return "Электронный чек";}
  if (sourceType === "recurring") return "Регулярный расход";

  return "Не указан";
}

function formatDate(value?: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ru-RU");
}

function getReportPeriod(expenses: Expense[]) {
  if (expenses.length === 0) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const validDates = expenses
    .map((expense) => new Date(expense.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    startDate: validDates[0]?.toLocaleDateString("ru-RU") || "",
    endDate: validDates[validDates.length - 1]?.toLocaleDateString("ru-RU") || "",
  };
}

function getCategoryStats(data: {
  expenses: Expense[];
  categories: Category[];
}) {
  const totalAmount = data.expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const map = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      total: number;
      count: number;
      average: number;
      share: number;
    }
  >();

  data.expenses.forEach((expense) => {
    const categoryId = expense.categoryId || "unknown";

    const current = map.get(categoryId) || {
      categoryId,
      categoryName: getCategoryName(data.categories, categoryId),
      total: 0,
      count: 0,
      average: 0,
      share: 0,
    };

    current.total += Number(expense.amount || 0);
    current.count += 1;

    map.set(categoryId, current);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      average: item.count > 0 ? item.total / item.count : 0,
      share: totalAmount > 0 ? (item.total / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function getSourceStats(expenses: Expense[]) {
  const map = new Map<
    string,
    {
      source: string;
      total: number;
      count: number;
      average: number;
    }
  >();

  expenses.forEach((expense) => {
    const source = getSourceLabel(expense.sourceType);

    const current = map.get(source) || {
      source,
      total: 0,
      count: 0,
      average: 0,
    };

    current.total += Number(expense.amount || 0);
    current.count += 1;

    map.set(source, current);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      average: item.count > 0 ? item.total / item.count : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function createSheet(data: unknown[][], columnWidths: number[]) {
  const sheet = XLSX.utils.aoa_to_sheet(data);

  sheet["!cols"] = columnWidths.map((width) => ({
    wch: width,
  }));

  return sheet;
}

export async function exportExpensesToCsv(data: {
  expenses: Expense[];
  categories: Category[];
}): Promise<string> {
  const expenses = [...data.expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalAmount = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const averageAmount = expenses.length > 0 ? totalAmount / expenses.length : 0;

  const period = getReportPeriod(expenses);

  const categoryStats = getCategoryStats({
    expenses,
    categories: data.categories,
  });

  const sourceStats = getSourceStats(expenses);

  const topCategoryByTotal = categoryStats[0];

  const topCategoryByCount = [...categoryStats].sort(
    (a, b) => b.count - a.count
  )[0];

  const workbook = XLSX.utils.book_new();

  /**
   * Лист 1. Сводка
   */
  const summaryData = [
    ["ОТЧЕТ ПО РАСХОДАМ"],
    [],
    ["Показатель", "Значение"],
    ["Начало периода", period.startDate],
    ["Конец периода", period.endDate],
    ["Всего потрачено", totalAmount],
    ["Количество расходов", expenses.length],
    ["Средняя трата", averageAmount],
    [
      "Самая затратная категория",
      topCategoryByTotal?.categoryName || "Нет данных",
    ],
    [
      "Сумма по самой затратной категории",
      topCategoryByTotal?.total || 0,
    ],
    [
      "Самая частая категория",
      topCategoryByCount?.categoryName || "Нет данных",
    ],
    [
      "Количество операций в самой частой категории",
      topCategoryByCount?.count || 0,
    ],
  ];

  const summarySheet = createSheet(summaryData, [42, 28]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Сводка");

  /**
   * Лист 2. Категории
   */
  const categoriesData = [
    [
      "Категория",
      "Сумма",
      "Количество операций",
      "Средняя сумма",
      "Доля от общих расходов, %",
    ],
    ...categoryStats.map((item) => [
      item.categoryName,
      item.total,
      item.count,
      item.average,
      Number(item.share.toFixed(2)),
    ]),
  ];

  const categoriesSheet = createSheet(categoriesData, [28, 16, 22, 18, 24]);
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Категории");

  /**
   * Лист 3. Источники
   */
  const sourcesData = [
    ["Источник", "Сумма", "Количество операций", "Средняя сумма"],
    ...sourceStats.map((item) => [
      item.source,
      item.total,
      item.count,
      item.average,
    ]),
  ];

  const sourcesSheet = createSheet(sourcesData, [26, 16, 22, 18]);
  XLSX.utils.book_append_sheet(workbook, sourcesSheet, "Источники");

  /**
   * Лист 4. Операции
   */
  const operationsData = [
    [
      "Дата",
      "Сумма",
      "Категория",
      "Комментарий",
      "Источник",
      "Создано автоматически",
    ],
    ...expenses.map((expense) => [
      formatDate(expense.date),
      Number(expense.amount || 0),
      getCategoryName(data.categories, expense.categoryId),
      expense.note || expense.merchantName || "",
      getSourceLabel(expense.sourceType),
      expense.createdAutomatically ? "Да" : "Нет",
    ]),
  ];

  const operationsSheet = createSheet(
    operationsData,
    [16, 14, 24, 36, 22, 24]
  );
  XLSX.utils.book_append_sheet(workbook, operationsSheet, "Операции");

  const fileName = `expenses_report_${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  const workbookBase64 = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });

  await FileSystem.writeAsStringAsync(fileUri, workbookBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("На этом устройстве недоступна отправка файла");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Экспорт расходов",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });

  return fileUri;
}