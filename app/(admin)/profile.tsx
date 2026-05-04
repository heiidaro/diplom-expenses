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
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

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
      router.replace("/");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setIsLogoutLoading(true);

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
    } finally {
      setIsLogoutLoading(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Выйти из аккаунта?",
      "Вы выйдете из профиля администратора.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Выйти",
          style: "destructive",
          onPress: handleLogout,
        },
      ]
    );
  }

  function AccessItem(props: {
    icon: any;
    title: string;
    description: string;
  }) {
    return (
      <View style={styles.accessItem}>
        <View style={styles.accessIcon}>
          <Ionicons name={props.icon} size={22} color={COLORS.accent} />
        </View>

        <View style={styles.accessInfo}>
          <Text style={styles.accessTitle}>{props.title}</Text>
          <Text style={styles.accessDescription}>{props.description}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Профиль администратора</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadAdminProfile}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка профиля...</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={36}
                  color={COLORS.accent}
                />
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.adminName}>{adminName}</Text>
                <Text style={styles.adminEmail}>{adminEmail}</Text>

                <View style={styles.roleBadge}>
                  <Ionicons
                    name="shield-outline"
                    size={15}
                    color={COLORS.accent}
                  />
                  <Text style={styles.roleBadgeText}>Администратор</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Права доступа</Text>

              <AccessItem
                icon="people-outline"
                title="Пользователи"
                description="Просмотр, изменение, блокировка и разблокировка пользователей."
              />

              <AccessItem
                icon="chatbubbles-outline"
                title="Обращения"
                description="Просмотр обращений пользователей, ответы и закрытие заявок."
              />

              <AccessItem
                icon="megaphone-outline"
                title="Новости приложения"
                description="Публикация новостей, системных сообщений и уведомлений."
              />

              <AccessItem
                icon="document-text-outline"
                title="Журнал действий"
                description="Просмотр истории административных действий."
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Безопасность</Text>

              <View style={styles.securityBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={COLORS.accent}
                />
                <Text style={styles.securityText}>
                  Все действия администратора фиксируются в журнале действий.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                isLogoutLoading && styles.buttonDisabled,
              ]}
              onPress={confirmLogout}
              disabled={isLogoutLoading}
              activeOpacity={0.85}
            >
              {isLogoutLoading ? (
                <ActivityIndicator color={COLORS.danger} />
              ) : (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={22}
                    color={COLORS.danger}
                  />
                  <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                </>
              )}
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
    fontSize: 18,
    fontWeight: "900",
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  adminName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 5,
  },
  adminEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 10,
  },
  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    gap: 6,
  },
  roleBadgeText: {
    color: COLORS.accent,
    fontSize: 12,
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
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  accessItem: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  accessIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  accessInfo: {
    flex: 1,
  },
  accessTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  accessDescription: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  securityBox: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  securityText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
  },
  logoutButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.24)",
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
  buttonDisabled: {
    opacity: 0.7,
  },
});