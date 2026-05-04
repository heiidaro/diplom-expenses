import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import {
  getAdminAllUsersStatsExport,
  getAdminUserStatsExport,
} from "./adminService";

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBool(value: any) {
  return value ? "Да" : "Нет";
}

function getOnlineLabel(status?: string) {
  if (status === "online") return "Онлайн";
  if (status === "recently") return "Недавно был";
  return "Офлайн";
}

function getRoleLabel(role?: string) {
  return role === "admin" ? "Администратор" : "Пользователь";
}

function safeFileName(value: string) {
  return String(value || "export")
    .replace(/[^\wа-яА-ЯёЁ.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function appendJsonSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: any[]
) {
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
}

async function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("На этом устройстве недоступен экспорт файла");
  }

  const base64 = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });

  const fileUri = `${FileSystem.documentDirectory}${safeFileName(fileName)}.xlsx`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Экспорт статистики",
    UTI: "com.microsoft.excel.xlsx",
  });

  return fileUri;
}

function mapExpenses(expenses: any[]) {
  return expenses.map((expense) => ({
    Дата: formatDate(expense.date || expense.createdAt || expense.$createdAt),
    Сумма: Number(expense.amount || 0),
    Категория:
      expense.categoryName ||
      expense.category ||
      expense.categoryTitle ||
      expense.categoryId ||
      "",
    Комментарий: expense.note || expense.description || "",
    "Создано": formatDate(expense.$createdAt),
  }));
}

function mapGoals(goals: any[]) {
  return goals.map((goal) => ({
    Название: goal.title || goal.name || "Финансовая цель",
    Лимит: Number(goal.limitAmount || goal.amount || goal.targetAmount || 0),
    "Потрачено": Number(goal.spentAmount || 0),
    "Дата начала": formatDate(goal.startDate || goal.startAt),
    "Дата окончания": formatDate(goal.endDate || goal.endAt),
    Статус: goal.status || "",
    "Создано": formatDate(goal.$createdAt),
  }));
}

function mapTickets(tickets: any[]) {
  return tickets.map((ticket) => ({
    Пользователь: ticket.userName || "",
    Email: ticket.userEmail || "",
    Тема: ticket.title || "",
    Сообщение: ticket.message || "",
    Статус: ticket.status || "",
    "Ответ администратора": ticket.adminReply || "",
    "Дата ответа": formatDate(ticket.adminReplyAt),
    "Создано": formatDate(ticket.$createdAt),
  }));
}

function mapAdminLogs(logs: any[]) {
  return logs.map((log) => ({
    Действие: log.actionType || "",
    Описание: log.description || "",
    Администратор: log.adminName || log.adminUserId || "",
    "Email администратора": log.adminEmail || "",
    Пользователь: log.targetUserName || log.targetUserId || "",
    "Email пользователя": log.targetUserEmail || "",
    Объект: log.targetEntityTitle || log.targetEntityId || "",
    "Тип объекта": log.targetEntityType || "",
    "Создано": formatDate(log.$createdAt),
  }));
}

export async function exportAdminUserStatsToXlsx(userId: string) {
  const data = await getAdminUserStatsExport(userId);
  const workbook = XLSX.utils.book_new();

  const user = data.user;

  appendJsonSheet(workbook, "Сводка", [
    {
      Показатель: "Имя",
      Значение: user.name || "",
    },
    {
      Показатель: "Email",
      Значение: user.email || "",
    },
    {
      Показатель: "Роль",
      Значение: getRoleLabel(user.role),
    },
    {
      Показатель: "Заблокирован",
      Значение: formatBool(user.isBlocked),
    },
    {
      Показатель: "Онлайн-статус",
      Значение: getOnlineLabel(user.onlineStatus),
    },
    {
      Показатель: "Последний онлайн",
      Значение: formatDate(user.lastSeenAt),
    },
    {
      Показатель: "Последний экран",
      Значение: user.lastActivityScreen || "",
    },
    {
      Показатель: "Количество расходов",
      Значение: user.expensesCount,
    },
    {
      Показатель: "Сумма расходов",
      Значение: user.totalExpenseAmount,
    },
    {
      Показатель: "Количество целей",
      Значение: user.goalsCount,
    },
    {
      Показатель: "Количество обращений",
      Значение: user.ticketsCount,
    },
  ]);

  appendJsonSheet(workbook, "Расходы", mapExpenses(data.expenses));
  appendJsonSheet(workbook, "Цели", mapGoals(data.goals));
  appendJsonSheet(workbook, "Обращения", mapTickets(data.tickets));
  appendJsonSheet(workbook, "Действия", mapAdminLogs(data.adminLogs));

  const fileName = `Статистика_${user.email || user.name || user.userId}_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return saveWorkbook(workbook, fileName);
}

export async function exportAdminAllUsersStatsToXlsx() {
  const data = await getAdminAllUsersStatsExport();
  const workbook = XLSX.utils.book_new();

  appendJsonSheet(
    workbook,
    "Все пользователи",
    data.users.map((user) => ({
      Имя: user.name || "",
      Email: user.email || "",
      Роль: getRoleLabel(user.role),
      Заблокирован: formatBool(user.isBlocked),
      Активен: formatBool(user.status),
      "Онлайн-статус": getOnlineLabel(user.onlineStatus),
      "Последний онлайн": formatDate(user.lastSeenAt),
      "Последний экран": user.lastActivityScreen || "",
      "Создан": formatDate(user.createdAt),
      "Кол-во расходов": user.expensesCount,
      "Сумма расходов": user.totalExpenseAmount,
      "Кол-во целей": user.goalsCount,
      "Кол-во обращений": user.ticketsCount,
      "Открытые обращения": user.openTicketsCount,
      "В работе": user.inProgressTicketsCount,
      "Закрытые": user.closedTicketsCount,
    }))
  );

  appendJsonSheet(workbook, "Обращения", mapTickets(data.tickets));
  appendJsonSheet(workbook, "Действия", mapAdminLogs(data.adminLogs));

  const fileName = `Статистика_всех_пользователей_${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return saveWorkbook(workbook, fileName);
}