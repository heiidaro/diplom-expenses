import {
  ADMIN_API_FUNCTION_ID,
  ExecutionMethod,
  functions,
} from "../lib/appwrite";

export type AdminUser = {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  status: boolean;
  emailVerification?: boolean;
  labels: string[];
  createdAt?: string;
  updatedAt?: string;

  profileId?: string;
  role: "user" | "admin" | string;
  isBlocked: boolean;
  lastSeenAt?: string;
  lastActivityAt?: string;
  lastActivityScreen?: string;
  onlineStatus?: "online" | "recently" | "offline" | string;
};

export type AdminStats = {
  totalUsers: number;
  activeToday: number;
  blockedUsers: number;
  openTickets: number;
  inProgressTickets: number;
  closedTickets: number;
  totalTickets: number;
};

export type AdminSupportTicket = {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  userId: string;
  title: string;
  message: string;
  status?: "open" | "in_progress" | "closed" | string;
  userName?: string;
  userEmail?: string;

  adminReply?: string;
  adminReplyAt?: string;
  isReplyRead?: boolean;
  assignedAdminId?: string;
  closedAt?: string;
};

export type AdminLog = {
  $id: string;
  $createdAt?: string;

  adminUserId: string;
  adminName?: string;
  adminEmail?: string;

  actionType: string;

  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;

  targetEntityId?: string;
  targetEntityType?: string;
  targetEntityTitle?: string;

  description: string;
};

export type AdminNews = {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  title: string;
  message: string;
  type?: "news" | "system" | "update" | string;
  isPublished?: boolean;
  publishedAt?: string;
  createdByUserId: string;
};

export type AdminUserStatsExport = {
  user: AdminUser & {
    expensesCount: number;
    totalExpenseAmount: number;
    goalsCount: number;
    ticketsCount: number;
    openTicketsCount: number;
    inProgressTicketsCount: number;
    closedTicketsCount: number;
  };

  expenses: any[];
  goals: any[];
  tickets: AdminSupportTicket[];
  adminLogs: AdminLog[];
};

export type AdminAllUsersStatsExport = {
  users: Array<
    AdminUser & {
      expensesCount: number;
      totalExpenseAmount: number;
      goalsCount: number;
      ticketsCount: number;
      openTicketsCount: number;
      inProgressTicketsCount: number;
      closedTicketsCount: number;
    }
  >;

  tickets: AdminSupportTicket[];
  adminLogs: AdminLog[];
};

export type AdminUserDetails = {
  user: AdminUser;

  stats: {
    expensesCount: number;
    totalExpenseAmount: number;
    goalsCount: number;
    ticketsCount: number;
    openTicketsCount: number;
    inProgressTicketsCount: number;
    closedTicketsCount: number;
    adminLogsCount: number;
  };

  latestTickets: AdminSupportTicket[];
  latestAdminLogs: AdminLog[];
};


async function callAdminApi<T>(
  action: string,
  payload: Record<string, any> = {}
): Promise<T> {
  const execution = await functions.createExecution({
    functionId: ADMIN_API_FUNCTION_ID,
    body: JSON.stringify({
      action,
      payload,
    }),
    async: false,
    path: "/",
    method: ExecutionMethod.POST,
    headers: {
      "content-type": "application/json",
    },
  });

  console.log("ADMIN API EXECUTION:", {
    action,
    status: execution.status,
    responseStatusCode: execution.responseStatusCode,
    responseBody: execution.responseBody,
    errors: execution.errors,
    logs: execution.logs,
  });

  const responseBody = execution.responseBody || "";

  if (!responseBody) {
    const details =
      execution.errors ||
      execution.logs ||
      `status=${execution.status}, code=${execution.responseStatusCode}`;

    throw new Error(`admin_api не вернул ответ: ${details}`);
  }

  let result;

  try {
    result = JSON.parse(responseBody);
  } catch {
    throw new Error(`admin_api вернул не JSON: ${responseBody}`);
  }

  if (!result.success) {
    throw new Error(result.message || "Ошибка выполнения admin_api");
  }

  return result.data as T;
}

export async function getMeAdminStatus() {
  return callAdminApi<{
    isAdmin: boolean;
    admin: {
      userId: string;
      name: string;
      email: string;
      labels: string[];
    };
  }>("getMeAdminStatus");
}

export async function getAdminDashboardStats() {
  const result = await callAdminApi<{
    stats: AdminStats;
  }>("getDashboardStats");

  return result.stats;
}

export async function getAdminUsers() {
  const result = await callAdminApi<{
    users: AdminUser[];
  }>("listUsers");

  return result.users;
}

export async function getAdminUserDetails(userId: string) {
  return callAdminApi<AdminUserDetails>("getUserDetails", {
    userId,
  });
}

export async function blockAdminUser(userId: string) {
  return callAdminApi("blockUser", {
    userId,
  });
}

export async function unblockAdminUser(userId: string) {
  return callAdminApi("unblockUser", {
    userId,
  });
}

export async function updateAdminUserProfile(data: {
  userId: string;
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
}) {
  return callAdminApi("updateUserProfile", data);
}

export async function getAdminSupportTickets(status: string = "all") {
  const result = await callAdminApi<{
    tickets: AdminSupportTicket[];
  }>("listSupportTickets", {
    status,
  });

  return result.tickets;
}

export async function replyAdminSupportTicket(data: {
  ticketId: string;
  replyText: string;
  closeAfterReply: boolean;
}) {
  return callAdminApi("replySupportTicket", data);
}

export async function closeAdminSupportTicket(ticketId: string) {
  return callAdminApi("closeSupportTicket", {
    ticketId,
  });
}

export async function publishAdminNews(data: {
  title: string;
  message: string;
  type: "news" | "system" | "update";
}) {
  return callAdminApi("publishNews", data);
}

export async function getAdminNews() {
  const result = await callAdminApi<{
    news: AdminNews[];
  }>("listNews");

  return result.news;
}

export async function getAdminLogs() {
  const result = await callAdminApi<{
    logs: AdminLog[];
  }>("listAdminLogs");

  return result.logs;
}

export async function getAdminUserStatsExport(userId: string) {
  return callAdminApi<AdminUserStatsExport>("exportUserStats", {
    userId,
  });
}

export async function getAdminAllUsersStatsExport() {
  return callAdminApi<AdminAllUsersStatsExport>("exportAllUsersStats");
}