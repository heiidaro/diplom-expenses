import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  findCategoryByText,
  saveCategoryRuleFromText,
} from "../../services/categoryRuleService";
import { getUserCategories } from "../../services/categoryService";
import { createManualExpense } from "../../services/expenseService";
import { Category } from "../../types/models";

export default function ManualExpenseScreen() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setIsLoading(true);

      const user = await account.get();
      const userCategories = await getUserCategories(user.$id);

      setCategories(userCategories);

      if (userCategories.length > 0) {
        const otherCategory =
          userCategories.find((category) =>
            category.name.toLowerCase().includes("другое"),
          ) || userCategories[0];

        setSelectedCategoryId(otherCategory.$id);
      }
    } catch (error: any) {
      if (isGuestOrSessionError(error)) {
        return;
      }

      console.log("Ошибка:", error);

      Alert.alert("Ошибка", error?.message || "Что-то пошло не так");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      const normalizedAmount = amount.replace(",", ".");
      const amountNumber = Number(normalizedAmount);
      const roundedAmount = Math.round(amountNumber * 100) / 100;

      if (!amount.trim()) {
        Alert.alert("Ошибка", "Введите сумму расхода");
        return;
      }

      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        Alert.alert("Ошибка", "Введите корректную сумму");
        return;
      }

      if (!selectedCategoryId) {
        Alert.alert("Ошибка", "Выберите категорию");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      await createManualExpense({
        userId: user.$id,
        amount: roundedAmount,
        categoryId: selectedCategoryId,
        note: note.trim(),
        date: new Date().toISOString(),
      });

      await saveCategoryRuleFromText({
        userId: user.$id,
        text: note.trim(),
        categoryId: selectedCategoryId,
      });

      Alert.alert("Готово", "Расход добавлен", [
        {
          text: "ОК",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      if (isGuestOrSessionError(error)) {
        return;
      }

      console.log("Ошибка:", error);

      Alert.alert("Ошибка", error?.message || "Что-то пошло не так");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <Text style={styles.title}>Новая трата</Text>

            <View style={{ width: 44 }} />
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Сумма</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View>
              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: кофе, продукты, такси"
                placeholderTextColor={COLORS.textMuted}
                value={note}
                onChangeText={async (value) => {
                  setNote(value);

                  try {
                    const user = await account.get();
                    const matchedCategoryId = await findCategoryByText({
                      userId: user.$id,
                      text: value,
                    });

                    if (matchedCategoryId) {
                      setSelectedCategoryId(matchedCategoryId);
                    }
                  } catch {
                    // Автоподбор категории не должен ломать ручное добавление
                  }
                }}
              />
            </View>

            <View>
              <Text style={styles.label}>Категория</Text>

              {isLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator color={COLORS.accent} />
                  <Text style={styles.loadingText}>Загрузка категорий...</Text>
                </View>
              ) : categories.length === 0 ? (
                <View style={styles.infoCard}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={22}
                    color={COLORS.warning}
                  />
                  <Text style={styles.infoText}>
                    Категории не найдены. Добавьте категории в Appwrite или на
                    экране категорий.
                  </Text>
                </View>
              ) : (
                <View style={styles.categoriesList}>
                  {categories.map((category) => {
                    const isSelected = selectedCategoryId === category.$id;

                    return (
                      <TouchableOpacity
                        key={category.$id}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategoryId(category.$id)}
                      >
                        <View
                          style={[
                            styles.categoryDot,
                            {
                              backgroundColor: category.color || COLORS.accent,
                            },
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
              )}
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={COLORS.accent}
              />
              <Text style={styles.infoText}>
                После сохранения приложение запомнит связь между комментарием и
                категорией. В следующий раз категория сможет подставиться
                автоматически.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Сохранить</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboard: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  form: {
    gap: 18,
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: COLORS.textSecond,
    fontSize: 14,
  },
  categoriesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
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
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
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
  saveText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
});
