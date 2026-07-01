import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { Colors } from "../../constants/colors";

/**
 * Offline detection banner (NFR: "Offline detection with banner: You're offline,
 * changes will sync when reconnected."). Subscribes to NetInfo connectivity and
 * renders a top banner while disconnected. Apollo/Supabase writes queue and
 * replay on reconnect, so no data is lost.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected === false is the reliable "no network" signal; treat an
      // explicit unreachable-internet result as offline too.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + 8 }]}
      accessibilityRole="alert"
      accessibilityLabel="You're offline. Changes will sync when reconnected."
    >
      <Text style={styles.text}>
        You're offline, changes will sync when reconnected.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: Colors.system.error,
    paddingBottom: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
