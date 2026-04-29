import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
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

const profileItems = [
  {
    title: "Автоматизация",
    subtitle: "Регулярные расходы, импорт выписки и правила",
    icon: "sparkles-outline",
  },
  {
    title: "Экспорт статистики",
    subtitle: "Скачать отчет по расходам",
    icon: "download-outline",
  },
  {
    title: "Поддержка",
    subtitle: "Создать обращение в поддержку",
    icon: "chatbubble-ellipses-outline",
  },
  {
    title: "Настройки",
    subtitle: "Имя, почта и пароль",
    icon: "settings-outline",
  },
];

export default function ProfileScreen() {
  async function handleLogout() {
    try {
      await account.deleteSession("current");
      router.replace("/");
    } catch (error) {
      console.error(error);
      Alert.alert("Ошибка", "Не удалось выйти из аккаунта");
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
            <Ionicons name="person-outline" size={34} color={COLORS.accent} />
          </View>

          <View>
            <Text style={styles.userName}>Пользователь</Text>
            <Text style={styles.userEmail}>Аккаунт Appwrite</Text>
          </View>
        </View>

        <View style={styles.list}>
          {profileItems.map((item) => (
            <TouchableOpacity key={item.title} style={styles.item}>
              <View style={styles.itemIcon}>
                <Ionicons name={item.icon as any} size={22} color={COLORS.accent} />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
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
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  userEmail: {
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