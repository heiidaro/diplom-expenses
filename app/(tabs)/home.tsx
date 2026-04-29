import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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

  const monthExpenses = getCurrentMonthExpenses(expenses);
  const monthTotal = getTotalAmount(monthExpenses);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
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

    if (sourceType === "bank_import") {
      return "выписка";
    }

    if (sourceType === "recurring") {
      return "регулярно";
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

        <View style={styles.balanceCard}>
          <Text style={styles.cardLabel}>Расходы за месяц</Text>
          <Text style={styles.amount}>{formatMoney(monthTotal)}</Text>
          <Text style={styles.cardHint}>
            Учитываются расходы за текущий календарный месяц
          </Text>
        </View>

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
              <Text style={styles.smallCardTitle}>Выписка</Text>
              <Text style={styles.smallCardText}>Импорт из банка</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Последние операции</Text>

          {isLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.emptyTitle}>Загрузка расходов...</Text>
            </View>
          ) : expenses.length === 0 ? (
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
              {expenses.map((expense) => {
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