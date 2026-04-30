import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import ExpenseDonutChart from "../../components/ExpenseDonutChart";
import {
  buildCategoryChartData,
  ChartPeriod,
  getExpensesByDateRange,
  getExpensesByPeriod,
} from "../../services/statisticsService";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  getCategoryColor,
  getCategoryName,
  getUserCategories,
} from "../../services/categoryService";
import {
  deleteExpense,
  getCurrentMonthExpenses,
  getTotalAmount,
  getUserExpenses,
  updateExpense,
} from "../../services/expenseService";
import { Category, Expense } from "../../types/models";
import { formatDate, formatMoney } from "../../utils/format";
import { processDueRecurringExpenses } from "../../services/recurringExpenseService";
import { saveCategoryRuleFromText } from "../../services/categoryRuleService";

export default function HomeScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>("month");

  const [isPeriodModalVisible, setIsPeriodModalVisible] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [periodEndDate, setPeriodEndDate] = useState(() => new Date());
  const [tempStartDate, setTempStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tempEndDate, setTempEndDate] = useState(() => new Date());

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [rangeSelectionStep, setRangeSelectionStep] = useState<"start" | "end">(
    "start"
  );

  const periodExpenses = useMemo(() => {
    if (selectedPeriod === "custom") {
      return getExpensesByDateRange(expenses, periodStartDate, periodEndDate);
    }

    return getExpensesByPeriod(expenses, selectedPeriod);
  }, [expenses, selectedPeriod, periodStartDate, periodEndDate]);

  const periodTotal = useMemo(() => {
    return getTotalAmount(periodExpenses);
  }, [periodExpenses]);

  const chartData = useMemo(() => {
    return buildCategoryChartData({
      expenses: periodExpenses,
      categories,
    });
  }, [periodExpenses, categories]);

  const filteredExpenses = useMemo(() => {
    const sortedExpenses = [...periodExpenses].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    if (!selectedCategoryId) {
      return sortedExpenses;
    }

    return sortedExpenses.filter(
      (expense) => expense.categoryId === selectedCategoryId
    );
  }, [periodExpenses, selectedCategoryId]);

  function handleChangeChartPeriod(period: ChartPeriod) {
    setSelectedPeriod(period);
    setSelectedCategoryId(null);
    setIsPeriodModalVisible(false);

    const now = new Date();

    if (period === "week") {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      start.setHours(0, 0, 0, 0);

      setPeriodStartDate(start);
      setPeriodEndDate(now);
    }

    if (period === "month") {
      setPeriodStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setPeriodEndDate(now);
    }

    if (period === "year") {
      setPeriodStartDate(new Date(now.getFullYear(), 0, 1));
      setPeriodEndDate(now);
    }
  }

  function formatPeriodDate(date: Date) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function getCurrentPeriodTitle() {
    if (selectedPeriod === "week") {
      return "Неделя";
    }

    if (selectedPeriod === "year") {
      return "Год";
    }

    if (selectedPeriod === "custom") {
      return `${formatPeriodDate(periodStartDate)} — ${formatPeriodDate(
        periodEndDate
      )}`;
    }

    return "Месяц";
  }

  function openPeriodModal() {
    setTempStartDate(periodStartDate);
    setTempEndDate(periodEndDate);
    setCalendarMonth(
      new Date(periodStartDate.getFullYear(), periodStartDate.getMonth(), 1)
    );
    setRangeSelectionStep("start");
    setIsPeriodModalVisible(true);
  }

  function handleApplyCustomPeriod() {
    if (tempStartDate > tempEndDate) {
      Alert.alert("Ошибка", "Дата начала не может быть позже даты окончания");
      return;
    }

    setPeriodStartDate(tempStartDate);
    setPeriodEndDate(tempEndDate);
    setSelectedPeriod("custom");
    setSelectedCategoryId(null);
    setIsPeriodModalVisible(false);
  }

  function normalizeDate(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function isSameCalendarDay(firstDate: Date, secondDate: Date) {
    const first = normalizeDate(firstDate);
    const second = normalizeDate(secondDate);

    return first.getTime() === second.getTime();
  }

  function isDateBetween(date: Date, startDate: Date, endDate: Date) {
    const current = normalizeDate(date).getTime();
    const start = normalizeDate(startDate).getTime();
    const end = normalizeDate(endDate).getTime();

    return current > start && current < end;
  }

  function isDateAfterToday(date: Date) {
    const today = normalizeDate(new Date());
    const current = normalizeDate(date);

    return current.getTime() > today.getTime();
  }

  function getCalendarMonthTitle(date: Date) {
    return new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function getCalendarDays(monthDate: Date) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();

    // getDay(): 0 — воскресенье, 1 — понедельник.
    // Делаем начало недели с понедельника.
    const firstWeekDay = (firstDayOfMonth.getDay() + 6) % 7;

    const days: Array<Date | null> = [];

    for (let i = 0; i < firstWeekDay; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }

  function goToPreviousMonth() {
    setCalendarMonth((current) => {
      return new Date(current.getFullYear(), current.getMonth() - 1, 1);
    });
  }

  function goToNextMonth() {
    const nextMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      1
    );

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    if (nextMonth > currentMonthStart) {
      return;
    }

    setCalendarMonth(nextMonth);
  }

  function handleSelectCalendarDay(date: Date) {
    if (isDateAfterToday(date)) {
      return;
    }

    const selectedDate = normalizeDate(date);

    if (rangeSelectionStep === "start") {
      setTempStartDate(selectedDate);
      setTempEndDate(selectedDate);
      setRangeSelectionStep("end");
      return;
    }

    if (selectedDate < normalizeDate(tempStartDate)) {
      setTempEndDate(tempStartDate);
      setTempStartDate(selectedDate);
    } else {
      setTempEndDate(selectedDate);
    }

    setRangeSelectionStep("start");
  }

  const selectedCategoryName = selectedCategoryId
    ? getCategoryName(categories, selectedCategoryId)
    : null;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      setIsLoading(true);

      const user = await account.get();

      await processDueRecurringExpenses(user.$id);

      const [loadedCategories, loadedExpenses] = await Promise.all([
        getUserCategories(user.$id),
        getUserExpenses(user.$id),
      ]);

      setCategories(loadedCategories);
      setExpenses(loadedExpenses);
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка", "Не удалось загрузить расходы");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData();
  }

  function openEditExpenseModal(expense: Expense) {
    setSelectedExpense(expense);
    setEditAmount(String(expense.amount || ""));
    setEditNote(expense.note || expense.merchantName || "");
    setEditCategoryId(expense.categoryId);
    setIsEditModalVisible(true);
  }

  function closeEditExpenseModal() {
    if (isSaving) {
      return;
    }

    setSelectedExpense(null);
    setEditAmount("");
    setEditNote("");
    setEditCategoryId("");
    setIsEditModalVisible(false);
  }

  async function handleSaveExpenseChanges() {
    try {
      if (!selectedExpense) {
        return;
      }

      const normalizedAmount = editAmount.replace(",", ".");
      const amountNumber = Number(normalizedAmount);

      if (!editAmount.trim()) {
        Alert.alert("Ошибка", "Введите сумму расхода");
        return;
      }

      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        Alert.alert("Ошибка", "Введите корректную сумму");
        return;
      }

      if (!editCategoryId) {
        Alert.alert("Ошибка", "Выберите категорию");
        return;
      }

      setIsSaving(true);

      await updateExpense({
        expenseId: selectedExpense.$id,
        amount: amountNumber,
        categoryId: editCategoryId,
        note: editNote.trim(),
      });

      const user = await account.get();

      await saveCategoryRuleFromText({
        userId: user.$id,
        text: editNote.trim(),
        categoryId: editCategoryId,
      });

      closeEditExpenseModal();
      await loadData();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Ошибка", error?.message || "Не удалось изменить расход");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    Alert.alert("Удалить расход?", "Это действие нельзя отменить", [
      {
        text: "Отмена",
        style: "cancel",
      },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExpense(expenseId);
            closeEditExpenseModal();
            await loadData();
          } catch (error) {
            console.error(error);
            Alert.alert("Ошибка", "Не удалось удалить расход");
          }
        },
      },
    ]);
  }

  function getSourceLabel(sourceType?: string) {
    if (sourceType === "manual") {
      return "вручную";
    }

    if (sourceType === "receipt_qr") {
      return "QR-чек";
    }

    if (sourceType === "receipt_ocr") {
      return "чек";
    }

    if (sourceType === "recurring") {
      return "регулярно";
    }

    if (sourceType === "receipt_qr") {
      return "QR-чек";
    }

    return "расход";
  }

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
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Добро пожаловать</Text>
            <Text style={styles.title}>Мои расходы</Text>
          </View>

          <View style={styles.iconButton}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.text}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.balanceCard}
          activeOpacity={0.88}
          onPress={openPeriodModal}
        >
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.cardLabel}>Расходы за период</Text>
              <Text style={styles.periodLabel}>{getCurrentPeriodTitle()}</Text>
            </View>

            <View style={styles.calendarButton}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
            </View>
          </View>

          <Text style={styles.amount}>{formatMoney(periodTotal)}</Text>

          <Text style={styles.cardHint}>
            Нажмите на карточку, чтобы выбрать даты в календаре
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.goalButton}
          onPress={() => router.push("/spending-goals")}
          activeOpacity={0.88}
        >
          <View style={styles.goalButtonIcon}>
            <Ionicons name="flag-outline" size={22} color={COLORS.accent} />
          </View>

          <View style={styles.goalButtonTextBox}>
            <Text style={styles.goalButtonTitle}>Финансовые цели</Text>
            <Text style={styles.goalButtonSubtitle}>
              Установить лимит расходов на период
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Автоматизация</Text>

          <View style={styles.automationGrid}>
            <View style={styles.smallCard}>
              <Ionicons name="qr-code-outline" size={26} color={COLORS.accent} />
              <Text style={styles.smallCardTitle}>QR-чек</Text>
              <Text style={styles.smallCardText}>Сканирование чека</Text>
            </View>

            <View style={styles.smallCard}>
              <Ionicons
                name="document-text-outline"
                size={26}
                color={COLORS.accent}
              />
                <Text style={styles.smallCardTitle}>Электронный чек</Text>
                <Text style={styles.smallCardText}>Чек по операции</Text>
            </View>

            <View style={styles.smallCard}>
              <Ionicons name="repeat-outline" size={26} color={COLORS.accent} />
              <Text style={styles.smallCardTitle}>Регулярные</Text>
              <Text style={styles.smallCardText}>Автосписания</Text>
            </View>

            <View style={styles.smallCard}>
              <Ionicons
                name="sparkles-outline"
                size={26}
                color={COLORS.accent}
              />
              <Text style={styles.smallCardTitle}>Обучение</Text>
              <Text style={styles.smallCardText}>Правила категорий</Text>
            </View>
          </View>
          <ExpenseDonutChart
            data={chartData}
            totalAmount={periodTotal}
            selectedCategoryId={selectedCategoryId}
            selectedPeriod={selectedPeriod}
            onSelectCategory={setSelectedCategoryId}
            onChangePeriod={handleChangeChartPeriod}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategoryName
                ? `Операции: ${selectedCategoryName}`
                : selectedPeriod === "week"
                  ? "Операции за неделю"
                  : selectedPeriod === "year"
                  ? "Операции за год"
                  : "Операции за месяц"}
            </Text>

            {selectedCategoryId ? (
              <TouchableOpacity onPress={() => setSelectedCategoryId(null)}>
                <Text style={styles.clearFilter}>Сбросить</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.emptyTitle}>Загрузка расходов...</Text>
            </View>
          ) : filteredExpenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="receipt-outline"
                size={34}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyTitle}>Расходов пока нет</Text>
              <Text style={styles.emptyText}>
                Добавьте первую трату вручную через кнопку +
              </Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {filteredExpenses.map((expense) => {
                const categoryName = getCategoryName(
                  categories,
                  expense.categoryId
                );

                const categoryColor = getCategoryColor(
                  categories,
                  expense.categoryId
                );

                return (
                  <TouchableOpacity
                    key={expense.$id}
                    style={styles.expenseCard}
                    onPress={() => openEditExpenseModal(expense)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.expenseIcon,
                        { backgroundColor: `${categoryColor}22` },
                      ]}
                    >
                      <View
                        style={[
                          styles.expenseDot,
                          { backgroundColor: categoryColor },
                        ]}
                      />
                    </View>

                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle}>{categoryName}</Text>
                      <Text style={styles.expenseSubtitle}>
                        {expense.note || expense.merchantName || "Без описания"} ·{" "}
                        {formatDate(expense.date)}
                      </Text>
                    </View>

                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>
                        -{formatMoney(Number(expense.amount || 0))}
                      </Text>

                      <Text style={styles.sourceType}>
                        {getSourceLabel(expense.sourceType)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Расход</Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeEditExpenseModal}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Сумма</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={editAmount}
              onChangeText={setEditAmount}
            />

            <Text style={styles.label}>Комментарий</Text>
            <TextInput
              style={styles.input}
              placeholder="Описание расхода"
              placeholderTextColor={COLORS.textMuted}
              value={editNote}
              onChangeText={setEditNote}
            />

            <Text style={styles.label}>Категория</Text>
            <View style={styles.categoryChips}>
              {categories.map((category) => {
                const isSelected = editCategoryId === category.$id;

                return (
                  <TouchableOpacity
                    key={category.$id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => setEditCategoryId(category.$id)}
                  >
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color || COLORS.accent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveExpenseChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Сохранить изменения</Text>
              )}
            </TouchableOpacity>

            {selectedExpense ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteExpense(selectedExpense.$id)}
              >
                <Text style={styles.deleteButtonText}>Удалить расход</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal visible={isPeriodModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выбор периода</Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsPeriodModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.periodPreviewCard}>
              <Text style={styles.periodPreviewLabel}>
                {rangeSelectionStep === "start"
                  ? "Выберите дату начала"
                  : "Теперь выберите дату окончания"}
              </Text>

              <Text style={styles.periodPreviewValue}>
                {formatPeriodDate(tempStartDate)} — {formatPeriodDate(tempEndDate)}
              </Text>
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.calendarArrowButton}
                  onPress={goToPreviousMonth}
                >
                  <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>

                <Text style={styles.calendarTitle}>
                  {getCalendarMonthTitle(calendarMonth)}
                </Text>

                <TouchableOpacity
                  style={styles.calendarArrowButton}
                  onPress={goToNextMonth}
                >
                  <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekDaysRow}>
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <Text key={day} style={styles.weekDayText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {getCalendarDays(calendarMonth).map((date, index) => {
                  if (!date) {
                    return <View key={`empty_${index}`} style={styles.calendarDay} />;
                  }

                  const isStart = isSameCalendarDay(date, tempStartDate);
                  const isEnd = isSameCalendarDay(date, tempEndDate);
                  const isBetween = isDateBetween(date, tempStartDate, tempEndDate);
                  const isToday = isSameCalendarDay(date, new Date());
                  const isDisabled = isDateAfterToday(date);

                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={styles.calendarDay}
                      onPress={() => handleSelectCalendarDay(date)}
                      disabled={isDisabled}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.rangeBackground,
                          isBetween && styles.rangeBackgroundActive,
                          isStart && styles.rangeBackgroundStart,
                          isEnd && styles.rangeBackgroundEnd,
                        ]}
                      >
                        <View
                          style={[
                            styles.dayCircle,
                            isToday && styles.dayCircleToday,
                            (isStart || isEnd) && styles.dayCircleSelected,
                            isDisabled && styles.dayCircleDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isToday && styles.dayTextToday,
                              (isStart || isEnd) && styles.dayTextSelected,
                              isDisabled && styles.dayTextDisabled,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.quickPeriodsRow}>
              <TouchableOpacity
                style={styles.quickPeriodButton}
                onPress={() => handleChangeChartPeriod("week")}
              >
                <Text style={styles.quickPeriodText}>Неделя</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickPeriodButton}
                onPress={() => handleChangeChartPeriod("month")}
              >
                <Text style={styles.quickPeriodText}>Месяц</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickPeriodButton}
                onPress={() => handleChangeChartPeriod("year")}
              >
                <Text style={styles.quickPeriodText}>Год</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleApplyCustomPeriod}
            >
              <Text style={styles.saveButtonText}>Применить период</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  goalButton: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  goalButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  goalButtonTextBox: {
    flex: 1,
  },
  goalButtonTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  goalButtonSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    marginLeft: 8,
    color: COLORS.white,
    fontSize: 16,
  },
  calendarCard: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarArrowButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayText: {
    width: `${100 / 7}%`,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeBackground: {
    width: "100%",
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeBackgroundActive: {
    backgroundColor: COLORS.accentSoft,
  },
  rangeBackgroundStart: {
    backgroundColor: COLORS.accentSoft,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  rangeBackgroundEnd: {
    backgroundColor: COLORS.accentSoft,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  dayCircleSelected: {
    backgroundColor: COLORS.accent,
    borderWidth: 0,
  },
  dayCircleDisabled: {
    opacity: 0.35,
  },
  dayText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  dayTextToday: {
    color: COLORS.accent,
  },
  dayTextSelected: {
    color: COLORS.white,
  },
  dayTextDisabled: {
    color: COLORS.textMuted,
  },
  quickPeriodsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  quickPeriodButton: {
    flex: 1,
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPeriodText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  periodLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },
  calendarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  periodPreviewCard: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  periodPreviewLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 5,
  },
  periodPreviewValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  clearFilter: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  hello: {
    color: COLORS.textSecond,
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  cardLabel: {
    color: COLORS.textSecond,
    fontSize: 15,
    marginBottom: 10,
  },
  amount: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 10,
  },
  cardHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
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
  automationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  smallCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  smallCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 4,
  },
  smallCardText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
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
  expensesList: {
    gap: 12,
  },
  expenseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  expenseDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  expenseSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  expenseRight: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  sourceType: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardSecond,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    marginBottom: 18,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardSecond,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryChipText: {
    color: COLORS.textSecond,
    fontSize: 14,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "900",
  },
});