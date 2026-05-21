import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  isAdminAccount,
  isUserBlockedByProfile,
  logoutCurrentSessionSafely,
} from "../../services/blockedUserService";
import { isGuestOrSessionError } from "../../services/sessionGuardService";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем существующую сессию при загрузке
  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const currentUser = await account.get();
      // Если сессия есть, перенаправляем
      if (currentUser) {
        if (isAdminAccount(currentUser)) {
          router.replace("/(admin)/dashboard" as any);
        } else {
          const isBlocked = await isUserBlockedByProfile(currentUser.$id);
          if (isBlocked) {
            await logoutCurrentSessionSafely();
            setIsLoading(false);
          } else {
            router.replace("/home");
          }
        }
      }
    } catch {
      // Нет активной сессии — это нормально
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn() {
    if (isLoading) return;

    try {
      if (!email.trim() || !password.trim()) {
        Alert.alert("Ошибка", "Введите почту и пароль");
        return;
      }

      setIsLoading(true);

      await logoutCurrentSessionSafely();

      await account.createEmailPasswordSession(email.trim(), password);

      const currentUser = await account.get();

      console.log("CURRENT USER AFTER LOGIN:", {
        id: currentUser.$id,
        email: currentUser.email,
        labels: currentUser.labels,
      });

      if (isAdminAccount(currentUser)) {
        router.replace("/(admin)/dashboard" as any);
        return;
      }

      const isBlocked = await isUserBlockedByProfile(currentUser.$id);

      if (isBlocked) {
        await logoutCurrentSessionSafely();
        Alert.alert(
          "Аккаунт заблокирован",
          "Ваш аккаунт заблокирован. Обратитесь в поддержку.",
        );
        router.replace("/");
        return;
      }

      router.replace("/home");
    } catch (error: any) {
      if (isGuestOrSessionError(error)) {
        return;
      }

      const message = String(error?.message || "").toLowerCase();
      const isBlockedError =
        message.includes("blocked") ||
        message.includes("disabled") ||
        message.includes("status");

      if (isBlockedError) {
        Alert.alert(
          "Аккаунт заблокирован",
          "Ваш аккаунт заблокирован. Обратитесь в поддержку.",
        );
        return;
      }

      Alert.alert("Ошибка входа", error?.message || "Проверьте почту и пароль");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View>
          <Text style={styles.title}>Вход</Text>
          <Text style={styles.subtitle}>
            Войдите в аккаунт для учета расходов
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push("/(auth)/forgot-password" as any)}
            disabled={isLoading}
          >
            <Text style={styles.forgotButtonText}>Забыли пароль?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Вход..." : "Войти"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/sign-up")}>
            <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -6,
    marginBottom: 2,
  },

  forgotButtonText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecond,
    fontSize: 15,
    marginBottom: 28,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  link: {
    color: COLORS.accent,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
