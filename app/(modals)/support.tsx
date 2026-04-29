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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  createSupportTicket,
  deleteSupportTicket,
  getUserSupportTickets,
} from "../../services/supportService";
import { SupportTicket } from "../../types/models";

function getStatusLabel(status?: string) {
  if (status === "in_progress") {
    return "В работе";
  }

  if (status === "closed") {
    return "Закрыто";
  }

  if (status === "open") {
    return "Открыто";
  }

  return "Открыто";
}

function getStatusIcon(status?: string) {
  if (status === "in_progress") {
    return "time-outline";
  }

  if (status === "closed") {
    return "checkmark-circle-outline";
  }

  if (status === "open") {
    return "alert-circle-outline";
  }

  return "alert-circle-outline";
}

function formatTicketDate(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SupportScreen() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [])
  );

  async function loadTickets() {
    try {
      setIsLoading(true);

      const user = await account.get();
      const loadedTickets = await getUserSupportTickets(user.$id);

      setTickets(loadedTickets);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить обращения"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadTickets();
  }

  async function handleCreateTicket() {
    try {
      if (!title.trim()) {
        Alert.alert("Ошибка", "Введите тему обращения");
        return;
      }

      if (!message.trim()) {
        Alert.alert("Ошибка", "Введите сообщение");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      await createSupportTicket({
        userId: user.$id,
        title: title.trim(),
        message: message.trim(),
      });

      setTitle("");
      setMessage("");

      Alert.alert("Готово", "Обращение отправлено в поддержку");

      await loadTickets();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось создать обращение"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDeleteTicket(ticket: SupportTicket) {
    Alert.alert(
      "Удалить обращение?",
      "Обращение будет удалено из списка. Это действие нельзя отменить.",
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
              await deleteSupportTicket(ticket.$id);
              await loadTickets();
            } catch (error: any) {
              console.error(error);
              Alert.alert(
                "Ошибка",
                error?.message || "Не удалось удалить обращение"
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Поддержка</Text>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={COLORS.accent}
          />

          <View style={styles.infoTextBox}>
            <Text style={styles.infoTitle}>Связь с поддержкой</Text>
            <Text style={styles.infoText}>
              Опишите проблему или вопрос. Обращение сохранится в системе и
              будет доступно в истории ниже.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Новое обращение</Text>

          <Text style={styles.label}>Тема</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Не добавляется расход"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Сообщение</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Опишите вопрос подробнее"
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleCreateTicket}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Отправить обращение</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Мои обращения</Text>

          {isLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.emptyTitle}>Загрузка обращений...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="file-tray-outline"
                size={36}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyTitle}>Обращений пока нет</Text>
              <Text style={styles.emptyText}>
                Создайте первое обращение через форму выше
              </Text>
            </View>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map((ticket) => (
                <TouchableOpacity
                  key={ticket.$id}
                  style={styles.ticketCard}
                  activeOpacity={0.85}
                  onLongPress={() => confirmDeleteTicket(ticket)}
                  onPress={() =>
                    Alert.alert(ticket.title, ticket.message || "Без сообщения")
                  }
                >
                  <View style={styles.ticketIcon}>
                    <Ionicons
                      name={getStatusIcon(ticket.status)}
                      size={22}
                      color={COLORS.accent}
                    />
                  </View>

                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketTitle}>{ticket.title}</Text>
                    <Text style={styles.ticketMessage} numberOfLines={2}>
                      {ticket.message}
                    </Text>

                    <View style={styles.ticketMetaRow}>
                      <Text style={styles.ticketStatus}>
                        {getStatusLabel(ticket.status)}
                      </Text>

                      <Text style={styles.ticketDate}>
                        {formatTicketDate(ticket.$createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
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
  textArea: {
    minHeight: 130,
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 18,
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
  ticketList: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  ticketMessage: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  ticketStatus: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  ticketDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});