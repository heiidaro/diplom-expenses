import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  getCategoryColor,
  getCategoryName,
  getUserCategories,
} from "../../services/categoryService";
import { getTotalAmount, getUserExpenses } from "../../services/expenseService";
import { Category, Expense } from "../../types/models";
import { formatMoney } from "../../utils/format";

interface CategoryStat {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  count: number;
  percent: number;
}

interface MonthStat {
  key: string;
  label: string;
  total: number;
  count: number;
}

function getMonthKey(dateValue: string) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthLabel(dateValue: string) {
  const date = new Date(dateValue);

  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function StatisticsScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    try {
      setIsLoading(true);

      const user = await account.get();

      const [loadedCategories, loadedExpenses] = await Promise.all([
        getUserCategories(user.$id),
        getUserExpenses(user.$id),
      ]);

      setCategories(loadedCategories);
      setExpenses(loadedExpenses);
    } catch (error: any) {
      if (isGuestOrSessionError(error)) {
        return;
      }

      console.log("Ошибка:", error);

      Alert.alert("Ошибка", error?.message || "Что-то пошло не так");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData();
  }

  const totalAmount = useMemo(() => {
    return getTotalAmount(expenses);
  }, [expenses]);

  const averageAmount = useMemo(() => {
    if (expenses.length === 0) {
      return 0;
    }

    return totalAmount / expenses.length;
  }, [expenses.length, totalAmount]);

  const categoryStats = useMemo<CategoryStat[]>(() => {
    if (expenses.length === 0 || totalAmount === 0) {
      return [];
    }

    const map = new Map<string, { total: number; count: number }>();

    expenses.forEach((expense) => {
      const categoryId = expense.categoryId || "unknown";
      const current = map.get(categoryId) || {
        total: 0,
        count: 0,
      };

      current.total += Number(expense.amount || 0);
      current.count += 1;

      map.set(categoryId, current);
    });

    return Array.from(map.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        name: getCategoryName(categories, categoryId),
        color: getCategoryColor(categories, categoryId),
        total: data.total,
        count: data.count,
        percent: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, categories, totalAmount]);

  const monthStats = useMemo<MonthStat[]>(() => {
    const map = new Map<string, MonthStat>();

    expenses.forEach((expense) => {
      const key = getMonthKey(expense.date);
      const current = map.get(key) || {
        key,
        label: getMonthLabel(expense.date),
        total: 0,
        count: 0,
      };

      current.total += Number(expense.amount || 0);
      current.count += 1;

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      return b.key.localeCompare(a.key);
    });
  }, [expenses]);

  const topCategory = categoryStats[0];

  const maxMonthTotal = useMemo(() => {
    if (monthStats.length === 0) {
      return 0;
    }

    return Math.max(...monthStats.map((item) => item.total));
  }, [monthStats]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <Text style={styles.title}>Статистика</Text>
        <Text style={styles.subtitle}>
          Анализ расходов по категориям, месяцам и средним значениям
        </Text>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Загрузка статистики...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="analytics-outline"
              size={36}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Статистики пока нет</Text>
            <Text style={styles.emptyText}>
              Добавьте хотя бы одну трату, чтобы увидеть аналитику
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Всего потрачено</Text>
                <Text style={styles.summaryValue}>
                  {formatMoney(totalAmount)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Кол-во трат</Text>
                <Text style={styles.summaryValue}>{expenses.length}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Средняя трата</Text>
                <Text style={styles.summaryValue}>
                  {formatMoney(averageAmount)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Топ категория</Text>
                <Text style={styles.summaryValueSmall}>
                  {topCategory?.name || "Нет данных"}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Расходы по категориям</Text>

              <View style={styles.card}>
                {categoryStats.map((item) => (
                  <View key={item.categoryId} style={styles.categoryRow}>
                    <View style={styles.categoryTop}>
                      <View style={styles.categoryNameBox}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text style={styles.categoryName}>{item.name}</Text>
                      </View>

                      <Text style={styles.categoryAmount}>
                        {formatMoney(item.total)}
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(item.percent, 100)}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.categoryMeta}>
                      {item.count} операций · {item.percent.toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Расходы по месяцам</Text>

              <View style={styles.card}>
                {monthStats.map((item) => {
                  const percent =
                    maxMonthTotal > 0 ? (item.total / maxMonthTotal) * 100 : 0;

                  return (
                    <View key={item.key} style={styles.monthRow}>
                      <View style={styles.monthTop}>
                        <Text style={styles.monthLabel}>{item.label}</Text>
                        <Text style={styles.monthAmount}>
                          {formatMoney(item.total)}
                        </Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(percent, 100)}%`,
                              backgroundColor: COLORS.accent,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.categoryMeta}>
                        {item.count} операций
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Автоматизация</Text>

              <View style={styles.card}>
                <View style={styles.automationRow}>
                  <View style={styles.automationIcon}>
                    <Ionicons
                      name="sparkles-outline"
                      size={22}
                      color={COLORS.accent}
                    />
                  </View>

                  <View style={styles.automationInfo}>
                    <Text style={styles.automationTitle}>
                      Источники расходов
                    </Text>
                    <Text style={styles.automationText}>
                      Здесь позже покажем, сколько расходов добавлено вручную,
                      через QR-чек, электронный чек и регулярные платежи.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 160,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecond,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 112,
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
  },
  summaryValueSmall: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryRow: {
    marginBottom: 18,
  },
  categoryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryNameBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  categoryAmount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  progressTrack: {
    height: 9,
    backgroundColor: COLORS.cardSecond,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 7,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  categoryMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  monthRow: {
    marginBottom: 18,
  },
  monthTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  monthAmount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  automationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  automationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  automationInfo: {
    flex: 1,
  },
  automationTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  automationText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
