import {
  DB_ID,
  EXPENSES_COL_ID,
  ID,
  Query,
  RECEIPT_SCANS_COL_ID,
  databases,
} from "../lib/appwrite";
import { ParsedReceiptQr } from "../types/models";

function getQueryValue(raw: string, key: string): string {
  const regex = new RegExp(`[?&]?${key}=([^&]+)`, "i");
  const match = raw.match(regex);

  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function parseReceiptDate(value: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);

  if (match) {
    const [, year, month, day, hour = "12", minute = "00"] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0,
      0
    ).toISOString();
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return new Date().toISOString();
}

function parseReceiptAmount(value: string): number {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const amount = Number(normalized);

  return Number.isNaN(amount) ? 0 : amount;
}

function normalizeQrRawData(raw: string): string {
  return raw.trim();
}

/**
 * Короткий стабильный хеш QR-кода.
 * Нужен для поиска дубликатов, потому что qrRawData может быть слишком длинным для индекса Appwrite.
 */
function createQrHash(raw: string): string {
  const normalized = normalizeQrRawData(raw);

  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(index);
    hash |= 0;
  }

  return `qr_${Math.abs(hash)}_${normalized.length}`;
}

export function parseReceiptQr(raw: string): ParsedReceiptQr {
  const normalizedRaw = normalizeQrRawData(raw);

  const dateValue = getQueryValue(normalizedRaw, "t");
  const sumValue = getQueryValue(normalizedRaw, "s");
  const fiscalNumber = getQueryValue(normalizedRaw, "fn");
  const fiscalDocument = getQueryValue(normalizedRaw, "i");
  const fiscalSign = getQueryValue(normalizedRaw, "fp");

  const totalAmount = parseReceiptAmount(sumValue);
  const purchaseDate = parseReceiptDate(dateValue);

  if (!totalAmount || totalAmount <= 0) {
    throw new Error(
      "Не удалось определить сумму из QR-кода. Проверьте, что это QR-код кассового чека."
    );
  }

  return {
    raw: normalizedRaw,
    totalAmount,
    purchaseDate,
    fiscalNumber,
    fiscalDocument,
    fiscalSign,
  };
}

export async function checkReceiptQrExists(data: {
  userId: string;
  rawQrData: string;
}): Promise<boolean> {
  const qrHash = createQrHash(data.rawQrData);

  const response = await databases.listDocuments(DB_ID, RECEIPT_SCANS_COL_ID, [
    Query.equal("userId", data.userId),
    Query.equal("qrHash", qrHash),
    Query.limit(1),
  ]);

  return response.documents.length > 0;
}

export async function createExpenseFromParsedReceiptQr(data: {
  userId: string;
  parsed: ParsedReceiptQr;
  categoryId: string;
  note?: string;
}) {
  const qrHash = createQrHash(data.parsed.raw);

  const exists = await checkReceiptQrExists({
    userId: data.userId,
    rawQrData: data.parsed.raw,
  });

  if (exists) {
    throw new Error("Этот QR-чек уже был добавлен ранее");
  }

  const note = data.note?.trim() || "Покупка по QR-чеку";

  const receiptDocument = await databases.createDocument(
    DB_ID,
    RECEIPT_SCANS_COL_ID,
    ID.unique(),
    {
      userId: data.userId,
      qrRawData: data.parsed.raw,
      qrHash,
      totalAmount: data.parsed.totalAmount,
      purchaseDate: data.parsed.purchaseDate,
      storeName: note,
      status: "created",
    }
  );

  const expenseDocument = await databases.createDocument(
    DB_ID,
    EXPENSES_COL_ID,
    ID.unique(),
    {
      userId: data.userId,
      amount: data.parsed.totalAmount,
      categoryId: data.categoryId,
      note,
      date: data.parsed.purchaseDate,

      sourceType: "receipt_qr",
      sourceId: receiptDocument.$id,
      status: "confirmed",
      merchantName: note,
      createdAutomatically: true,
    }
  );

  return {
    receipt: receiptDocument,
    expense: expenseDocument,
  };
}