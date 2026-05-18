import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  beginLogout,
  deleteCurrentSessionSafely,
  finishLogoutLater,
  isGuestOrSessionError,
} from "../../services/sessionGuardService";

interface UserData {
  $id: string;
  name: string;
  email: string;
}

export default function SettingsScreen() {
  const [user, setUser] = useState<UserData | null>(null);

  const [name, setName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, []),
  );

  async function loadUser() {
    try {
      setIsLoading(true);

      const currentUser = await account.get();

      setUser({
        $id: currentUser.$id,
        name: currentUser.name || "",
        email: currentUser.email || "",
      });

      setName(currentUser.name || "");
    } catch (error: any) {
      if (isGuestOrSessionError(error)) {
        router.replace("/");
        return;
      }

      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось загрузить данные пользователя",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateName() {
    try {
      if (!name.trim()) {
        Alert.alert("Ошибка", "Введите имя");
        return;
      }

      setIsSavingName(true);

      const updatedUser = await account.updateName(name.trim());

      setUser({
        $id: updatedUser.$id,
        name: updatedUser.name || "",
        email: updatedUser.email || "",
      });

      Alert.alert("Готово", "Имя пользователя обновлено");
    } catch (error: any) {
      Alert.alert("Ошибка", error?.message || "Не удалось обновить имя");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleUpdatePassword() {
    try {
      if (!oldPassword.trim()) {
        Alert.alert("Ошибка", "Введите текущий пароль");
        return;
      }

      if (!newPassword.trim()) {
        Alert.alert("Ошибка", "Введите новый пароль");
        return;
      }

      if (newPassword.length < 8) {
        Alert.alert("Ошибка", "Новый пароль должен быть не короче 8 символов");
        return;
      }

      setIsSavingPassword(true);

      await account.updatePassword(newPassword, oldPassword);

      setOldPassword("");
      setNewPassword("");

      Alert.alert("Готово", "Пароль успешно изменен");
    } catch (error: any) {
      Alert.alert("Ошибка", error?.message || "Не удалось изменить пароль");
    } finally {
      setIsSavingPassword(false);
    }
  }

  function confirmLogout() {
    Alert.alert("Выйти из аккаунта?", "Текущая сессия будет завершена.", [
      {
        text: "Отмена",
        style: "cancel",
      },
      {
        text: "Выйти",
        style: "destructive",
        onPress: handleLogout,
      },
    ]);
  }

  async function handleLogout() {
    try {
      beginLogout();

      setIsLoggingOut(true);

      await deleteCurrentSessionSafely();

      router.replace("/");

      finishLogoutLater();
    } catch (error: any) {
      finishLogoutLater();

      if (isGuestOrSessionError(error)) {
        router.replace("/");
        return;
      }

      Alert.alert("Ошибка", error?.message || "Не удалось выйти из аккаунта");
    } finally {
      setIsLoggingOut(false);
    }
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

          <Text style={styles.headerTitle}>Настройки</Text>

          <View style={{ width: 44 }} />
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Загрузка настроек...</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.name || "Пользователь"}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Данные аккаунта</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ID пользователя</Text>
                <Text style={styles.infoValueSmall}>{user?.$id}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Изменить имя</Text>

              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите имя"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSavingName && styles.saveButtonDisabled,
                ]}
                onPress={handleUpdateName}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Сохранить имя</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Смена пароля</Text>

              <Text style={styles.label}>Текущий пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите текущий пароль"
                placeholderTextColor={COLORS.textMuted}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
              />

              <Text style={styles.label}>Новый пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Минимум 8 символов"
                placeholderTextColor={COLORS.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSavingPassword && styles.saveButtonDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Изменить пароль</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                isLoggingOut && styles.saveButtonDisabled,
              ]}
              onPress={confirmLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color={COLORS.danger} />
              ) : (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={22}
                    color={COLORS.danger}
                  />
                  <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
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
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
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
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 16,
  },
  infoRow: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 16,
    padding: 14,
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
    fontSize: 15,
    fontWeight: "800",
  },
  infoValueSmall: {
    color: COLORS.textSecond,
    fontSize: 12,
    fontWeight: "700",
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
    marginBottom: 16,
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
  logoutButton: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    flexDirection: "row",
    gap: 8,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "900",
  },
});
