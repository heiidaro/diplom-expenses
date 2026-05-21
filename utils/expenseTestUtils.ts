export function normalizeAmountInput(value: string): number | null {
  const normalized = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

export function formatMoneyForTest(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function buildReceiptComment(data: {
  merchantName?: string;
  items?: string[];
}) {
  const merchantName = String(data.merchantName || "").trim();
  const items = Array.isArray(data.items) ? data.items.filter(Boolean) : [];

  const parts: string[] = [];

  if (merchantName) {
    parts.push(`Магазин: ${merchantName}`);
  }

  if (items.length > 0) {
    parts.push(`Товары: ${items.join(", ")}`);
  }

  return parts.join("\n");
}

export function getOnlineStatusByLastSeen(
  lastSeenAt: string,
  currentTimeMs = Date.now(),
): "online" | "recently" | "offline" {
  if (!lastSeenAt) {
    return "offline";
  }

  const lastSeenTime = new Date(lastSeenAt).getTime();

  if (Number.isNaN(lastSeenTime)) {
    return "offline";
  }

  const diffMinutes = (currentTimeMs - lastSeenTime) / 1000 / 60;

  if (diffMinutes < 0) {
    return "offline";
  }

  if (diffMinutes <= 2) {
    return "online";
  }

  if (diffMinutes <= 15) {
    return "recently";
  }

  return "offline";
}
