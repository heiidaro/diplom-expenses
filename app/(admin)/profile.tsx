import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { getMeAdminStatus } from "../../services/adminService";

export default function AdminProfileScreen() {
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadAdminProfile();
    }, [])
  );

  async function loadAdminProfile() {
    try {
      setIsLoading(true);

      const result = await getMeAdminStatus();

      setAdminName(result.admin.name || "Администратор");
      setAdminEmail(result.admin.email || "");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Нет доступа", "Этот раздел доступен только администратору");
      router.replace("/home");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await account.deleteSession("current");
    } catch (error: any) {
      const message = String(error?.message || "");

      const isAlreadyGuest =
        message.includes("role: guests") ||
        message.includes("missing scopes") ||
        message.includes("account");

      if (!isAlreadyGuest) {
        console.error(error);
        Alert.alert("Ошибка", error?.message || "Не удалось выйти из аккаунта");
        return;
      }
    }

    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Профиль администратора</Text>

          <View style={{ width: 44 }} />
        </View>

        {isLoading ? (
          <View style={styles.card}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка профиля...</Text>
          </View>
        ) : (
          <>
            <View style={styles.adminCard}>
              <View style={styles.avatar}>
                <Ionicons name="shield-checkmark-outline" size={34} color={COLORS.accent} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.adminName}>{adminName}</Text>
                <Text style={styles.adminEmail}>{adminEmail}</Text>
                <Text style={styles.adminRole}>Администратор системы</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Доступ администратора</Text>

              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={21} color={COLORS.accent} />
                <Text style={styles.infoText}>Управление пользователями</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="chatbubbles-outline" size={21} color={COLORS.accent} />
                <Text style={styles.infoText}>Ответы на обращения</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="megaphone-outline" size={21} color={COLORS.accent} />
                <Text style={styles.infoText}>Публикация новостей</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={21} color={COLORS.accent} />
                <Text style={styles.infoText}>Просмотр журнала действий</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
              <Text style={styles.logoutText}>Выйти из аккаунта</Text>
            </TouchableOpacity>
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
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
    fontSize: 19,
    fontWeight: "900",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    textAlign: "center",
  },
  adminCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  adminName: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4,
  },
  adminEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 5,
  },
  adminRole: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  infoText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "900",
  },
});