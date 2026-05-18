import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { sendPasswordRecoveryEmail } from "../../services/passwordRecoveryService";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSendRecoveryEmail() {
    try {
      if (!email.trim()) {
        Alert.alert("Ошибка", "Введите email");
        return;
      }

      setIsSending(true);

      await sendPasswordRecoveryEmail(email.trim());

      Alert.alert(
        "Письмо отправлено",
        "Проверьте почту и перейдите по ссылке для восстановления пароля.",
      );

      router.back();
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        "Ошибка",
        error?.message ||
          "Не удалось отправить письмо для восстановления пароля",
      );
    } finally {
      setIsSending(false);
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
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={34} color={COLORS.accent} />
          </View>

          <Text style={styles.title}>Восстановление пароля</Text>

          <Text style={styles.subtitle}>
            Введите email, который был указан при регистрации. Мы отправим
            ссылку для создания нового пароля.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isSending}
          />

          <TouchableOpacity
            style={[styles.primaryButton, isSending && styles.buttonDisabled]}
            onPress={handleSendRecoveryEmail}
            disabled={isSending}
            activeOpacity={0.85}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Отправить письмо</Text>
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
