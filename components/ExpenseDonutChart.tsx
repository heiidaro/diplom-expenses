import { arc, pie, PieArcDatum } from "d3-shape";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { COLORS } from "../lib/theme";
import {
  CategoryChartItem,
  ChartPeriod,
  getPeriodLabel,
} from "../services/statisticsService";
import { formatMoney } from "../utils/format";

type Props = {
  data: CategoryChartItem[];
  totalAmount: number;
  selectedCategoryId: string | null;
  selectedPeriod: ChartPeriod;
  onSelectCategory: (categoryId: string | null) => void;
  onChangePeriod: (period: ChartPeriod) => void;
};

const PERIODS: {
  label: string;
  value: ChartPeriod;
}[] = [
  {
    label: "Нед",
    value: "week",
  },
  {
    label: "Мес",
    value: "month",
  },
  {
    label: "Год",
    value: "year",
  },
];

export default function ExpenseDonutChart({
  data,
  totalAmount,
  selectedCategoryId,
  selectedPeriod,
  onSelectCategory,
  onChangePeriod,
}: Props) {
  const size = 260;
  const outerRadius = 96;
  const innerRadius = 58;
  const labelRadius = outerRadius + 22;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.96);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedPeriod, data.length]);

  const pieData = useMemo(() => {
    return pie<CategoryChartItem>()
      .value((item) => item.total)
      .sort(null)(data);
  }, [data]);

  const selectedItem = data.find(
    (item) => item.categoryId === selectedCategoryId
  );

  const centerTitle = selectedItem
    ? selectedItem.name
    : `Всего ${getPeriodLabel(selectedPeriod)}`;

  const centerValue = selectedItem ? selectedItem.total : totalAmount;

  if (!data.length) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.periodSwitcher}>
          {PERIODS.map((period) => {
            const isActive = selectedPeriod === period.value;

            return (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  isActive && styles.periodButtonActive,
                ]}
                onPress={() => onChangePeriod(period.value)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    isActive && styles.periodButtonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.emptyTitle}>Структура расходов</Text>
        <Text style={styles.emptyText}>
          За выбранный период расходов пока нет. Добавьте траты, и здесь
          появится диаграмма.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>Структура расходов</Text>
          <Text style={styles.subtitle}>
            {getPeriodLabel(selectedPeriod)} · нажмите на сектор или тег
          </Text>
        </View>

        <View style={styles.periodSwitcher}>
          {PERIODS.map((period) => {
            const isActive = selectedPeriod === period.value;

            return (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  isActive && styles.periodButtonActive,
                ]}
                onPress={() => onChangePeriod(period.value)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    isActive && styles.periodButtonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.chartWrap}>
        <Svg width={size} height={size}>
          <G x={size / 2} y={size / 2}>
            {pieData.map((segment) => {
              const isSelected =
                selectedCategoryId === segment.data.categoryId;

              const path = arc<PieArcDatum<CategoryChartItem>>()
                .outerRadius(isSelected ? outerRadius + 8 : outerRadius)
                .innerRadius(innerRadius)
                .cornerRadius(10)
                .padAngle(0.025)(segment);

              return (
                <Path
                  key={segment.data.categoryId}
                  d={path || ""}
                  fill={segment.data.color}
                  opacity={selectedCategoryId && !isSelected ? 0.3 : 1}
                  stroke={isSelected ? COLORS.background : "transparent"}
                  strokeWidth={isSelected ? 5 : 0}
                  onPress={() =>
                    onSelectCategory(
                      isSelected ? null : segment.data.categoryId
                    )
                  }
                />
              );
            })}

            <Circle cx={0} cy={0} r={innerRadius - 8} fill={COLORS.card} />

            {pieData.map((segment) => {
              if (segment.data.percent < 6) {
                return null;
              }

              const isSelected =
                selectedCategoryId === segment.data.categoryId;

              const labelArc = arc<PieArcDatum<CategoryChartItem>>()
                .outerRadius(labelRadius)
                .innerRadius(labelRadius);

              const [x, y] = labelArc.centroid(segment);

              return (
                <SvgText
                  key={`label_${segment.data.categoryId}`}
                  x={x}
                  y={y}
                  fill={isSelected ? segment.data.color : COLORS.textSecond}
                  fontSize={11}
                  fontWeight="700"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  opacity={selectedCategoryId && !isSelected ? 0.35 : 1}
                >
                  {`${segment.data.percent.toFixed(0)}%`}
                </SvgText>
              );
            })}
          </G>
        </Svg>

        <View style={styles.centerContent}>
          <Text style={styles.centerTitle} numberOfLines={2}>
            {centerTitle}
          </Text>
          <Text style={styles.centerValue}>{formatMoney(centerValue)}</Text>
        </View>
      </View>

      <View style={styles.tagsWrap}>
        {data.map((item) => {
          const isActive = selectedCategoryId === item.categoryId;

          return (
            <TouchableOpacity
              key={item.categoryId}
              style={[
                styles.tag,
                isActive && styles.tagActive,
                isActive && { borderColor: item.color },
              ]}
              onPress={() =>
                onSelectCategory(isActive ? null : item.categoryId)
              }
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.tagIcon,
                  { backgroundColor: `${item.color}26` },
                ]}
              >
                <View style={[styles.tagDot, { backgroundColor: item.color }]} />
              </View>

              <Text style={styles.tagText} numberOfLines={1}>
                {item.name}
              </Text>

              <Text style={styles.tagAmount}>
                {formatMoney(item.total)}
              </Text>

              <Text style={styles.tagPercent}>
                {item.percent.toFixed(1)}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    marginBottom: 24,
  },
  headerRow: {
    marginBottom: 8,
  },
  cardHeader: {
    marginBottom: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  periodSwitcher: {
    flexDirection: "row",
    backgroundColor: COLORS.cardSecond,
    borderRadius: 999,
    padding: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  periodButtonActive: {
    backgroundColor: COLORS.accent,
  },
  periodButtonText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "900",
  },
  periodButtonTextActive: {
    color: COLORS.white,
  },
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  centerContent: {
    position: "absolute",
    width: 142,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 16,
  },
  centerValue: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  tagsWrap: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
},
  tag: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardSecond,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagActive: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1.5,
  },
  tagIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  tagDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 105,
    marginRight: 6,
  },
  tagAmount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 6,
  },
  tagPercent: {
    color: COLORS.textSecond,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});