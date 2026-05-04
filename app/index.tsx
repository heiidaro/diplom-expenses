import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../lib/appwrite";
import { COLORS } from "../lib/theme";

export default function StartScreen() {
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const currentUser = await account.get();

      const labels = Array.isArray(currentUser.labels)
        ? currentUser.labels
        : [];

      if (labels.includes("admin")) {
        router.replace("/(admin)/dashboard" as any);
        return;
      }

      router.replace("/home");
    } catch {
      // Пользователь не авторизован
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.logo}>FinFlow</Text>
          <Text style={styles.title}>Автоматизированный учет расходов</Text>
          <Text style={styles.subtitle}>
            QR-чеки, электронные чеки, регулярные расходы и автоматическое
            обучение категорий в одном приложении.
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/sign-in")}
          >
            <Text style={styles.primaryButtonText}>Войти</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/sign-up")}
          >
            <Text style={styles.secondaryButtonText}>Создать аккаунт</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: "space-between",
  },
  logo: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 28,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    color: COLORS.textSecond,
    fontSize: 16,
    lineHeight: 24,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
});