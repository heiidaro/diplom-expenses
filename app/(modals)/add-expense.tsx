import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";

export default function AddExpenseScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Добавить расход</Text>

          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.subtitle}>
          Выберите способ добавления траты. QR-чек будет обработан
          автоматически.
        </Text>

        <View style={styles.options}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/receipt-scan")}
            activeOpacity={0.85}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="qr-code-outline"
                size={30}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Сканировать QR-чек</Text>
              <Text style={styles.optionSubtitle}>
                Приложение считает сумму и дату из QR-кода
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/electronic-receipt")}
            activeOpacity={0.85}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="document-text-outline"
                size={26}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Электронный чек</Text>
              <Text style={styles.optionText} numberOfLines={2}>
                Вставить текст или выбрать файл электронного чека
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/manual-expense")}
            activeOpacity={0.85}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="create-outline" size={30} color={COLORS.accent} />
            </View>

            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Добавить вручную</Text>
              <Text style={styles.optionSubtitle}>
                Введите сумму, комментарий и категорию самостоятельно
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.accent}
          />
          <Text style={styles.infoText}>
            При сканировании QR-кода чек сохраняется как автоматический источник
            расхода. Если категория неизвестна, расход попадает в “Другое”.
          </Text>
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
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSecond,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  optionInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    marginRight: 10,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  optionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  optionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
