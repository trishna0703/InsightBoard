import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Analytics Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  text: { fontSize: 18, color: Colors.textSecondary },
});