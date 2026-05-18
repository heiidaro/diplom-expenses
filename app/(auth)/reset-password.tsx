import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import { confirmPasswordRecovery } from "../../services/passwordRecoveryService";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    userId?: string;
    secret?: string;
  }>();

  const userId = String(params.userId || "");
  const secret = String(params.secret || "");

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleResetPassword() {
    try {
      if (!userId || !secret) {
        Alert.alert(
          "Ошибка",
          "Ссылка восстановления некорректна или устарела. Запросите письмо повторно.",
        );
        return;
      }

      if (!password.trim() || !passwordAgain.trim()) {
        Alert.alert("Ошибка", "Введите новый пароль два раза");
        return;
      }

      if (password.trim().length < 8) {
        Alert.alert("Ошибка", "Пароль должен быть не короче 8 символов");
        return;
      }

      if (password.trim() !== passwordAgain.trim()) {
        Alert.alert("Ошибка", "Пароли не совпадают");
        return;
      }

      setIsSaving(true);

      await confirmPasswordRecovery({
        userId,
        secret,
        password: password.trim(),
      });

      Alert.alert(
        "Готово",
        "Пароль успешно изменен. Теперь можно войти с новым паролем.",
      );

      router.replace("/(auth)/sign-in" as any);
    } catch (error: any) {
      console.error(error);

      Alert.alert("Ошибка", error?.message || "Не удалось изменить пароль");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/(auth)/sign-in" as any)}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={34} color={COLORS.accent} />
          </View>

          <Text style={styles.title}>Новый пароль</Text>

          <Text style={styles.subtitle}>
            Придумайте новый пароль для входа в приложение.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Новый пароль"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isSaving}
          />

          <TextInput
            style={styles.input}
            placeholder="Повторите пароль"
            placeholderTextColor={COLORS.textMuted}
            value={passwordAgain}
            onChangeText={setPasswordAgain}
            secureTextEntry
            editable={!isSaving}
          />

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Сохранить пароль</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 22,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textSecond,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 26,
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
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
