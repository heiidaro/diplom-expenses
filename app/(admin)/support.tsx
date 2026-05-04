import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../lib/theme";
import {
  AdminSupportTicket,
  closeAdminSupportTicket,
  getAdminSupportTickets,
  getMeAdminStatus,
  replyAdminSupportTicket,
} from "../../services/adminService";

type TicketFilter = "all" | "open" | "in_progress" | "closed";

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

function getStatusLabel(status?: string) {
  if (status === "open") return "Открыто";
  if (status === "in_progress") return "В работе";
  if (status === "closed") return "Закрыто";

  return "Неизвестно";
}

function getStatusColor(status?: string) {
  if (status === "open") return COLORS.accent;
  if (status === "in_progress") return "#F59E0B";
  if (status === "closed") return "#10B981";

  return COLORS.textMuted;
}

export default function AdminSupportScreen() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedTicket, setSelectedTicket] =
    useState<AdminSupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [])
  );

  async function loadTickets() {
    try {
      setIsLoading(true);

      await getMeAdminStatus();

      const loadedTickets = await getAdminSupportTickets(filter);
      setTickets(loadedTickets);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить обращения"
      );
      router.replace("/home");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadTickets();
  }

  function openTicket(ticket: AdminSupportTicket) {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || "");
    setIsReplyModalVisible(true);
  }

  function closeModal() {
    if (isSendingReply || isClosingTicket) return;

    setSelectedTicket(null);
    setReplyText("");
    setIsReplyModalVisible(false);
  }

  async function handleReply(closeAfterReply: boolean) {
    try {
      if (!selectedTicket) return;

      if (!replyText.trim()) {
        Alert.alert("Ошибка", "Введите ответ пользователю");
        return;
      }

      setIsSendingReply(true);

      await replyAdminSupportTicket({
        ticketId: selectedTicket.$id,
        replyText: replyText.trim(),
        closeAfterReply,
      });

      setIsReplyModalVisible(false);
      setSelectedTicket(null);
      setReplyText("");

      await loadTickets();

      Alert.alert(
        "Готово",
        closeAfterReply
          ? "Ответ отправлен, обращение закрыто"
          : "Ответ отправлен пользователю"
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось отправить ответ"
      );
    } finally {
      setIsSendingReply(false);
    }
  }

  function confirmCloseTicket(ticket: AdminSupportTicket) {
    Alert.alert(
      "Закрыть обращение?",
      `Обращение "${ticket.title}" будет закрыто.`,
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Закрыть",
          style: "destructive",
          onPress: () => handleCloseTicket(ticket),
        },
      ]
    );
  }

  async function handleCloseTicket(ticket: AdminSupportTicket) {
    try {
      setIsClosingTicket(true);

      await closeAdminSupportTicket(ticket.$id);

      setIsReplyModalVisible(false);
      setSelectedTicket(null);

      await loadTickets();

      Alert.alert("Готово", "Обращение закрыто");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось закрыть обращение"
      );
    } finally {
      setIsClosingTicket(false);
    }
  }

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (!normalizedSearch) return true;

      return (
        ticket.title?.toLowerCase().includes(normalizedSearch) ||
        ticket.message?.toLowerCase().includes(normalizedSearch) ||
        ticket.userId?.toLowerCase().includes(normalizedSearch) ||
        ticket.userName?.toLowerCase().includes(normalizedSearch) ||
        ticket.userEmail?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [tickets, search]);

  function FilterButton(props: {
    value: TicketFilter;
    label: string;
  }) {
    const isActive = filter === props.value;

    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        activeOpacity={0.85}
        onPress={() => {
          setFilter(props.value);
        }}
      >
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}
        >
          {props.label}
        </Text>
      </TouchableOpacity>
    );
  }

  function TicketCard({ ticket }: { ticket: AdminSupportTicket }) {
    const statusColor = getStatusColor(ticket.status);
    const hasReply = Boolean(ticket.adminReply?.trim());

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        activeOpacity={0.85}
        onPress={() => openTicket(ticket)}
      >
        <View style={styles.ticketTopRow}>
          <View style={styles.ticketIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.ticketMainInfo}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {ticket.title || "Без темы"}
            </Text>

            <Text style={styles.ticketUserName} numberOfLines={1}>
              {ticket.userName || "Пользователь"}
            </Text>

            <Text style={styles.ticketUserEmail} numberOfLines={1}>
              {ticket.userEmail || "Email не найден"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusColor}22`,
                borderColor: `${statusColor}55`,
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getStatusLabel(ticket.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.ticketMessage} numberOfLines={3}>
          {ticket.message}
        </Text>

        <View style={styles.ticketMetaBox}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Создано</Text>
            <Text style={styles.metaValue}>{formatDate(ticket.$createdAt)}</Text>
          </View>

          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Ответ</Text>
            <Text style={styles.metaValue}>
              {hasReply ? formatDate(ticket.adminReplyAt) : "Нет ответа"}
            </Text>
          </View>
        </View>

        <View style={styles.ticketBottomRow}>
          <View style={styles.replyState}>
            <Ionicons
              name={hasReply ? "checkmark-circle-outline" : "time-outline"}
              size={18}
              color={hasReply ? "#10B981" : "#F59E0B"}
            />

            <Text
              style={[
                styles.replyStateText,
                {
                  color: hasReply ? "#10B981" : "#F59E0B",
                },
              ]}
            >
              {hasReply ? "Ответ отправлен" : "Ожидает ответа"}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.textMuted}
          />
        </View>
      </TouchableOpacity>
    );
  }

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [filter])
  );

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Обращения</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadTickets}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по теме, тексту, имени или email"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <FilterButton value="all" label="Все" />
          <FilterButton value="open" label="Открытые" />
          <FilterButton value="in_progress" label="В работе" />
          <FilterButton value="closed" label="Закрытые" />
        </ScrollView>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>Обращения пользователей</Text>
            <Text style={styles.summaryText}>
              Найдено: {filteredTickets.length}
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Ionicons
              name="chatbubbles-outline"
              size={24}
              color={COLORS.accent}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка обращений...</Text>
          </View>
        ) : filteredTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="chatbubble-outline"
              size={38}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Обращений нет</Text>
            <Text style={styles.emptyText}>
              По выбранному фильтру обращения не найдены
            </Text>
          </View>
        ) : (
          <View style={styles.ticketsList}>
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.$id} ticket={ticket} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={isReplyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Обращение</Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeModal}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTicketTitle}>
                {selectedTicket?.title || "Без темы"}
              </Text>

              <View style={styles.modalInfoCard}>
                <Text style={styles.modalInfoLabel}>Пользователь</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedTicket?.userName || "Пользователь"}
                </Text>

                <Text style={styles.modalInfoLabel}>Email</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedTicket?.userEmail || "Email не найден"}
                </Text>

                <Text style={styles.modalInfoLabel}>Статус</Text>
                <Text
                  style={[
                    styles.modalInfoValue,
                    {
                      color: getStatusColor(selectedTicket?.status),
                    },
                  ]}
                >
                  {getStatusLabel(selectedTicket?.status)}
                </Text>

                <Text style={styles.modalInfoLabel}>Дата создания</Text>
                <Text style={styles.modalInfoValue}>
                  {formatDate(selectedTicket?.$createdAt)}
                </Text>
              </View>

              <Text style={styles.label}>Текст обращения</Text>
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>
                  {selectedTicket?.message}
                </Text>
              </View>

              {selectedTicket?.adminReply ? (
                <>
                  <Text style={styles.label}>Предыдущий ответ</Text>
                  <View style={styles.replyBox}>
                    <Text style={styles.replyText}>
                      {selectedTicket.adminReply}
                    </Text>

                    <Text style={styles.replyDate}>
                      {formatDate(selectedTicket.adminReplyAt)}
                    </Text>
                  </View>
                </>
              ) : null}

              {selectedTicket?.status === "closed" ? (
                <View style={styles.closedBox}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#10B981"
                  />
                  <Text style={styles.closedText}>
                    Обращение закрыто. Новый ответ можно отправить только после
                    изменения статуса в базе или повторного обращения пользователя.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Ответ администратора</Text>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Введите ответ пользователю"
                    placeholderTextColor={COLORS.textMuted}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      isSendingReply && styles.buttonDisabled,
                    ]}
                    onPress={() => handleReply(false)}
                    disabled={isSendingReply}
                  >
                    {isSendingReply ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="send-outline"
                          size={19}
                          color="#FFFFFF"
                        />
                        <Text style={styles.primaryButtonText}>
                          Ответить
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.successButton,
                      isSendingReply && styles.buttonDisabled,
                    ]}
                    onPress={() => handleReply(true)}
                    disabled={isSendingReply}
                  >
                    <Ionicons
                      name="checkmark-done-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.successButtonText}>
                      Ответить и закрыть
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dangerButton,
                      isClosingTicket && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                      if (selectedTicket) {
                        confirmCloseTicket(selectedTicket);
                      }
                    }}
                    disabled={isClosingTicket}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={19}
                      color={COLORS.danger}
                    />
                    <Text style={styles.dangerButtonText}>
                      Закрыть без ответа
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  filtersRow: {
    gap: 10,
    paddingBottom: 16,
  },
  filterButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  filterButtonTextActive: {
    color: COLORS.white,
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
  ticketsList: {
    gap: 14,
  },
  ticketCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ticketTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  ticketIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ticketMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  ticketTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  ticketUserName: {
    color: COLORS.textSecond,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },

  ticketUserEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  ticketMessage: {
    color: COLORS.textSecond,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  ticketMetaBox: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 5,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  ticketBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyState: {
    flexDirection: "row",
    alignItems: "center",
  },
  replyStateText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    maxHeight: "88%",
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTicketTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
    marginBottom: 14,
  },
  modalInfoCard: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  modalInfoLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  modalInfoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  messageBox: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  messageText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  replyBox: {
    backgroundColor: `${COLORS.accent}12`,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.accent}35`,
    marginBottom: 16,
  },
  replyText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  replyDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  replyInput: {
    minHeight: 130,
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  primaryButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  successButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  dangerButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  closedBox: {
    backgroundColor: "rgba(16, 185, 129, 0.10)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.22)",
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  closedText: {
    flex: 1,
    color: "#10B981",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginLeft: 10,
  },
});