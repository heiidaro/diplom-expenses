import { Stack } from "expo-router";
import React from "react";
import { StatusBar } from "react-native";

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#0F1115",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(modals)/manual-expense"
          options={{
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  );
}