import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  deleteCategoryRule,
  getUserCategoryRules,
} from "../../services/categoryRuleService";
import {
  getCategoryColor,
  getCategoryName,
  getUserCategories,
} from "../../services/categoryService";
import { Category, CategoryRule } from "../../types/models";
import { formatDate } from "../../utils/format";

export default function CategoryRulesScreen() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
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

      const [loadedCategories, loadedRules] = await Promise.all([
        getUserCategories(user.$id),
        getUserCategoryRules(user.$id),
      ]);

      setCategories(loadedCategories);
      setRules(loadedRules);
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

  function confirmDeleteRule(rule: CategoryRule) {
    Alert.alert(
      "Удалить правило?",
      `Правило "${rule.keyword}" больше не будет автоматически выбирать категорию.`,
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
              await deleteCategoryRule(rule.$id);
              await loadData();
            } catch (error: any) {
              if (isGuestOrSessionError(error)) {
                return;
              }

              console.log("Ошибка:", error);

              Alert.alert("Ошибка", error?.message || "Что-то пошло не так");
            }
          },
        },
      ],
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Правила категорий</Text>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="sparkles-outline" size={26} color={COLORS.accent} />

          <View style={styles.infoTextBox}>
            <Text style={styles.infoTitle}>Автоматическое обучение</Text>
            <Text style={styles.infoText}>
              Эти правила создаются автоматически, когда вы выбираете категорию
              для расхода. По ним приложение подставляет категорию при похожем
              комментарии.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Загрузка правил...</Text>
          </View>
        ) : rules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="sparkles-outline"
              size={36}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Правил пока нет</Text>
            <Text style={styles.emptyText}>
              Добавьте расход с комментарием и выберите категорию — приложение
              запомнит эту связь.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rules.map((rule) => {
              const categoryName = getCategoryName(categories, rule.categoryId);
              const categoryColor = getCategoryColor(
                categories,
                rule.categoryId,
              );

              return (
                <TouchableOpacity
                  key={rule.$id}
                  style={styles.ruleCard}
                  activeOpacity={0.85}
                  onLongPress={() => confirmDeleteRule(rule)}
                  onPress={() =>
                    Alert.alert(
                      "Правило категории",
                      `Если комментарий содержит "${rule.keyword}", приложение выберет категорию "${categoryName}".`,
                    )
                  }
                >
                  <View
                    style={[
                      styles.ruleIcon,
                      { backgroundColor: `${categoryColor}22` },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={22}
                      color={categoryColor}
                    />
                  </View>

                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleTitle}>
                      {rule.keyword} → {categoryName}
                    </Text>

                    <Text style={styles.ruleSubtitle}>
                      Использовано: {Number(rule.usageCount || 0)} раз
                    </Text>

                    {rule.lastUsedAt ? (
                      <Text style={styles.ruleDate}>
                        Последнее использование: {formatDate(rule.lastUsedAt)}
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
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
  ruleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  ruleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  ruleSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  ruleDate: {
    color: COLORS.textSecond,
    fontSize: 12,
  },
});
