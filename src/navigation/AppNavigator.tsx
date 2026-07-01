import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import BoardScreen from "../screens/BoardScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import { Colors } from "../constants/colors";
import { FiltersProvider } from "../context/FiltersContext";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <FiltersProvider>
        <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.primary[500],
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: { backgroundColor: Colors.white },
          headerStyle: { backgroundColor: Colors.primary[500] },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Tab.Screen
          name="Board"
          component={BoardScreen}
          options={{
            title: "InsightBoard",
            tabBarLabel: "Board",
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>📋</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            title: "Analytics",
            tabBarLabel: "Analytics",
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>📊</Text>
            ),
          }}
        />
        </Tab.Navigator>
      </FiltersProvider>
    </NavigationContainer>
  );
}