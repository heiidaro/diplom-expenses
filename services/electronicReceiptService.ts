import {
  DB_ID,
  EXPENSES_COL_ID,
  ExecutionMethod,
  ID,
  PARSE_PDF_RECEIPT_FUNCTION_ID,
  RECEIPT_FILES_BUCKET_ID,
  databases,
  functions,
  storage,
} from "../lib/appwrite";

export type ParsedElectronicReceipt = {
  rawText: string;
  amount: number;
  date: string;
  merchantName: string;
  note: string;
  items?: string[];
};

export type ElectronicReceiptFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractAmount(rawText: string): number {
  const text = rawText.replace(/\u00A0/g, " ");

  const priorityPatterns = [
    /(?:итого|итог|к оплате|сумма|оплачено|всего)\s*[:\-]?\s*([\d\s]+[,.]\d{1,2}|\d+)/i,
    /([\d\s]+[,.]\d{1,2})\s*(?:₽|руб|р\.|р)/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const normalized = match[1]
        .replace(/\s/g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

      const amount = Number(normalized);

      if (!Number.isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return 0;
}

function extractDate(rawText: string): string {
  const text = rawText.replace(/\u00A0/g, " ");

  const ruDateMatch = text.match(
    /(\d{2})[./-](\d{2})[./-](\d{4})(?:\s+(\d{2}):(\d{2}))?/
  );

  if (ruDateMatch) {
    const [, day, month, year, hour = "12", minute = "00"] = ruDateMatch;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0
    ).toISOString();
  }

  const isoDateMatch = text.match(
    /(\d{4})[./-](\d{2})[./-](\d{2})(?:\s+(\d{2}):(\d{2}))?/
  );

  if (isoDateMatch) {
    const [, year, month, day, hour = "12", minute = "00"] = isoDateMatch;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0
    ).toISOString();
  }

  return new Date().toISOString();
}

function extractMerchantName(rawText: string): string {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const badWords = [
    "кассовый чек",
    "чек",
    "итого",
    "сумма",
    "оплата",
    "наличными",
    "безналичными",
    "дата",
    "фн",
    "фд",
    "фп",
    "инн",
    "ндс",
    "сайт",
  ];

  const merchantLine = lines.find((line) => {
    const lower = line.toLowerCase();

    if (line.length < 3) return false;

    return !badWords.some((word) => lower.includes(word));
  });

  return merchantLine || "Электронный чек";
}

function removeDuplicatedProductName(value: string) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (text.length % 2 === 0) {
    const half = text.length / 2;
    const firstPart = text.slice(0, half);
    const secondPart = text.slice(half);

    if (firstPart === secondPart) {
      return firstPart.trim();
    }
  }

  for (let i = 4; i <= Math.floor(text.length / 2); i += 1) {
    const part = text.slice(0, i);

    if (text === part + part) {
      return part.trim();
    }
  }

  return text;
}

function cleanReceiptItemName(line: string) {
  let itemName = String(line || "")
    .replace(/^\s*\d+\s*[\.\)]{1,4}\s*/g, "")
    .replace(/Цена\s*\*\s*Кол.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  itemName = removeDuplicatedProductName(itemName);

  return itemName.trim();
}

function extractReceiptItems(rawText: string): string[] {
  const lines = String(rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];

  lines.forEach((line) => {
    const looksLikeProductLine = /^\s*\d+\s*[\.\)]{1,4}/.test(line);

    if (!looksLikeProductLine) {
      return;
    }

    const itemName = cleanReceiptItemName(line);

    if (!itemName || itemName.length < 2) {
      return;
    }

    const lower = itemName.toLowerCase();

    const ignoredWords = [
      "итог",
      "наличные",
      "безналичные",
      "ндс",
      "сумма",
      "сайт",
      "фн",
      "фд",
      "фп",
      "инн",
      "смена",
      "чек",
    ];

    if (ignoredWords.some((word) => lower.startsWith(word))) {
      return;
    }

    items.push(itemName);
  });

  return items;
}

function buildReceiptNote(merchantName: string, items: string[]) {
  const shopName = merchantName || "Электронный чек";

  if (!items.length) {
    return shopName;
  }

  return `${shopName}\n\nТовары:\n${items
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n")}`;
}

export function parseElectronicReceiptText(
  rawText: string
): ParsedElectronicReceipt {
  const normalizedText = normalizeText(rawText);

  if (!normalizedText) {
    throw new Error("Вставьте текст электронного чека");
  }

  const amount = extractAmount(rawText);

  if (!amount || amount <= 0) {
    throw new Error(
      "Не удалось определить сумму. Проверьте, есть ли в тексте строка вроде «Итого: 2500 ₽»."
    );
  }

  const date = extractDate(rawText);
  const merchantName = extractMerchantName(rawText);
  const items = extractReceiptItems(rawText);
  const note = buildReceiptNote(merchantName, items);

  return {
    rawText,
    amount,
    date,
    merchantName,
    items,
    note,
  };
}

export async function uploadElectronicReceiptFile(
  file: ElectronicReceiptFile
): Promise<string> {
  const bucketId = RECEIPT_FILES_BUCKET_ID || "698ded11003046f79899";

  if (!file.uri) {
    throw new Error("Не найден путь к файлу чека");
  }

  console.log("Проверка bucketId:", bucketId);

  console.log("Загружаем файл в Appwrite Storage:", {
    bucketId,
    name: file.name,
    uri: file.uri,
    type: file.mimeType,
    size: file.size,
  });

  const uploaded = await storage.createFile({
    bucketId,
    fileId: ID.unique(),
    file: {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/pdf",
      size: file.size || 0,
    } as any,
  });

  return uploaded.$id;
}

export async function createExpenseFromElectronicReceipt(data: {
  userId: string;
  parsed: ParsedElectronicReceipt;
  categoryId: string;
  note?: string;
  receiptFileId?: string;
}) {
  const note = data.note?.trim() || data.parsed.note || "Электронный чек";

  const created = await databases.createDocument(
    DB_ID,
    EXPENSES_COL_ID,
    ID.unique(),
    {
      userId: data.userId,
      amount: data.parsed.amount,
      categoryId: data.categoryId,
      note,
      date: data.parsed.date,

      sourceType: "receipt_ocr",
      sourceId: data.receiptFileId || "",
      status: "confirmed",
      merchantName: data.parsed.merchantName || note,
      createdAutomatically: true,
    }
  );

  return created;
}

export async function parsePdfReceiptWithFunction(
  fileId: string
): Promise<ParsedElectronicReceipt> {
  const execution = await functions.createExecution({
    functionId: PARSE_PDF_RECEIPT_FUNCTION_ID,
    body: JSON.stringify({
      fileId,
      bucketId: RECEIPT_FILES_BUCKET_ID,
    }),
    async: false,
    path: "/",
    method: ExecutionMethod.POST,
    headers: {
      "content-type": "application/json",
    },
  });

  const responseBody = execution.responseBody || "";

  if (!responseBody) {
    throw new Error("Функция не вернула результат распознавания PDF");
  }

  const result = JSON.parse(responseBody);

  if (!result.success) {
    throw new Error(result.message || "Не удалось распознать PDF-чек");
  }

  const items = Array.isArray(result.items) ? result.items : [];
  const merchantName = result.merchantName || "Электронный чек";

  return {
    rawText: result.rawText || "",
    amount: Number(result.amount || 0),
    date: result.date || new Date().toISOString(),
    merchantName,
    items,
    note: result.note || buildReceiptNote(merchantName, items),
  };
}