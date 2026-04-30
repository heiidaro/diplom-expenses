import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  ActivityIndicator,
  Alert,
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
  createExpenseFromElectronicReceipt,
  ElectronicReceiptFile,
  ParsedElectronicReceipt,
  parseElectronicReceiptText,
  uploadElectronicReceiptFile,
  parsePdfReceiptWithFunction,
} from "../../services/electronicReceiptService";
import {
  findCategoryByText,
  saveCategoryRuleFromText,
} from "../../services/categoryRuleService";
import { Category } from "../../types/models";
import { formatDate, formatMoney } from "../../utils/format";

function getSafeFileName(fileName: string) {
  const fallbackName = `receipt_${Date.now()}.pdf`;

  return (fileName || fallbackName)
    .replace(/[^\wа-яА-ЯёЁ.\-()]+/g, "_")
    .replace(/_+/g, "_");
}

async function preparePickedFileForUpload(asset: any): Promise<ElectronicReceiptFile> {
  const safeName = getSafeFileName(asset.name || `receipt_${Date.now()}.pdf`);

  const sourceInfo = await FileSystem.getInfoAsync(asset.uri, {
    size: true,
  });

  if (!sourceInfo.exists) {
    throw new Error(
      "Выбранный файл недоступен. Попробуйте выбрать его снова из папки «Файлы» или сначала сохраните PDF на устройство."
    );
  }

  const localUri = `${FileSystem.cacheDirectory}${Date.now()}_${safeName}`;

  await FileSystem.copyAsync({
    from: asset.uri,
    to: localUri,
  });

  const copiedInfo = await FileSystem.getInfoAsync(localUri, {
    size: true,
  });

  if (!copiedInfo.exists) {
    throw new Error("Не удалось скопировать чек во временную папку приложения");
  }

  return {
    uri: localUri,
    name: safeName,
    mimeType: asset.mimeType || "application/pdf",
    size:
      "size" in copiedInfo && copiedInfo.size
        ? copiedInfo.size
        : asset.size || 0,
  };
}

export default function ElectronicReceiptScreen() {
  const [rawText, setRawText] = useState("");
  const [parsedReceipt, setParsedReceipt] =
    useState<ParsedElectronicReceipt | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [note, setNote] = useState("");

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.$id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const [selectedFile, setSelectedFile] = useState<ElectronicReceiptFile | null>(
    null
  );

  const [uploadedReceiptFileId, setUploadedReceiptFileId] = useState("");

  function getDefaultCategoryId(loadedCategories: Category[]) {
    const otherCategory =
      loadedCategories.find((category) =>
        category.name.toLowerCase().includes("другое")
      ) || loadedCategories[0];

    return otherCategory?.$id || "";
  }

  function isTextFile(fileName: string, mimeType?: string) {
    const lowerName = fileName.toLowerCase();

    return (
      mimeType?.includes("text") ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".html") ||
      lowerName.endsWith(".htm") ||
      lowerName.endsWith(".csv")
    );
  }

  function isPdfFile(fileName: string, mimeType?: string) {
    return (
      mimeType === "application/pdf" ||
      fileName.toLowerCase().endsWith(".pdf")
    );
  }

  async function handlePickReceiptFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "text/html",
          "text/csv",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      const file = await preparePickedFileForUpload(asset);

      console.log("Выбран файл чека:", {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });

      setSelectedFile(file);
      setUploadedReceiptFileId("");

      if (isTextFile(file.name, file.mimeType)) {
        const fileText = await FileSystem.readAsStringAsync(file.uri);
        setRawText(fileText);
        handleReset();

        Alert.alert("Файл загружен", "Текст чека подставлен в поле ниже");
        return;
      }

      if (isPdfFile(file.name, file.mimeType)) {
        Alert.alert(
          "PDF выбран",
          "Нажмите «Распознать чек», чтобы приложение автоматически извлекло сумму, дату и магазин из PDF."
        );
        return;
      }

      Alert.alert(
        "Файл выбран",
        "Файл будет прикреплен к расходу после сохранения"
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось выбрать файл электронного чека"
      );
    }
  }

  async function handleParseReceipt() {
    try {
      setIsParsing(true);

      const user = await account.get();
      const loadedCategories = await getUserCategories(user.$id);

      let parsed: ParsedElectronicReceipt;
      let currentUploadedFileId = uploadedReceiptFileId;

      if (rawText.trim()) {
        parsed = parseElectronicReceiptText(rawText);
      } else if (selectedFile && isPdfFile(selectedFile.name, selectedFile.mimeType)) {
        if (!currentUploadedFileId) {
          currentUploadedFileId = await uploadElectronicReceiptFile(selectedFile);
          setUploadedReceiptFileId(currentUploadedFileId);
        }

        parsed = await parsePdfReceiptWithFunction(currentUploadedFileId);
        setRawText(parsed.rawText);
      } else {
        Alert.alert(
          "Нет данных",
          "Вставьте текст электронного чека или выберите PDF-файл"
        );
        return;
      }

      const matchedCategoryId = await findCategoryByText({
        userId: user.$id,
        text: `${parsed.merchantName} ${parsed.note}`,
      });

      setCategories(loadedCategories);
      setParsedReceipt(parsed);
      setNote(parsed.note);

      setSelectedCategoryId(
        matchedCategoryId || getDefaultCategoryId(loadedCategories)
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Не удалось разобрать чек",
        error?.message || "Проверьте электронный чек"
      );
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSaveExpense() {
    try {
      if (!parsedReceipt) {
        Alert.alert("Ошибка", "Сначала распознайте электронный чек");
        return;
      }

      if (!selectedCategoryId) {
        Alert.alert("Ошибка", "Выберите категорию");
        return;
      }

      setIsSaving(true);

      const user = await account.get();

      let receiptFileId = uploadedReceiptFileId;

      if (selectedFile && !receiptFileId) {
        receiptFileId = await uploadElectronicReceiptFile(selectedFile);
        setUploadedReceiptFileId(receiptFileId);
      }

      await createExpenseFromElectronicReceipt({
        userId: user.$id,
        parsed: parsedReceipt,
        categoryId: selectedCategoryId,
        note: note.trim() || parsedReceipt.note,
        receiptFileId,
      });

      await saveCategoryRuleFromText({
        userId: user.$id,
        text: note.trim() || parsedReceipt.merchantName,
        categoryId: selectedCategoryId,
      });

      Alert.alert("Готово", "Расход по электронному чеку добавлен", [
        {
          text: "ОК",
          onPress: () => router.replace("/home"),
        },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось сохранить расход"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setParsedReceipt(null);
    setCategories([]);
    setSelectedCategoryId("");
    setNote("");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Электронный чек</Text>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="receipt-outline" size={26} color={COLORS.accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Добавление по тексту чека</Text>
            <Text style={styles.infoText}>
              Вставьте текст электронного чека. Приложение попробует найти сумму,
              дату и организацию автоматически.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Файл электронного чека</Text>
          <TouchableOpacity
            style={styles.filePickerButton}
            onPress={handlePickReceiptFile}
            activeOpacity={0.85}
          >
            <View style={styles.filePickerIcon}>
              <Ionicons name="attach-outline" size={22} color={COLORS.accent} />
            </View>

            <View style={styles.filePickerInfo}>
              <Text style={styles.filePickerTitle}>
                {selectedFile ? selectedFile.name : "Выбрать PDF / TXT / HTML"}
              </Text>
              <Text style={styles.filePickerText} numberOfLines={2}>
                {selectedFile
                  ? "Файл будет прикреплен к расходу"
                  : "Можно выбрать электронный чек файлом"}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Текст электронного чека</Text>

          <TextInput
            style={styles.textArea}
            placeholder={`Например:\nСтоматология Улыбка\nДата: 30.04.2026\nИтого: 2500 ₽`}
            placeholderTextColor={COLORS.textMuted}
            value={rawText}
            onChangeText={(value) => {
              setRawText(value);
              if (parsedReceipt) {
                handleReset();
              }
            }}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.primaryButton, isParsing && styles.buttonDisabled]}
            onPress={handleParseReceipt}
            disabled={isParsing}
          >
            {isParsing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={19} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Распознать чек</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {parsedReceipt ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Проверьте данные</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Сумма</Text>
                <Text style={styles.summaryValue}>
                  {formatMoney(parsedReceipt.amount)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Дата</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(parsedReceipt.date)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Организация</Text>
                <Text style={styles.summaryValueSmall}>
                  {parsedReceipt.merchantName}
                </Text>
              </View>
            </View>
            {parsedReceipt.items && parsedReceipt.items.length > 0 ? (
              <View style={styles.itemsCard}>
                <Text style={styles.itemsTitle}>Товары из чека</Text>

                {parsedReceipt.items.map((item, index) => (
                  <View key={`${item}_${index}`} style={styles.itemRow}>
                    <Text style={styles.itemIndex}>{index + 1}</Text>
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.label}>Комментарий</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Комментарий к расходу"
              placeholderTextColor={COLORS.textMuted}
              value={note}
              multiline
              textAlignVertical="top"
              onChangeText={async (value) => {
                setNote(value);

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
                  // автоподбор не должен мешать вводу
                }
              }}
            />

            <Text style={styles.label}>Категория</Text>

            <View style={styles.categoryChips}>
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
            </View>

            {selectedCategory ? (
              <Text style={styles.selectedHint}>
                Выбрана категория: {selectedCategory.name}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveExpense}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Сохранить расход</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    marginBottom: 18,
  },
  infoIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  textArea: {
    minHeight: 190,
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  summaryValueSmall: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 190,
    textAlign: "right",
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
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
    fontWeight: "800",
  },
  categoryChipTextActive: {
    color: COLORS.text,
  },
  selectedHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },
  filePickerButton: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  filePickerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  filePickerInfo: {
    flex: 1,
    minWidth: 0,
  },
  filePickerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  filePickerText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  noteInput: {
    minHeight: 130,
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 16,
  },
  itemsCard: {
    backgroundColor: COLORS.cardSecond,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  itemsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    color: COLORS.accent,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "900",
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
});