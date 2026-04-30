import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
  createSpendingGoal,
  deleteSpendingGoal,
  getUserSpendingGoals,
  updateSpendingGoal,
} from "../../services/goalService";
import { SpendingGoal } from "../../types/models";

type PeriodType = "month" | "year" | "custom";
type PickerField = "start" | "end" | null;

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value || 0)} ₽`;
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU");
}

function toInputDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function parseGoalDate(value?: string) {
  if (!value) return new Date();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();

  return date;
}

function getPeriodTypeLabel(periodType: PeriodType) {
  switch (periodType) {
    case "month":
      return "Месяц";
    case "year":
      return "Год";
    default:
      return "Свой период";
  }
}

export default function SpendingGoalsScreen() {
  const router = useRouter();

  const [goals, setGoals] = useState<SpendingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isActive, setIsActive] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField>(null);

  const headerTitle = useMemo(() => {
    return editingGoalId ? "Редактирование цели" : "Финансовые цели";
  }, [editingGoalId]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  async function loadGoals() {
    try {
      setIsLoading(true);

      const user = await account.get();
      const userGoals = await getUserSpendingGoals(user.$id);

      setGoals(userGoals);
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка", "Не удалось загрузить цели");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setEditingGoalId(null);
    setTitle("");
    setLimitAmount("");
    setPeriodType("month");
    setStartDate(new Date());
    setEndDate(new Date());
    setIsActive(true);
    setShowDatePicker(false);
    setPickerField(null);
  }

  function openDatePicker(field: PickerField) {
    setPickerField(field);
    setShowDatePicker(true);
  }

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      setPickerField(null);
      return;
    }

    if (!selectedDate || !pickerField) {
      return;
    }

    if (pickerField === "start") {
      setStartDate(selectedDate);

      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }

    if (pickerField === "end") {
      if (selectedDate < startDate) {
        setEndDate(startDate);
      } else {
        setEndDate(selectedDate);
      }
    }

    setShowDatePicker(false);
    setPickerField(null);
  }

  async function handleSaveGoal() {
    try {
      if (!title.trim()) {
        Alert.alert("Ошибка", "Введите название цели");
        return;
      }

      if (!limitAmount.trim()) {
        Alert.alert("Ошибка", "Введите лимит");
        return;
      }

      const parsedAmount = Number(limitAmount.replace(",", "."));

      if (!parsedAmount || parsedAmount <= 0) {
        Alert.alert("Ошибка", "Лимит должен быть больше 0");
        return;
      }

      if (endDate < startDate) {
        Alert.alert("Ошибка", "Дата окончания не может быть раньше даты начала");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      const payload = {
        userId: user.$id,
        title: title.trim(),
        limitAmount: parsedAmount,
        periodType,
        startDate: new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0,
          0,
          0,
          0
        ).toISOString(),
        endDate: new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          0,
          0,
          0,
          0
        ).toISOString(),
        isActive,
      };

      if (editingGoalId) {
        await updateSpendingGoal(editingGoalId, payload);
        Alert.alert("Готово", "Цель обновлена");
      } else {
        await createSpendingGoal(payload);
        Alert.alert("Готово", "Цель создана");
      }

      resetForm();
      await loadGoals();
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка", "Не удалось сохранить цель");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditGoal(goal: SpendingGoal) {
    setEditingGoalId(goal.$id);
    setTitle(goal.title || "");
    setLimitAmount(String(goal.limitAmount || ""));
    setPeriodType((goal.periodType as PeriodType) || "custom");
    setStartDate(parseGoalDate(goal.startDate));
    setEndDate(parseGoalDate(goal.endDate));
    setIsActive(Boolean(goal.isActive));

    setTimeout(() => {
      // просто чтобы визуально было удобнее после нажатия
    }, 0);
  }

  function confirmDeleteGoal(goal: SpendingGoal) {
    Alert.alert(
      "Удалить цель?",
      `Цель "${goal.title}" будет удалена без возможности восстановления.`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => handleDeleteGoal(goal.$id),
        },
      ]
    );
  }

  async function handleDeleteGoal(goalId: string) {
    try {
      await deleteSpendingGoal(goalId);

      if (editingGoalId === goalId) {
        resetForm();
      }

      await loadGoals();
      Alert.alert("Готово", "Цель удалена");
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка", "Не удалось удалить цель");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{headerTitle}</Text>

          <View style={styles.headerGhost} />
        </View>

        <View style={styles.formCard}>
          <View style={styles.formCardTop}>
            <View>
              <Text style={styles.formTitle}>
                {editingGoalId ? "Редактирование" : "Новая цель"}
              </Text>
              <Text style={styles.formSubtitle}>
                Укажи лимит и период, в который нужно уложиться
              </Text>
            </View>

            {editingGoalId ? (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>EDIT</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.label}>Название цели</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Лимит на май"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Лимит</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: 30000"
            placeholderTextColor={COLORS.textMuted}
            value={limitAmount}
            onChangeText={setLimitAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Тип периода</Text>
          <View style={styles.segmentRow}>
            {(["month", "year", "custom"] as PeriodType[]).map((item) => {
              const isSelected = periodType === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.segmentButton,
                    isSelected && styles.segmentButtonActive,
                  ]}
                  onPress={() => setPeriodType(item)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      isSelected && styles.segmentButtonTextActive,
                    ]}
                  >
                    {getPeriodTypeLabel(item)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Период цели</Text>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => openDatePicker("start")}
            >
              <View style={styles.dateFieldIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={COLORS.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateFieldLabel}>Начало</Text>
                <Text style={styles.dateFieldValue}>
                  {formatDate(startDate)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateField}
              onPress={() => openDatePicker("end")}
            >
              <View style={styles.dateFieldIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={COLORS.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateFieldLabel}>Конец</Text>
                <Text style={styles.dateFieldValue}>{formatDate(endDate)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Активная цель</Text>
              <Text style={styles.switchSubtitle}>
                Неактивная цель сохранится в списке, но будет выключена
              </Text>
            </View>

            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{
                false: COLORS.border,
                true: `${COLORS.accent}66`,
              }}
              thumbColor={isActive ? COLORS.accent : "#8E95A5"}
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveGoal}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={editingGoalId ? "save-outline" : "add-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.primaryButtonText}>
                    {editingGoalId ? "Сохранить изменения" : "Создать цель"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {editingGoalId ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={resetForm}
              >
                <Text style={styles.secondaryButtonText}>Отмена</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Мои цели</Text>
          <Text style={styles.listCounter}>{goals.length}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка целей...</Text>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flag-outline" size={26} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Целей пока нет</Text>
            <Text style={styles.emptySubtitle}>
              Создай первую цель, чтобы отслеживать лимит расходов на нужный
              период
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const isEditingThis = editingGoalId === goal.$id;

            return (
              <View
                key={goal.$id}
                style={[
                  styles.goalCard,
                  isEditingThis && styles.goalCardEditing,
                ]}
              >
                <View style={styles.goalTopRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalAmount}>
                      {formatMoney(goal.limitAmount)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      goal.isActive
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        goal.isActive
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {goal.isActive ? "Активна" : "Неактивна"}
                    </Text>
                  </View>
                </View>

                <View style={styles.goalInfoRow}>
                  <View style={styles.goalInfoItem}>
                    <Text style={styles.goalInfoLabel}>Тип</Text>
                    <Text style={styles.goalInfoValue}>
                      {getPeriodTypeLabel(
                        (goal.periodType as PeriodType) || "custom"
                      )}
                    </Text>
                  </View>

                  <View style={styles.goalInfoItem}>
                    <Text style={styles.goalInfoLabel}>Период</Text>
                    <Text style={styles.goalInfoValue}>
                      {formatDate(goal.startDate)} — {formatDate(goal.endDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.goalButtonsRow}>
                  <TouchableOpacity
                    style={styles.goalEditButton}
                    onPress={() => handleEditGoal(goal)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={COLORS.text}
                    />
                    <Text style={styles.goalEditButtonText}>Редактировать</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.goalDeleteButton}
                    onPress={() => confirmDeleteGoal(goal)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={COLORS.danger}
                    />
                    <Text style={styles.goalDeleteButtonText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
       <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalCard}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>
                {pickerField === "start"
                  ? "Выберите дату начала"
                  : "Выберите дату окончания"}
              </Text>

              <TouchableOpacity
                style={styles.dateModalCloseButton}
                onPress={() => {
                  setShowDatePicker(false);
                  setPickerField(null);
                }}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalPreview}>
              <Text style={styles.dateModalPreviewLabel}>
                {pickerField === "start" ? "Текущая дата начала" : "Текущая дата окончания"}
              </Text>

              <Text style={styles.dateModalPreviewValue}>
                {formatDate(pickerField === "start" ? startDate : endDate)}
              </Text>
            </View>

            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={pickerField === "start" ? startDate : endDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                onChange={handleDateChange}
                minimumDate={pickerField === "end" ? startDate : undefined}
              />
            </View>
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
    marginBottom: 18,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerGhost: {
    width: 42,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  formCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  formSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 240,
  },
  editBadge: {
    backgroundColor: `${COLORS.accent}22`,
    borderColor: `${COLORS.accent}44`,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "900",
  },

  label: {
    color: COLORS.textSecond,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 4,
  },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSecond,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  segmentButtonText: {
    color: COLORS.textSecond,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentButtonTextActive: {
    color: "#fff",
  },

  dateRow: {
    gap: 10,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  dateFieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.accent}18`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateFieldLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  dateFieldValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },

  switchRow: {
    marginTop: 16,
    marginBottom: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  switchSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  actionsRow: {
    gap: 10,
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSecond,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  listTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginRight: 8,
  },
  listCounter: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    backgroundColor: COLORS.accent,
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 26,
  },

  loadingCard: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 10,
    fontSize: 14,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: `${COLORS.accent}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  goalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  goalCardEditing: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  goalTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  goalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  goalAmount: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: "900",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.24)",
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderColor: "rgba(148, 163, 184, 0.24)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  statusBadgeTextActive: {
    color: "#10B981",
  },
  statusBadgeTextInactive: {
    color: "#94A3B8",
  },

  goalInfoRow: {
    gap: 10,
    marginBottom: 14,
  },
  goalInfoItem: {
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
  },
  goalInfoLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 5,
  },
  goalInfoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },

  goalButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  goalEditButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  goalEditButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  goalDeleteButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  goalDeleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    padding: 18,
  },
  dateModalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateModalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  dateModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardSecond,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateModalPreview: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  dateModalPreviewLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 5,
  },
  dateModalPreviewValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  datePickerWrapper: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});