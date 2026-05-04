import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { updateMyActivity } from "../../services/activityService";
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
  createCategory,
  deleteCategory,
  getUserCategories,
  updateCategory,
} from "../../services/categoryService";
import { Category } from "../../types/models";

const COLOR_OPTIONS = [
  "#FF6B35",
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#9CA3AF",
];

function getCategoryIcon(name: string) {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("продукт")) {
    return "cart-outline";
  }

  if (normalizedName.includes("транспорт")) {
    return "car-outline";
  }

  if (normalizedName.includes("здоров")) {
    return "medkit-outline";
  }

  if (normalizedName.includes("развлеч")) {
    return "game-controller-outline";
  }

  if (normalizedName.includes("другое")) {
    return "ellipsis-horizontal-outline";
  }

  return "pricetag-outline";
}

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      updateMyActivity("categories");
    }, [])
  );

  async function loadCategories() {
    try {
      setIsLoading(true);

      const user = await account.get();
      const loadedCategories = await getUserCategories(user.$id);

      setCategories(loadedCategories);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить категории"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadCategories();
  }

  function openCreateModal() {
    setEditingCategory(null);
    setCategoryName("");
    setSelectedColor(COLOR_OPTIONS[0]);
    setIsModalVisible(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setSelectedColor(category.color || COLOR_OPTIONS[0]);
    setIsModalVisible(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalVisible(false);
    setEditingCategory(null);
    setCategoryName("");
    setSelectedColor(COLOR_OPTIONS[0]);
  }

  async function handleSaveCategory() {
    try {
      const trimmedName = categoryName.trim();

      if (!trimmedName) {
        Alert.alert("Ошибка", "Введите название категории");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      if (editingCategory) {
        if (editingCategory.isDefault) {
          Alert.alert("Нельзя изменить", "Базовую категорию нельзя изменять");
          return;
        }

        await updateCategory({
          categoryId: editingCategory.$id,
          name: trimmedName,
          color: selectedColor,
        });
      } else {
        await createCategory({
          userId: user.$id,
          name: trimmedName,
          color: selectedColor,
        });
      }

      closeModal();
      await loadCategories();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось сохранить категорию"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCategoryPress(category: Category) {
    if (category.isDefault) {
      Alert.alert(
        "Базовая категория",
        "Эта категория создана системой. Ее нельзя изменить или удалить."
      );
      return;
    }

    Alert.alert(category.name, "Что сделать с категорией?", [
      {
        text: "Отмена",
        style: "cancel",
      },
      {
        text: "Изменить",
        onPress: () => openEditModal(category),
      },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => confirmDeleteCategory(category),
      },
    ]);
  }

  function confirmDeleteCategory(category: Category) {
    Alert.alert(
      "Удалить категорию?",
      "Удалять категорию стоит только если в ней нет расходов. Иначе расходы будут ссылаться на несуществующую категорию.",
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
              await deleteCategory(category.$id);
              await loadCategories();
            } catch (error: any) {
              console.error(error);
              Alert.alert(
                "Ошибка",
                error?.message || "Не удалось удалить категорию"
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
          <View style={styles.headerText}>
            <Text style={styles.title}>Категории</Text>
            <Text style={styles.subtitle}>
              Управление категориями расходов из Appwrite
            </Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Загрузка категорий...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="grid-outline" size={34} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Категорий пока нет</Text>
            <Text style={styles.emptyText}>
              Проверьте права доступа к таблице categories в Appwrite
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {categories.map((category) => {
              const color = category.color || COLORS.accent;

              return (
                <TouchableOpacity
                  key={category.$id}
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(category)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${color}22` },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(category.name) as any}
                      size={24}
                      color={color}
                    />
                  </View>

                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryHint}>
                      {category.isDefault
                        ? "Базовая категория"
                        : "Пользовательская категория"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.textMuted}
                  />
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
                {editingCategory ? "Изменить категорию" : "Новая категория"}
              </Text>

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: Кафе"
              placeholderTextColor={COLORS.textMuted}
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <Text style={styles.label}>Цвет</Text>
            <View style={styles.colorsRow}>
              {COLOR_OPTIONS.map((color) => {
                const isSelected = selectedColor === color;

                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorItem,
                      { backgroundColor: color },
                      isSelected && styles.colorItemSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveCategory}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingCategory ? "Сохранить изменения" : "Добавить"}
                </Text>
              )}
            </TouchableOpacity>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  headerText: {
    flex: 1,
    paddingRight: 16,
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
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  categoryHint: {
    color: COLORS.textMuted,
    fontSize: 13,
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
  colorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  colorItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
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
});