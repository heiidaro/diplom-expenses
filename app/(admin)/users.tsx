import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  AdminUser,
  blockAdminUser,
  getAdminUsers,
  getMeAdminStatus,
  unblockAdminUser,
  updateAdminUserProfile,
} from "../../services/adminService";

type UserFilter = "all" | "online" | "admins" | "blocked";

function formatDate(value?: string) {
  if (!value) {
    return "Нет данных";
  }

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

function getOnlineLabel(status?: string) {
  if (status === "online") {
    return "Онлайн";
  }

  if (status === "recently") {
    return "Недавно был";
  }

  return "Офлайн";
}

function getOnlineColor(status?: string) {
  if (status === "online") {
    return "#10B981";
  }

  if (status === "recently") {
    return "#F59E0B";
  }

  return COLORS.textMuted;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, []),
  );

  async function loadUsers() {
    try {
      setIsLoading(true);

      await getMeAdminStatus();

      const loadedUsers = await getAdminUsers();
      setUsers(loadedUsers);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить пользователей",
      );
      router.replace("/home");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadUsers();
  }

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name?.toLowerCase().includes(normalizedSearch) ||
        user.email?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "online") {
        return user.onlineStatus === "online";
      }

      if (filter === "admins") {
        return user.role === "admin" || user.labels?.includes("admin");
      }

      if (filter === "blocked") {
        return user.isBlocked;
      }

      return true;
    });
  }, [users, search, filter]);

  function openEditModal(user: AdminUser) {
    setSelectedUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setEditRole(user.role === "admin" ? "admin" : "user");
    setEditModalVisible(true);
  }

  function closeEditModal() {
    if (isSavingEdit) {
      return;
    }

    setEditModalVisible(false);
    setSelectedUser(null);
    setEditName("");
    setEditEmail("");
    setEditPassword("");
    setEditRole("user");
  }

  async function handleSaveUser() {
    try {
      if (!selectedUser) {
        return;
      }

      if (!editName.trim()) {
        Alert.alert("Ошибка", "Введите имя пользователя");
        return;
      }

      if (!editEmail.trim()) {
        Alert.alert("Ошибка", "Введите email пользователя");
        return;
      }

      if (editPassword.trim() && editPassword.trim().length < 8) {
        Alert.alert("Ошибка", "Пароль должен быть не короче 8 символов");
        return;
      }

      setIsSavingEdit(true);

      await updateAdminUserProfile({
        userId: selectedUser.userId,
        name: editName.trim(),
        email: editEmail.trim(),
        password: editPassword.trim() || undefined,
        role: editRole,
      });

      setEditModalVisible(false);
      setSelectedUser(null);

      await loadUsers();

      Alert.alert("Готово", "Данные пользователя обновлены");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось обновить пользователя",
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  function confirmToggleBlock(user: AdminUser) {
    const actionText = user.isBlocked ? "разблокировать" : "заблокировать";

    Alert.alert(
      user.isBlocked
        ? "Разблокировать пользователя?"
        : "Заблокировать пользователя?",
      `Вы действительно хотите ${actionText} пользователя ${user.email || user.name}?`,
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: user.isBlocked ? "Разблокировать" : "Заблокировать",
          style: user.isBlocked ? "default" : "destructive",
          onPress: () => handleToggleBlock(user),
        },
      ],
    );
  }

  async function handleToggleBlock(user: AdminUser) {
    try {
      if (user.isBlocked) {
        await unblockAdminUser(user.userId);
        Alert.alert("Готово", "Пользователь разблокирован");
      } else {
        await blockAdminUser(user.userId);
        Alert.alert("Готово", "Пользователь заблокирован");
      }

      await loadUsers();
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось изменить статус пользователя",
      );
    }
  }

  function FilterButton(props: { value: UserFilter; label: string }) {
    const isActive = filter === props.value;

    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setFilter(props.value)}
        activeOpacity={0.85}
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

  function UserCard({ user }: { user: AdminUser }) {
    const onlineColor = getOnlineColor(user.onlineStatus);
    const isAdmin = user.role === "admin" || user.labels?.includes("admin");

    return (
      <View style={styles.userCard}>
        <View style={styles.userTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.userMainInfo}>
            <Text style={styles.userName}>{user.name || "Без имени"}</Text>

            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email || "Email не указан"}
            </Text>
          </View>

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
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Роль</Text>
            <Text style={styles.infoValue}>
              {isAdmin ? "Админ" : "Пользователь"}
            </Text>
          </View>

          <View style={styles.infoItem}>
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

          <View style={styles.infoItemWide}>
            <Text style={styles.infoLabel}>Последний онлайн</Text>
            <Text style={styles.infoValue}>{formatDate(user.lastSeenAt)}</Text>
          </View>

          <View style={styles.infoItemWide}>
            <Text style={styles.infoLabel}>Последний экран</Text>
            <Text style={styles.infoValue}>
              {user.lastActivityScreen || "Нет данных"}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isAdmin ? (
            <View style={styles.adminLockedBox}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={COLORS.textMuted}
              />
              <Text style={styles.adminLockedText}>
                Данные администратора нельзя изменять или блокировать
              </Text>
            </View>
          ) : (
            <View style={styles.userActionsBlock}>
              <TouchableOpacity
                style={styles.userOpenButton}
                onPress={() =>
                  router.push({
                    pathname: "/(admin)/user-detail",
                    params: {
                      userId: user.userId,
                    },
                  } as any)
                }
                activeOpacity={0.85}
              >
                <View style={styles.userActionIcon}>
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                </View>

                <Text style={styles.userOpenButtonText}>Открыть карточку</Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.userEditButton}
                onPress={() => openEditModal(user)}
                activeOpacity={0.85}
              >
                <View style={styles.userActionIcon}>
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={COLORS.text}
                  />
                </View>

                <Text style={styles.userEditButtonText}>Изменить данные</Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userBlockButton,
                  user.isBlocked && styles.userUnblockButton,
                ]}
                onPress={() => confirmToggleBlock(user)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.userActionIcon,
                    user.isBlocked && styles.userActionIconSuccess,
                    !user.isBlocked && styles.userActionIconDanger,
                  ]}
                >
                  <Ionicons
                    name={
                      user.isBlocked
                        ? "checkmark-circle-outline"
                        : "ban-outline"
                    }
                    size={18}
                    color={user.isBlocked ? "#10B981" : COLORS.danger}
                  />
                </View>

                <Text
                  style={[
                    styles.userBlockButtonText,
                    user.isBlocked && styles.userUnblockButtonText,
                  ]}
                >
                  {user.isBlocked
                    ? "Разблокировать пользователя"
                    : "Заблокировать пользователя"}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={user.isBlocked ? "#10B981" : COLORS.danger}
                />
              </TouchableOpacity>
            </View>
          )}
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

          <Text style={styles.headerTitle}>Пользователи</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadUsers}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по имени или email"
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
          <FilterButton value="online" label="Онлайн" />
          <FilterButton value="admins" label="Админы" />
          <FilterButton value="blocked" label="Заблокированные" />
        </ScrollView>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>Всего найдено</Text>
            <Text style={styles.summaryText}>
              {filteredUsers.length} из {users.length} пользователей
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Ionicons name="people-outline" size={24} color={COLORS.accent} />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка пользователей...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="person-outline"
              size={36}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Пользователи не найдены</Text>
            <Text style={styles.emptyText}>
              Измени поисковый запрос или фильтр
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {filteredUsers.map((user) => (
              <UserCard key={user.userId} user={user} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Редактирование</Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeEditModal}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{selectedUser?.email}</Text>

            <Text style={styles.label}>Имя пользователя</Text>
            <TextInput
              style={styles.input}
              placeholder="Имя"
              placeholderTextColor={COLORS.textMuted}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Новый пароль</Text>
            <TextInput
              style={styles.input}
              placeholder="Оставьте пустым, если пароль менять не нужно"
              placeholderTextColor={COLORS.textMuted}
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Роль</Text>

            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  editRole === "user" && styles.roleButtonActive,
                ]}
                onPress={() => setEditRole("user")}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    editRole === "user" && styles.roleButtonTextActive,
                  ]}
                >
                  Пользователь
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  editRole === "admin" && styles.roleButtonActive,
                ]}
                onPress={() => setEditRole("admin")}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    editRole === "admin" && styles.roleButtonTextActive,
                  ]}
                >
                  Админ
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSavingEdit && styles.buttonDisabled]}
              onPress={handleSaveUser}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Сохранить</Text>
              )}
            </TouchableOpacity>
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
  },
  usersList: {
    gap: 14,
  },
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  userMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.24)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
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
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  infoItem: {
    width: "48%",
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
  },
  infoItemWide: {
    width: "100%",
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
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
    marginBottom: 6,
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
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 18,
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 13,
    fontWeight: "800",
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
    fontSize: 15,
    marginBottom: 16,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  roleButton: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roleButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  roleButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  roleButtonTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  userActionsBlock: {
    marginTop: 2,
    gap: 10,
    width: "100%",
  },

  userEditButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  userBlockButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  userUnblockButton: {
    backgroundColor: "rgba(16, 185, 129, 0.10)",
    borderColor: "rgba(16, 185, 129, 0.22)",
  },

  userActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  userActionIconDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },

  userActionIconSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },

  userEditButtonText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  userBlockButtonText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "900",
  },

  userUnblockButtonText: {
    color: "#10B981",
  },

  adminLockedBox: {
    width: "100%",
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  adminLockedText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  userOpenButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  userOpenButtonText: {
    flex: 1,
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "900",
  },
});
