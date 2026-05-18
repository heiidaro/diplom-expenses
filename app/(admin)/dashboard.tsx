import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import {
  AdminStats,
  getAdminDashboardStats,
  getMeAdminStatus,
} from "../../services/adminService";
import { exportAdminAllUsersStatsToXlsx } from "../../services/adminStatsExportService";

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [adminName, setAdminName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingAll, setIsExportingAll] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  async function handleExportAllUsersStats() {
    try {
      setIsExportingAll(true);

      await exportAdminAllUsersStatsToXlsx();

      Alert.alert("Готово", "Файл статистики всех пользователей сформирован");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось экспортировать статистику",
      );
    } finally {
      setIsExportingAll(false);
    }
  }

  async function loadDashboard() {
    try {
      setIsLoading(true);

      const adminStatus = await getMeAdminStatus();

      if (!adminStatus.isAdmin) {
        Alert.alert(
          "Нет доступа",
          "Этот раздел доступен только администратору",
        );
        router.replace("/home");
        return;
      }

      setAdminName(
        adminStatus.admin.name || adminStatus.admin.email || "Администратор",
      );

      const loadedStats = await getAdminDashboardStats();
      setStats(loadedStats);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить админ-панель",
      );
      router.replace("/home");
    } finally {
      setIsLoading(false);
    }
  }

  function StatCard(props: {
    title: string;
    value: number | string;
    icon: any;
  }) {
    return (
      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name={props.icon} size={22} color={COLORS.accent} />
        </View>

        <Text style={styles.statValue}>{props.value}</Text>
        <Text style={styles.statTitle}>{props.title}</Text>
      </View>
    );
  }

  function MenuCard(props: {
    title: string;
    subtitle: string;
    icon: any;
    route: string;
  }) {
    return (
      <TouchableOpacity
        style={styles.menuCard}
        activeOpacity={0.85}
        onPress={() => router.push(props.route as any)}
      >
        <View style={styles.menuIcon}>
          <Ionicons name={props.icon} size={24} color={COLORS.accent} />
        </View>

        <View style={styles.menuInfo}>
          <Text style={styles.menuTitle}>{props.title}</Text>
          <Text style={styles.menuSubtitle}>{props.subtitle}</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Админ-панель</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadDashboard}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка админ-панели...</Text>
          </View>
        ) : (
          <>
            <View style={styles.adminCard}>
              <View style={styles.adminIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={30}
                  color={COLORS.accent}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.adminTitle}>Администратор</Text>
                <Text style={styles.adminSubtitle}>{adminName}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Статистика</Text>

            <View style={styles.statsGrid}>
              <StatCard
                title="Пользователей"
                value={stats?.totalUsers || 0}
                icon="people-outline"
              />

              <StatCard
                title="Активны сегодня"
                value={stats?.activeToday || 0}
                icon="radio-button-on-outline"
              />

              <StatCard
                title="Заблокированы"
                value={stats?.blockedUsers || 0}
                icon="ban-outline"
              />

              <StatCard
                title="Открытые обращения"
                value={stats?.openTickets || 0}
                icon="chatbubble-ellipses-outline"
              />

              <StatCard
                title="В работе"
                value={stats?.inProgressTickets || 0}
                icon="time-outline"
              />

              <StatCard
                title="Закрытые"
                value={stats?.closedTickets || 0}
                icon="checkmark-circle-outline"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.exportAllButton,
                isExportingAll && styles.buttonDisabled,
              ]}
              onPress={handleExportAllUsersStats}
              disabled={isExportingAll}
              activeOpacity={0.85}
            >
              {isExportingAll ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={21} color="#FFFFFF" />
                  <Text style={styles.exportAllButtonText}>
                    Экспорт статистики всех пользователей
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Управление</Text>

            <View style={styles.menuList}>
              <MenuCard
                title="Пользователи"
                subtitle="Просмотр, блокировка и изменение пользователей"
                icon="people-outline"
                route="/(admin)/users"
              />

              <MenuCard
                title="Обращения"
                subtitle="Ответы пользователям и закрытие обращений"
                icon="chatbubbles-outline"
                route="/(admin)/support"
              />

              <MenuCard
                title="Новости"
                subtitle="Публикация новостей и обновлений приложения"
                icon="megaphone-outline"
                route="/(admin)/news"
              />

              <MenuCard
                title="Журнал действий"
                subtitle="История действий администраторов"
                icon="document-text-outline"
                route="/(admin)/logs"
              />

              <MenuCard
                title="Профиль администратора"
                subtitle="Аккаунт, права доступа и выход"
                icon="person-circle-outline"
                route="/(admin)/profile"
              />
            </View>
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
    fontSize: 20,
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
  adminCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  adminIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  adminTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  adminSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  statTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  menuList: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  menuSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  exportAllButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 22,
  },

  exportAllButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  buttonDisabled: {
    opacity: 0.7,
  },
});
