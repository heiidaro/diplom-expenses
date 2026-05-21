import {
  buildReceiptComment,
  formatMoneyForTest,
  getOnlineStatusByLastSeen,
  normalizeAmountInput,
} from "../utils/expenseTestUtils";

describe("Проверка обработки суммы расхода", () => {
  test("корректно обрабатывает сумму с копейками через запятую", () => {
    const result = normalizeAmountInput("359,96");

    expect(result).toBe(359.96);
  });

  test("округляет сумму до двух знаков после запятой", () => {
    const result = normalizeAmountInput("125.678");

    expect(result).toBe(125.68);
  });

  test("возвращает null при некорректной сумме", () => {
    expect(normalizeAmountInput("abc")).toBeNull();
    expect(normalizeAmountInput("-100")).toBeNull();
    expect(normalizeAmountInput("0")).toBeNull();
  });
});

describe("Проверка форматирования денежных значений", () => {
  test("выводит сумму с копейками", () => {
    const result = formatMoneyForTest(1947);

    expect(result).toContain("1");
    expect(result).toContain("947");
    expect(result).toContain("00");
    expect(result).toContain("₽");
  });

  test("сохраняет копейки при выводе суммы", () => {
    const result = formatMoneyForTest(359.96);

    expect(result).toContain("359");
    expect(result).toContain("96");
    expect(result).toContain("₽");
  });
});

describe("Проверка формирования комментария по электронному чеку", () => {
  test("добавляет магазин и список товаров в комментарий", () => {
    const result = buildReceiptComment({
      merchantName: "Пятерочка",
      items: ["KINDER Вафли", "Коктейль молочный", "Фарш"],
    });

    expect(result).toContain("Магазин: Пятерочка");
    expect(result).toContain("KINDER Вафли");
    expect(result).toContain("Коктейль молочный");
    expect(result).toContain("Фарш");
  });
});

describe("Проверка статуса активности пользователя", () => {
  const now = new Date("2026-05-21T12:00:00.000Z").getTime();

  test("пользователь считается онлайн, если был активен менее 2 минут назад", () => {
    const lastSeenAt = "2026-05-21T11:59:00.000Z";

    expect(getOnlineStatusByLastSeen(lastSeenAt, now)).toBe("online");
  });

  test("пользователь считается недавно активным, если был активен менее 15 минут назад", () => {
    const lastSeenAt = "2026-05-21T11:50:00.000Z";

    expect(getOnlineStatusByLastSeen(lastSeenAt, now)).toBe("recently");
  });

  test("пользователь считается офлайн, если активность была более 15 минут назад", () => {
    const lastSeenAt = "2026-05-21T11:30:00.000Z";

    expect(getOnlineStatusByLastSeen(lastSeenAt, now)).toBe("offline");
  });
});
