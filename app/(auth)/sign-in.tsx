import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import {
  isAdminAccount,
  isUserBlockedByProfile,
  logoutCurrentSessionSafely,
} from "../../services/blockedUserService";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignIn() {
  try {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Ошибка", "Введите почту и пароль");
      return;
    }

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
        "Ваш аккаунт заблокирован. Обратитесь в поддержку."
      );

      router.replace("/");
      return;
    }

    router.replace("/home");
  } catch (error: any) {
    console.error(error);

    const message = String(error?.message || "").toLowerCase();

    const isBlockedError =
      message.includes("blocked") ||
      message.includes("disabled") ||
      message.includes("status");

    if (isBlockedError) {
      Alert.alert(
        "Аккаунт заблокирован",
        "Ваш аккаунт заблокирован. Обратитесь в поддержку."
      );
      return;
    }

    Alert.alert(
      "Ошибка входа",
      error?.message || "Проверьте почту и пароль"
    );
  }
}

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View>
          <Text style={styles.title}>Вход</Text>
          <Text style={styles.subtitle}>Войдите в аккаунт для учета расходов</Text>
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
          />

          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
            <Text style={styles.primaryButtonText}>Войти</Text>
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
});