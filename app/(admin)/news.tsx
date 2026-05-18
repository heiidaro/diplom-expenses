import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import {
  AdminNews,
  getAdminNews,
  getMeAdminStatus,
  publishAdminNews,
} from "../../services/adminService";

type NewsType = "news" | "system" | "update";

function formatDate(value?: string) {
  if (!value) return "Нет данных";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Нет данных";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTypeLabel(type?: string) {
  if (type === "system") return "Системное";
  if (type === "update") return "Обновление";
  return "Новость";
}

function getTypeIcon(type?: string) {
  if (type === "system") return "settings-outline";
  if (type === "update") return "rocket-outline";
  return "megaphone-outline";
}

function getTypeColor(type?: string) {
  if (type === "system") return "#F59E0B";
  if (type === "update") return "#10B981";
  return COLORS.accent;
}

export default function AdminNewsScreen() {
  const [news, setNews] = useState<AdminNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NewsType>("news");
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadNews();
    }, []),
  );

  async function loadNews() {
    try {
      setIsLoading(true);

      await getMeAdminStatus();

      const loadedNews = await getAdminNews();
      setNews(loadedNews);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Ошибка", error?.message || "Не удалось загрузить новости");
      router.replace("/home");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadNews();
  }

  async function handlePublishNews() {
    try {
      if (!title.trim()) {
        Alert.alert("Ошибка", "Введите заголовок новости");
        return;
      }

      if (!message.trim()) {
        Alert.alert("Ошибка", "Введите текст новости");
        return;
      }

      setIsPublishing(true);

      await publishAdminNews({
        title: title.trim(),
        message: message.trim(),
        type,
      });

      setTitle("");
      setMessage("");
      setType("news");

      await loadNews();

      Alert.alert(
        "Готово",
        "Новость опубликована, пользователи получат уведомление",
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Ошибка",
        error?.message || "Не удалось опубликовать новость",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  const filteredNews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return news;

    return news.filter((item) => {
      return (
        item.title?.toLowerCase().includes(normalizedSearch) ||
        item.message?.toLowerCase().includes(normalizedSearch) ||
        item.type?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [news, search]);

  function TypeButton(props: { value: NewsType; label: string; icon: any }) {
    const isActive = type === props.value;

    return (
      <TouchableOpacity
        style={[styles.typeButton, isActive && styles.typeButtonActive]}
        onPress={() => setType(props.value)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={props.icon}
          size={17}
          color={isActive ? COLORS.white : COLORS.textMuted}
        />

        <Text
          style={[
            styles.typeButtonText,
            isActive && styles.typeButtonTextActive,
          ]}
        >
          {props.label}
        </Text>
      </TouchableOpacity>
    );
  }

  function NewsCard({ item }: { item: AdminNews }) {
    const color = getTypeColor(item.type);

    return (
      <View style={styles.newsCard}>
        <View style={styles.newsTopRow}>
          <View
            style={[
              styles.newsIcon,
              {
                backgroundColor: `${color}22`,
              },
            ]}
          >
            <Ionicons name={getTypeIcon(item.type)} size={22} color={color} />
          </View>

          <View style={styles.newsMainInfo}>
            <Text style={styles.newsTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.newsDate}>
              {formatDate(item.publishedAt || item.$createdAt)}
            </Text>
          </View>

          <View
            style={[
              styles.newsTypeBadge,
              {
                backgroundColor: `${color}22`,
                borderColor: `${color}55`,
              },
            ]}
          >
            <Text style={[styles.newsTypeText, { color }]}>
              {getTypeLabel(item.type)}
            </Text>
          </View>
        </View>

        <Text style={styles.newsMessage}>{item.message}</Text>

        <View style={styles.newsFooter}>
          <View style={styles.publishState}>
            <Ionicons
              name={
                item.isPublished ? "checkmark-circle-outline" : "time-outline"
              }
              size={17}
              color={item.isPublished ? "#10B981" : "#F59E0B"}
            />

            <Text
              style={[
                styles.publishStateText,
                {
                  color: item.isPublished ? "#10B981" : "#F59E0B",
                },
              ]}
            >
              {item.isPublished ? "Опубликовано" : "Черновик"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Новости</Text>

          <TouchableOpacity style={styles.backButton} onPress={loadNews}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.createCard}>
          <View style={styles.createHeader}>
            <View style={styles.createIcon}>
              <Ionicons
                name="megaphone-outline"
                size={26}
                color={COLORS.accent}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.createTitle}>Новая публикация</Text>
              <Text style={styles.createSubtitle}>
                Новость будет отправлена пользователям как уведомление
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Тип публикации</Text>

          <View style={styles.typeRow}>
            <TypeButton value="news" label="Новость" icon="megaphone-outline" />
            <TypeButton
              value="update"
              label="Обновление"
              icon="rocket-outline"
            />
            <TypeButton
              value="system"
              label="Система"
              icon="settings-outline"
            />
          </View>

          <Text style={styles.label}>Заголовок</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Добавлен импорт электронных чеков"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Текст новости</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Расскажите пользователям, что изменилось в приложении"
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.publishButton,
              isPublishing && styles.buttonDisabled,
            ]}
            onPress={handlePublishNews}
            disabled={isPublishing}
            activeOpacity={0.85}
          >
            {isPublishing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={19} color="#FFFFFF" />
                <Text style={styles.publishButtonText}>Опубликовать</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по новостям"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>Опубликованные новости</Text>
            <Text style={styles.summaryText}>
              Найдено: {filteredNews.length}
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Ionicons
              name="newspaper-outline"
              size={24}
              color={COLORS.accent}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Загрузка новостей...</Text>
          </View>
        ) : filteredNews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="newspaper-outline"
              size={38}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Новостей пока нет</Text>
            <Text style={styles.emptyText}>
              Создайте первую публикацию для пользователей
            </Text>
          </View>
        ) : (
          <View style={styles.newsList}>
            {filteredNews.map((item) => (
              <NewsCard key={item.$id} item={item} />
            ))}
          </View>
        )}
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
  createCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  createIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  createTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4,
  },
  createSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: COLORS.textSecond,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  typeRow: {
    gap: 10,
    marginBottom: 16,
  },
  typeButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: COLORS.cardSecond,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
  },
  typeButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "900",
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.cardSecond,
    color: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
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
  publishButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  publishButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  searchBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    marginLeft: 10,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  newsList: {
    gap: 14,
  },
  newsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  newsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  newsMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  newsTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  newsDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  newsTypeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  newsTypeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  newsMessage: {
    color: COLORS.textSecond,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  publishState: {
    flexDirection: "row",
    alignItems: "center",
  },
  publishStateText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
