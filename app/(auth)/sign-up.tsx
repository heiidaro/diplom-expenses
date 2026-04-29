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
import { account, ID } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignUp() {
    try {
      if (!name.trim() || !email.trim() || !password.trim()) {
        Alert.alert("Ошибка", "Заполните все поля");
        return;
      }

      if (password.length < 8) {
        Alert.alert("Ошибка", "Пароль должен быть минимум 8 символов");
        return;
      }

      const commonPasswords = [
        "12345678",
        "123456789",
        "qwerty123",
        "password123",
        "admin12345",
      ];

      if (commonPasswords.includes(password.toLowerCase())) {
        Alert.alert(
          "Ошибка",
          "Пароль слишком простой. Придумайте более надежный пароль"
        );
        return;
      }

      await account.create(ID.unique(), email.trim(), password, name.trim());
      await account.createEmailPasswordSession(email.trim(), password);

      router.replace("/home");
    } catch (error: any) {
      console.error(error);

      const message =
        error?.message ===
        "Invalid `password` param: Password must be between 8 and 265 characters long, and should not be one of the commonly used password."
          ? "Пароль должен быть от 8 символов и не должен быть слишком простым"
          : error?.message || "Не удалось создать аккаунт";

      Alert.alert("Ошибка регистрации", message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View>
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>Создайте аккаунт для учета расходов</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Имя"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />

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

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
            <Text style={styles.primaryButtonText}>Создать аккаунт</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/sign-in")}>
            <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
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