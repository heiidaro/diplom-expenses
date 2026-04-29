import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
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
  createRecurringExpense,
  deleteRecurringExpense,
  getUserRecurringExpenses,
  updateRecurringExpense,
} from "../../services/recurringExpenseService";
import { Category, RecurringExpense } from "../../types/models";
import { formatDate, formatMoney } from "../../utils/format";

export default function RecurringExpensesScreen() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      setIsLoading(true);

      const user = await account.get();

      const [loadedCategories, loadedItems] = await Promise.all([
        getUserCategories(user.$id),
        getUserRecurringExpenses(user.$id),
      ]);

      setCategories(loadedCategories);
      setItems(loadedItems);

      if (!categoryId && loadedCategories.length > 0) {
        setCategoryId(loadedCategories[0].$id);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить регулярные расходы"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData();
  }

  function openCreateModal() {
    setEditingItem(null);
    setTitle("");
    setAmount("");
    setDayOfMonth("1");
    setCategoryId(categories[0]?.$id || "");
    setIsActive(true);
    setIsModalVisible(true);
  }

  function openEditModal(item: RecurringExpense) {
    setEditingItem(item);
    setTitle(item.title);
    setAmount(String(item.amount));
    setDayOfMonth(String(item.dayOfMonth || 1));
    setCategoryId(item.categoryId);
    setIsActive(item.isActive);
    setIsModalVisible(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalVisible(false);
    setEditingItem(null);
    setTitle("");
    setAmount("");
    setDayOfMonth("1");
    setCategoryId("");
    setIsActive(true);
  }

  async function handleSave() {
    try {
      const normalizedAmount = amount.replace(",", ".");
      const amountNumber = Number(normalizedAmount);
      const dayNumber = Number(dayOfMonth);

      if (!title.trim()) {
        Alert.alert("Ошибка", "Введите название регулярного расхода");
        return;
      }

      if (!amount.trim() || Number.isNaN(amountNumber) || amountNumber <= 0) {
        Alert.alert("Ошибка", "Введите корректную сумму");
        return;
      }

      if (
        !dayOfMonth.trim() ||
        Number.isNaN(dayNumber) ||
        dayNumber < 1 ||
        dayNumber > 28
      ) {
        Alert.alert("Ошибка", "Введите число месяца от 1 до 28");
        return;
      }

      if (!categoryId) {
        Alert.alert("Ошибка", "Выберите категорию");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      if (editingItem) {
        await updateRecurringExpense({
          recurringId: editingItem.$id,
          title: title.trim(),
          amount: amountNumber,
          categoryId,
          dayOfMonth: dayNumber,
          isActive,
        });
      } else {
        await createRecurringExpense({
          userId: user.$id,
          title: title.trim(),
          amount: amountNumber,
          categoryId,
          dayOfMonth: dayNumber,
        });
      }

      closeModal();
      await loadData();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось сохранить регулярный расход"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(item: RecurringExpense) {
    Alert.alert(
      "Удалить регулярный расход?",
      "Будущие автоматические списания по этому правилу больше не будут создаваться.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecurringExpense(item.$id);
              await loadData();
            } catch (error: any) {
              console.error(error);
              Alert.alert(
                "Ошибка",
                error?.message || "Не удалось удалить регулярный расход"
              );
            }
          },
        },
      ]
    );
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Регулярные расходы</Text>

          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="repeat-outline" size={26} color={COLORS.accent} />
          <View style={styles.infoTextBox}>
            <Text style={styles.infoTitle}>Автоматическое внесение трат</Text>
            <Text style={styles.infoText}>
              Создайте шаблон расхода, и приложение будет само добавлять трату
              при наступлении указанной даты.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Загрузка...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Регулярных расходов пока нет</Text>
            <Text style={styles.emptyText}>
              Нажмите +, чтобы создать первый шаблон
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const color = getCategoryColor(categories, item.categoryId);

              return (
                <TouchableOpacity
                  key={item.$id}
                  style={styles.itemCard}
                  activeOpacity={0.85}
                  onPress={() => openEditModal(item)}
                  onLongPress={() => confirmDelete(item)}
                >
                  <View
                    style={[
                      styles.itemIcon,
                      { backgroundColor: `${color}22` },
                    ]}
                  >
                    <Ionicons name="repeat-outline" size={24} color={color} />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>
                      {getCategoryName(categories, item.categoryId)} ·{" "}
                      {item.dayOfMonth} число каждого месяца
                    </Text>
                    <Text style={styles.itemDate}>
                      Следующее списание: {formatDate(item.nextRunAt)}
                    </Text>
                  </View>

                  <View style={styles.itemRight}>
                    <Text style={styles.itemAmount}>
                      {formatMoney(Number(item.amount || 0))}
                    </Text>
                    <Text
                      style={[
                        styles.itemStatus,
                        item.isActive ? styles.itemStatusActive : null,
                      ]}
                    >
                      {item.isActive ? "активно" : "выкл."}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={isModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? "Изменить шаблон" : "Новый шаблон"}
              </Text>

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: Интернет"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Сумма</Text>
            <TextInput
              style={styles.input}
              placeholder="700"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Число месяца</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
            />
            <Text style={styles.fieldHint}>
              Укажите, какого числа каждого месяца будет автоматически добавляться этот расход.
            </Text>

            <Text style={styles.label}>Категория</Text>
            <View style={styles.categoryChips}>
              {categories.map((category) => {
                const isSelected = categoryId === category.$id;

                return (
                  <TouchableOpacity
                    key={category.$id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategoryId(category.$id)}
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

            {editingItem ? (
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Активно</Text>
                  <Text style={styles.switchText}>
                    Если выключить, новые расходы создаваться не будут
                  </Text>
                </View>

                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{
                    false: COLORS.cardSecond,
                    true: COLORS.accent,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingItem ? "Сохранить изменения" : "Создать шаблон"}
                </Text>
              )}
            </TouchableOpacity>

            {editingItem ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(editingItem)}
              >
                <Text style={styles.deleteButtonText}>Удалить шаблон</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    marginBottom: 18,
  },
  infoTextBox: {
    flex: 1,
    marginLeft: 14,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  infoText: {
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
  list: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  itemSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  itemDate: {
    color: COLORS.textSecond,
    fontSize: 12,
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemAmount: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
  },
  itemStatus: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  itemStatusActive: {
    color: COLORS.success,
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
    maxHeight: "92%",
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
    marginBottom: 8,
  },
  fieldHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 18,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
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
  switchRow: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  switchTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  switchText: {
    color: COLORS.textMuted,
    fontSize: 12,
    maxWidth: 220,
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