import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import {
  AdminLog,
  getAdminLogs,
  getMeAdminStatus,
} from "../../services/adminService";

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

function getActionLabel(actionType?: string) {
  if (actionType === "block_user") return "Блокировка пользователя";
  if (actionType === "unblock_user") return "Разблокировка пользователя";
  if (actionType === "update_user") return "Изменение пользователя";
  if (actionType === "reply_ticket") return "Ответ на обращение";
  if (actionType === "close_ticket") return "Закрытие обращения";
  if (actionType === "publish_news") return "Публикация новости";

  return actionType || "Действие";
}

function getActionIcon(actionType?: string) {
  if (actionType === "block_user") return "ban-outline";
  if (actionType === "unblock_user") return "checkmark-circle-outline";
  if (actionType === "update_user") return "create-outline";
  if (actionType === "reply_ticket") return "chatbubble-ellipses-outline";
  if (actionType === "close_ticket") return "close-circle-outline";
  if (actionType === "publish_news") return "megaphone-outline";

  return "document-text-outline";
}

function getActionColor(actionType?: string) {
  if (actionType === "block_user") return COLORS.danger;
  if (actionType === "unblock_user") return "#10B981";
  if (actionType === "update_user") return COLORS.accent;
  if (actionType === "reply_ticket") return "#F59E0B";
  if (actionType === "close_ticket") return "#10B981";
  if (actionType === "publish_news") return COLORS.accent;

  return COLORS.textMuted;
}

export default function AdminLogsScreen() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, []),
  );

  async function loadLogs() {
    try {
      setIsLoading(true);

      await getMeAdminStatus();

      const loadedLogs = await getAdminLogs();
      setLogs(loadedLogs);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить журнал действий",
      );
      router.replace("/home");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadLogs();
  }

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return logs;

    return logs.filter((log) => {
      return (
        log.description?.toLowerCase().includes(normalizedSearch) ||
        log.actionType?.toLowerCase().includes(normalizedSearch) ||
        log.adminName?.toLowerCase().includes(normalizedSearch) ||
        log.adminEmail?.toLowerCase().includes(normalizedSearch) ||
        log.targetUserName?.toLowerCase().includes(normalizedSearch) ||
        log.targetUserEmail?.toLowerCase().includes(normalizedSearch) ||
        log.targetEntityTitle?.toLowerCase().includes(normalizedSearch) ||
        log.targetEntityType?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [logs, search]);

  function LogCard({ item }: { item: AdminLog }) {
    const color = getActionColor(item.actionType);

    return (
      <View style={styles.logCard}>
        <View style={styles.logTopRow}>
          <View
            style={[
              styles.logIcon,
              {
                backgroundColor: `${color}22`,
              },
            ]}
          >
            <Ionicons
              name={getActionIcon(item.actionType)}
              size={22}
              color={color}
            />
          </View>

          <View style={styles.logMainInfo}>
            <Text style={styles.logTitle}>
              {getActionLabel(item.actionType)}
            </Text>

            <Text style={styles.logDate}>{formatDate(item.$createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.logDescription}>{item.description}</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Администратор</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.adminName || "Администратор"}
            </Text>
            <Text style={styles.detailSubValue} numberOfLines={1}>
              {item.adminEmail || "Email не найден"}
            </Text>
          </View>

          {item.targetUserName || item.targetUserEmail ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Пользователь</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.targetUserName || "Пользователь"}
              </Text>
              <Text style={styles.detailSubValue} numberOfLines={1}>
                {item.targetUserEmail || "Email не найден"}
              </Text>
            </View>
          ) : null}

          {item.targetEntityTitle || item.targetEntityType ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {item.targetEntityType || "Объект"}
              </Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {item.targetEntityTitle || "Без названия"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

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

          <Text style={styles.headerTitle}>Журнал действий</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadLogs}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="document-text-outline"
              size={26}
              color={COLORS.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>История действий</Text>
            <Text style={styles.infoText}>
              Здесь фиксируются изменения пользователей, ответы на обращения,
              блокировки и публикации новостей.
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по журналу"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>Записи журнала</Text>
            <Text style={styles.summaryText}>
              Найдено: {filteredLogs.length}
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Ionicons name="list-outline" size={24} color={COLORS.accent} />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка журнала...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="document-text-outline"
              size={38}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Записей пока нет</Text>
            <Text style={styles.emptyText}>
              Здесь появятся действия администраторов
            </Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {filteredLogs.map((item) => (
              <LogCard key={item.$id} item={item} />
            ))}
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
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  infoIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  searchBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    marginLeft: 10,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
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
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  logsList: {
    gap: 14,
  },
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  logIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  logTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  logDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  logDescription: {
    color: COLORS.textSecond,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  detailsCard: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  detailSubValue: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
});
