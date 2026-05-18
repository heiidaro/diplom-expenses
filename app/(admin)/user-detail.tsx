import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { COLORS } from "../../lib/theme";
import {
  AdminUserDetails,
  blockAdminUser,
  getAdminUserDetails,
  unblockAdminUser,
} from "../../services/adminService";
import { exportAdminUserStatsToXlsx } from "../../services/adminStatsExportService";

function formatDate(value?: string) {
  if (!value) return "Нет данных";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Нет данных";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getOnlineLabel(status?: string) {
  if (status === "online") return "Онлайн";
  if (status === "recently") return "Недавно был";
  return "Офлайн";
}

function getOnlineColor(status?: string) {
  if (status === "online") return "#10B981";
  if (status === "recently") return "#F59E0B";
  return COLORS.textMuted;
}

function getTicketStatusLabel(status?: string) {
  if (status === "open") return "Открыто";
  if (status === "in_progress") return "В работе";
  if (status === "closed") return "Закрыто";
  return "Неизвестно";
}

function getActionLabel(actionType?: string) {
  if (actionType === "block_user") return "Блокировка";
  if (actionType === "unblock_user") return "Разблокировка";
  if (actionType === "update_user") return "Изменение данных";
  if (actionType === "reply_ticket") return "Ответ на обращение";
  if (actionType === "close_ticket") return "Закрытие обращения";
  if (actionType === "publish_news") return "Публикация новости";

  return actionType || "Действие";
}

export default function AdminUserDetailScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = String(params.userId || "");

  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [userId]),
  );

  async function handleExportUserStats() {
    try {
      if (!userId) return;

      setIsExporting(true);

      await exportAdminUserStatsToXlsx(userId);

      Alert.alert("Готово", "Файл статистики пользователя сформирован");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось экспортировать статистику",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function loadDetails() {
    try {
      if (!userId) {
        Alert.alert("Ошибка", "Не передан пользователь");
        router.back();
        return;
      }

      setIsLoading(true);

      const loadedDetails = await getAdminUserDetails(userId);
      setDetails(loadedDetails);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить карточку пользователя",
      );
      router.back();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadDetails();
  }

  function confirmToggleBlock() {
    if (!details) return;

    const user = details.user;
    const isAdmin = user.role === "admin" || user.labels?.includes("admin");

    if (isAdmin) {
      Alert.alert(
        "Недоступно",
        "Данные администратора нельзя блокировать или изменять",
      );
      return;
    }

    Alert.alert(
      user.isBlocked
        ? "Разблокировать пользователя?"
        : "Заблокировать пользователя?",
      user.isBlocked
        ? `Пользователь ${user.email} снова сможет пользоваться приложением.`
        : `Пользователь ${user.email} больше не сможет войти в приложение.`,
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: user.isBlocked ? "Разблокировать" : "Заблокировать",
          style: user.isBlocked ? "default" : "destructive",
          onPress: handleToggleBlock,
        },
      ],
    );
  }

  async function handleToggleBlock() {
    try {
      if (!details) return;

      setIsActionLoading(true);

      if (details.user.isBlocked) {
        await unblockAdminUser(details.user.userId);
        Alert.alert("Готово", "Пользователь разблокирован");
      } else {
        await blockAdminUser(details.user.userId);
        Alert.alert("Готово", "Пользователь заблокирован");
      }

      await loadDetails();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось изменить статус пользователя",
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  function StatCard(props: {
    title: string;
    value: string | number;
    icon: any;
  }) {
    return (
      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name={props.icon} size={21} color={COLORS.accent} />
        </View>

        <Text style={styles.statValue}>{props.value}</Text>
        <Text style={styles.statTitle}>{props.title}</Text>
      </View>
    );
  }

  if (isLoading && !details) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoader}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Загрузка карточки...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const user = details?.user;
  const stats = details?.stats;
  const onlineColor = getOnlineColor(user?.onlineStatus);
  const isAdmin = user?.role === "admin" || user?.labels?.includes("admin");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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

          <Text style={styles.headerTitle}>Карточка пользователя</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadDetails}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {user ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user.name || "Без имени"}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>

                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      user.isBlocked && styles.statusBadgeBlocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        user.isBlocked && styles.statusBadgeTextBlocked,
                      ]}
                    >
                      {user.isBlocked ? "Заблокирован" : "Активен"}
                    </Text>
                  </View>

                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {isAdmin ? "Админ" : "Пользователь"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Активность</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Онлайн</Text>
                <View style={styles.onlineRow}>
                  <View
                    style={[
                      styles.onlineDot,
                      {
                        backgroundColor: onlineColor,
                      },
                    ]}
                  />
                  <Text style={styles.infoValue}>
                    {getOnlineLabel(user.onlineStatus)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Последний онлайн</Text>
                <Text style={styles.infoValue}>
                  {formatDate(user.lastSeenAt)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Последний экран</Text>
                <Text style={styles.infoValue}>
                  {user.lastActivityScreen || "Нет данных"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Создан</Text>
                <Text style={styles.infoValue}>
                  {formatDate(user.createdAt)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Статистика</Text>

            <View style={styles.statsGrid}>
              <StatCard
                title="Расходов"
                value={stats?.expensesCount || 0}
                icon="card-outline"
              />

              <StatCard
                title="Сумма расходов"
                value={formatMoney(stats?.totalExpenseAmount || 0)}
                icon="cash-outline"
              />

              <StatCard
                title="Целей"
                value={stats?.goalsCount || 0}
                icon="flag-outline"
              />

              <StatCard
                title="Обращений"
                value={stats?.ticketsCount || 0}
                icon="chatbubbles-outline"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.exportButton,
                isExporting && styles.buttonDisabled,
              ]}
              onPress={handleExportUserStats}
              disabled={isExporting}
              activeOpacity={0.85}
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={21} color="#FFFFFF" />
                  <Text style={styles.exportButtonText}>
                    Экспортировать статистику
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Обращения пользователя</Text>

              {details?.latestTickets?.length ? (
                details.latestTickets.map((ticket) => (
                  <View key={ticket.$id} style={styles.ticketItem}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketTitle} numberOfLines={2}>
                        {ticket.title || "Без темы"}
                      </Text>

                      <Text style={styles.ticketStatus}>
                        {getTicketStatusLabel(ticket.status)}
                      </Text>
                    </View>

                    <Text style={styles.ticketMessage} numberOfLines={3}>
                      {ticket.message}
                    </Text>

                    <Text style={styles.ticketDate}>
                      {formatDate(ticket.$createdAt)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Обращений пока нет</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Последние действия</Text>

              {details?.latestAdminLogs?.length ? (
                details.latestAdminLogs.map((log) => (
                  <View key={log.$id} style={styles.logItem}>
                    <Text style={styles.logTitle}>
                      {getActionLabel(log.actionType)}
                    </Text>

                    <Text style={styles.logDescription}>{log.description}</Text>

                    <Text style={styles.logDate}>
                      {formatDate(log.$createdAt)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  По пользователю еще не было действий
                </Text>
              )}
            </View>

            {isAdmin ? (
              <View style={styles.adminLockedBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.textMuted}
                />
                <Text style={styles.adminLockedText}>
                  Администраторов нельзя блокировать или изменять из карточки.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.blockButton,
                  user.isBlocked && styles.unblockButton,
                  isActionLoading && styles.buttonDisabled,
                ]}
                onPress={confirmToggleBlock}
                disabled={isActionLoading}
                activeOpacity={0.85}
              >
                {isActionLoading ? (
                  <ActivityIndicator
                    color={user.isBlocked ? "#10B981" : COLORS.danger}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={
                        user.isBlocked
                          ? "checkmark-circle-outline"
                          : "ban-outline"
                      }
                      size={21}
                      color={user.isBlocked ? "#10B981" : COLORS.danger}
                    />

                    <Text
                      style={[
                        styles.blockButtonText,
                        user.isBlocked && styles.unblockButtonText,
                      ]}
                    >
                      {user.isBlocked
                        ? "Разблокировать пользователя"
                        : "Заблокировать пользователя"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
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
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 5,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.24)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusBadgeBlocked: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.24)",
  },
  statusBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "900",
  },
  statusBadgeTextBlocked: {
    color: COLORS.danger,
  },
  roleBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  roleBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
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
  infoRow: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 5,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
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
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  statTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  ticketItem: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 7,
  },
  ticketTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  ticketStatus: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  ticketMessage: {
    color: COLORS.textSecond,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  logItem: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  logTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  logDescription: {
    color: COLORS.textSecond,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 7,
  },
  logDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  adminLockedBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  adminLockedText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
  },
  blockButton: {
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
  unblockButton: {
    backgroundColor: "rgba(16, 185, 129, 0.10)",
    borderColor: "rgba(16, 185, 129, 0.24)",
  },
  blockButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  unblockButtonText: {
    color: "#10B981",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  exportButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },

  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
