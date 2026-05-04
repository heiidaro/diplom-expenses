import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { updateMyActivity } from "../../services/activityService";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import { getUserCategories } from "../../services/categoryService";
import { getUserExpenses } from "../../services/expenseService";
import { exportExpensesToCsv } from "../../services/exportService";

const profileItems = [
  {
    title: "Регулярные расходы",
    subtitle: "Автоматическое добавление повторяющихся трат",
    icon: "repeat-outline",
    route: "/recurring-expenses",
  },
  {
    title: "Правила категорий",
    subtitle: "Автоматическое обучение по комментариям",
    icon: "sparkles-outline",
    route: "/category-rules",
  },
  {
    title: "Экспорт статистики",
    subtitle: "Скачать отчет по расходам",
    icon: "download-outline",
    route: "export",
  },
  {
    title: "Поддержка",
    subtitle: "Создать обращение в поддержку",
    icon: "chatbubble-ellipses-outline",
    route: "/support",
  },
  {
    title: "Настройки",
    subtitle: "Имя, почта и пароль",
    icon: "settings-outline",
    route: "/settings",
  },
];

export default function ProfileScreen() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useFocusEffect(
    useCallback(() => {
      updateMyActivity("profile");
      loadProfileUser();
    }, [])
  );

  async function loadProfileUser() {
    try {
      const user = await account.get();

      setUserName(user.name || "Пользователь");
      setUserEmail(user.email || "Email не указан");
    } catch (error) {
      console.error(error);
      setUserName("Пользователь");
      setUserEmail("Email не указан");
    }
  }

  async function handleLogout() {
    try {
      try {
        await account.deleteSession({
          sessionId: "current",
        } as any);
      } catch (error: any) {
        const message = String(error?.message || "");

        const alreadyGuest =
          message.includes("role: guests") ||
          message.includes("missing scopes") ||
          message.includes("account");

        if (!alreadyGuest) {
          throw error;
        }
      }

      router.replace("/");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось выйти из аккаунта"
      );
    }
  }

  async function handleExportStatistics() {
    try {
      const user = await account.get();

      const [categories, expenses] = await Promise.all([
        getUserCategories(user.$id),
        getUserExpenses(user.$id),
      ]);

      if (expenses.length === 0) {
        Alert.alert("Нет данных", "Добавьте хотя бы один расход для экспорта");
        return;
      }

      await exportExpensesToCsv({
        expenses,
        categories,
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка экспорта",
        error?.message || "Не удалось сформировать файл"
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Профиль</Text>
        <Text style={styles.subtitle}>
          Личный кабинет пользователя и настройки приложения
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(userName || userEmail || "U").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userName || "Пользователь"}
            </Text>

            <Text style={styles.profileEmail}>
              {userEmail || "Email не указан"}
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          {profileItems.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.item}
              onPress={() => {
                if (item.route === "export") {
                  handleExportStatistics();
                  return;
                }

                if (item.route) {
                  router.push(item.route as any);
                  return;
                }

                Alert.alert("Скоро", "Этот раздел добавим следующим этапом");
              }}
            >
              <View style={styles.itemIcon}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={COLORS.accent}
                />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  item: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accentSoft,
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
    fontWeight: "800",
    marginBottom: 4,
  },
  itemSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "800",
  },
});