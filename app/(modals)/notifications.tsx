import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  deleteNotification,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService";
import { AppNotification } from "../../types/models";

function getNotificationIcon(type?: string) {
  if (type === "goal") return "flag-outline";
  if (type === "support") return "chatbubble-ellipses-outline";
  if (type === "news") return "megaphone-outline";
  if (type === "recurring") return "repeat-outline";

  return "notifications-outline";
}

function getTypeLabel(type?: string) {
  if (type === "goal") return "Цель";
  if (type === "support") return "Поддержка";
  if (type === "news") return "Новость";
  if (type === "recurring") return "Автоматизация";

  return "Система";
}

function formatDate(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  async function loadNotifications() {
    try {
      setIsLoading(true);

      const user = await account.get();
      const loadedNotifications = await getUserNotifications(user.$id);

      setNotifications(loadedNotifications);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить уведомления"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadNotifications();
  }

  async function handleOpenNotification(notification: AppNotification) {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.$id);
        await loadNotifications();
      }

      Alert.alert(notification.title, notification.message);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Ошибка", error?.message || "Не удалось открыть уведомление");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const user = await account.get();

      await markAllNotificationsAsRead(user.$id);
      await loadNotifications();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Ошибка", error?.message || "Не удалось обновить уведомления");
    }
  }

  function confirmDelete(notification: AppNotification) {
    Alert.alert(
      "Удалить уведомление?",
      "Уведомление будет удалено из списка.",
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
              await deleteNotification(notification.$id);
              await loadNotifications();
            } catch (error: any) {
              console.error(error);
              Alert.alert(
                "Ошибка",
                error?.message || "Не удалось удалить уведомление"
              );
            }
          },
        },
      ]
    );
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Уведомления</Text>

          <TouchableOpacity
            style={styles.readAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Ionicons name="checkmark-done-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color={COLORS.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>Центр уведомлений</Text>
            <Text style={styles.summaryText}>
              Непрочитанные уведомления: {unreadCount}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Загрузка уведомлений...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="notifications-off-outline"
              size={38}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Уведомлений пока нет</Text>
            <Text style={styles.emptyText}>
              Здесь будут новости приложения, ответы поддержки и уведомления по целям.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => {
              const isUnread = !notification.isRead;

              return (
                <TouchableOpacity
                  key={notification.$id}
                  style={[
                    styles.notificationCard,
                    isUnread && styles.notificationCardUnread,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleOpenNotification(notification)}
                  onLongPress={() => confirmDelete(notification)}
                >
                  <View style={styles.notificationIcon}>
                    <Ionicons
                      name={getNotificationIcon(notification.type)}
                      size={22}
                      color={COLORS.accent}
                    />
                  </View>

                  <View style={styles.notificationContent}>
                    <View style={styles.notificationTopRow}>
                      <Text style={styles.notificationType}>
                        {getTypeLabel(notification.type)}
                      </Text>

                      {isUnread ? <View style={styles.unreadDot} /> : null}
                    </View>

                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>

                    <Text style={styles.notificationMessage} numberOfLines={3}>
                      {notification.message}
                    </Text>

                    <Text style={styles.notificationDate}>
                      {formatDate(notification.$createdAt)}
                    </Text>
                  </View>
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
  readAllButton: {
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
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  summaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 13,
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
    lineHeight: 19,
    textAlign: "center",
  },
  list: {
    gap: 12,
  },
  notificationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
  },
  notificationCardUnread: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.card,
  },
  notificationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationType: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  notificationTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  notificationMessage: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});