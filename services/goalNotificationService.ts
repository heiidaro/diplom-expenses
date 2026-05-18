import { getUserExpenses } from "./expenseService";
import { calculateGoalProgress } from "./goalAnalyticsService";
import { getActiveUserSpendingGoals } from "./goalService";
import { createUniqueDailyNotification } from "./notificationService";

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))} ₽`;
}

export async function syncGoalNotifications(userId: string) {
  const [goals, expenses] = await Promise.all([
    getActiveUserSpendingGoals(userId),
    getUserExpenses(userId),
  ]);

  await Promise.all(
    goals.map(async (goal) => {
      const progress = calculateGoalProgress({
        goal,
        expenses,
      });

      if (progress.isExceeded) {
        await createUniqueDailyNotification({
          userId,
          title: "Цель превышена",
          message: `По цели "${goal.title}" превышение составляет ${formatMoney(
            progress.exceededAmount,
          )}. Расходы за выбранный период выше установленного лимита.`,
          type: "goal",
          relatedEntityId: goal.$id,
          relatedEntityType: "goal",
        });

        return;
      }

      await createUniqueDailyNotification({
        userId,
        title: "Дневной лимит обновлен",
        message: `По цели "${goal.title}" можно тратить примерно ${formatMoney(
          progress.dailyAvailable,
        )} в день. Осталось ${formatMoney(
          progress.remainingAmount,
        )} на ${progress.daysRemaining} дн.`,
        type: "goal",
        relatedEntityId: goal.$id,
        relatedEntityType: "goal",
      });
    }),
  );
}
