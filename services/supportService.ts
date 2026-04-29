import {
  DB_ID,
  ID,
  Query,
  SUPPORT_TICKETS_COL_ID,
  databases,
} from "../lib/appwrite";
import { SupportTicket } from "../types/models";

interface CreateSupportTicketData {
  userId: string;
  title: string;
  message: string;
}

export async function createSupportTicket(
  data: CreateSupportTicketData
): Promise<SupportTicket> {
  const ticketData = {
    userId: data.userId,
    title: data.title,
    message: data.message,
    status: "open",
  };

  console.log("Создаем обращение:", ticketData);

  const created = await databases.createDocument(
    DB_ID,
    SUPPORT_TICKETS_COL_ID,
    ID.unique(),
    ticketData
  );

  return created as unknown as SupportTicket;
}

export async function getUserSupportTickets(
  userId: string
): Promise<SupportTicket[]> {
  const response = await databases.listDocuments(
    DB_ID,
    SUPPORT_TICKETS_COL_ID,
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]
  );

  return response.documents as unknown as SupportTicket[];
}

export async function deleteSupportTicket(ticketId: string) {
  return databases.deleteDocument(DB_ID, SUPPORT_TICKETS_COL_ID, ticketId);
}