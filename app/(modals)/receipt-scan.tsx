import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { account } from "../../lib/appwrite";
import { COLORS } from "../../lib/theme";
import { getUserCategories } from "../../services/categoryService";
import {
  createExpenseFromParsedReceiptQr,
  parseReceiptQr,
} from "../../services/receiptService";
import { Category, ParsedReceiptQr } from "../../types/models";
import { formatDate, formatMoney } from "../../utils/format";
import {
  findCategoryByText,
  saveCategoryRuleFromText,
} from "../../services/categoryRuleService";

export default function ReceiptScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceiptQr | null>(
    null
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [receiptNote, setReceiptNote] = useState("");

  const processingRef = useRef(false);

  function getDefaultCategoryId(loadedCategories: Category[]) {
    const otherCategory =
      loadedCategories.find((category) =>
        category.name.toLowerCase().includes("другое")
      ) || loadedCategories[0];

    return otherCategory?.$id || "";
  }

  async function handleBarcodeScanned(result: { data: string }) {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setScanned(true);
    setIsProcessing(true);

    try {
      const user = await account.get();
      const loadedCategories = await getUserCategories(user.$id);
      const parsed = parseReceiptQr(result.data);

      setCategories(loadedCategories);
      setSelectedCategoryId(getDefaultCategoryId(loadedCategories));
      setParsedReceipt(parsed);
      setIsConfirmVisible(true);
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        "Не удалось обработать QR-код",
        error?.message || "Проверьте, что это QR-код кассового чека.",
        [
          {
            text: "Сканировать снова",
            onPress: () => {
              processingRef.current = false;
              setScanned(false);
              setIsProcessing(false);
            },
          },
          {
            text: "Закрыть",
            style: "cancel",
            onPress: () => router.back(),
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleScanAgain() {
    processingRef.current = false;
    setScanned(false);
    setIsProcessing(false);
    setParsedReceipt(null);
    setIsConfirmVisible(false);
    setSelectedCategoryId("");
    setReceiptNote("");
  }

  async function handleSaveReceiptExpense() {
    try {
      if (!parsedReceipt) {
        Alert.alert("Ошибка", "Данные чека не найдены");
        return;
      }

      if (!selectedCategoryId) {
        Alert.alert("Ошибка", "Выберите категорию");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      await createExpenseFromParsedReceiptQr({
        userId: user.$id,
        parsed: parsedReceipt,
        categoryId: selectedCategoryId,
        note: receiptNote.trim() || "Покупка по QR-чеку",
      });

      await saveCategoryRuleFromText({
        userId: user.$id,
        text: receiptNote.trim(),
        categoryId: selectedCategoryId,
      });

      Alert.alert("Готово", "Расход по QR-чеку добавлен", [
        {
          text: "ОК",
          onPress: () => router.replace("/home"),
        },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Ошибка", error?.message || "Не удалось сохранить расход");
    } finally {
      setIsSaving(false);
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.centerText}>Проверка доступа к камере...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={42} color={COLORS.accent} />
          </View>

          <Text style={styles.permissionTitle}>Нужен доступ к камере</Text>
          <Text style={styles.permissionText}>
            Чтобы сканировать QR-код чека, разрешите приложению использовать
            камеру.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.primaryButtonText}>Разрешить доступ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              processingRef.current = false;
              router.back();
            }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>QR-чек</Text>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.scanFrameWrapper}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <Text style={styles.scanHint}>
            Наведите камеру на QR-код кассового чека
          </Text>
        </View>

        {isProcessing ? (
          <View style={styles.processingCard}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.processingText}>Обработка чека...</Text>
          </View>
        ) : (
          <View />
        )}
      </SafeAreaView>

      <Modal visible={isConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Подтвердите расход</Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleScanAgain}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {parsedReceipt ? (
              <View style={styles.receiptSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Сумма</Text>
                  <Text style={styles.summaryValue}>
                    {formatMoney(parsedReceipt.totalAmount)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Дата</Text>
                  <Text style={styles.summaryValue}>
                    {formatDate(parsedReceipt.purchaseDate)}
                  </Text>
                </View>

                {parsedReceipt.fiscalNumber ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>ФН</Text>
                    <Text style={styles.summaryValueSmall}>
                      {parsedReceipt.fiscalNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.label}>Название или комментарий</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: стоматология, аптека, кофе"
              placeholderTextColor={COLORS.textMuted}
              value={receiptNote}
              onChangeText={async (value) => {
                setReceiptNote(value);

                try {
                  const user = await account.get();

                  const matchedCategoryId = await findCategoryByText({
                    userId: user.$id,
                    text: value,
                  });

                  if (matchedCategoryId) {
                    setSelectedCategoryId(matchedCategoryId);
                  }
                } catch {
                  // Автоподбор не должен мешать сохранению QR-чека
                }
              }}
            />

            <Text style={styles.fieldHint}>
              Если приложение уже знает похожий комментарий, категория выберется автоматически.
            </Text>

            <Text style={styles.label}>Категория</Text>

            <ScrollView
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoryChips}
            >
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.$id;

                return (
                  <TouchableOpacity
                    key={category.$id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategoryId(category.$id)}
                  >
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color || COLORS.accent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveReceiptExpense}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Сохранить расход</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={handleScanAgain}
              disabled={isSaving}
            >
              <Text style={styles.scanAgainText}>Сканировать другой QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    marginBottom: 8,
  },
  fieldHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 18,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerText: {
    color: COLORS.textSecond,
    fontSize: 15,
    marginTop: 12,
  },
  permissionContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  permissionText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
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
    fontWeight: "900",
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  scanFrameWrapper: {
    alignItems: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 54,
    height: 54,
    borderColor: COLORS.accent,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 24,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 24,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 24,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 24,
  },
  scanHint: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
    lineHeight: 22,
  },
  processingCard: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardSecond,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptSummary: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  summaryValueSmall: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 170,
    textAlign: "right",
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  categoriesScroll: {
    maxHeight: 170,
    marginBottom: 18,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardSecond,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryChipText: {
    color: COLORS.textSecond,
    fontSize: 14,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: COLORS.text,
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
  scanAgainButton: {
    marginTop: 12,
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scanAgainText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
});