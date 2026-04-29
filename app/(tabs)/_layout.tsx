import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../lib/theme";

function AddButton() {
  return (
    <TouchableOpacity
      style={styles.addButton}
      activeOpacity={0.85}
      onPress={() => router.push("/manual-expense")}
    >
      <Ionicons name="add" size={36} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="home"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: "Категории",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: () => (
            <View style={styles.addButtonWrapper}>
              <AddButton />
            </View>
          ),
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/manual-expense");
          },
        }}
      />

      <Tabs.Screen
        name="statistics"
        options={{
          title: "Статистика",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    height: 76,
    backgroundColor: COLORS.card,
    borderTopWidth: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 12,
  },
  tabBarItem: {
    height: 58,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  addButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    top: -24,
  },
  addButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: COLORS.background,
  },
});