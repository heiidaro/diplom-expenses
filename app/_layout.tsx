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
        <Stack.Screen
          name="(modals)/receipt-scan"
          options={{
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="(modals)/recurring-expenses"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(modals)/category-rules"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(modals)/support"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(modals)/settings"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(modals)/spending-goals"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(modals)/notifications"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(modals)/electronic-receipt"
          options={{
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="(admin)/dashboard"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(admin)/users"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(admin)/support"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(admin)/news"
          options={{ headerShown: false }}
        />

        {/* <Stack.Screen
          name="(admin)/logs"
          options={{ headerShown: false }}
        /> */}

        <Stack.Screen
          name="(admin)/profile"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}