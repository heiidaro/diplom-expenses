import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../../lib/theme";

export default function StatisticsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Статистика</Text>
        <Text style={styles.subtitle}>
          Здесь будут графики по дням, месяцам, категориям и средним расходам
        </Text>

        <View style={styles.card}>
          <Ionicons name="bar-chart-outline" size={32} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Гистограмма расходов</Text>
          <Text style={styles.cardText}>
            На следующем этапе подключим реальные данные из коллекции expenses
          </Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="pie-chart-outline" size={32} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Расходы по категориям</Text>
          <Text style={styles.cardText}>
            Здесь будет круговая диаграмма с процентами и суммами
          </Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="analytics-outline" size={32} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Аналитика</Text>
          <Text style={styles.cardText}>
            Средняя сумма трат и самая популярная категория за все время
          </Text>
        </View>
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
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecond,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 8,
  },
  cardText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});