import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from "react-native";
import { UserSignal } from "../../hooks/useBroadcast";
import { Colors } from "../../constants/colors";

interface CardOverlaysProps {
  insightId: string;
  viewers: UserSignal[];
  editors: UserSignal[];
  isSwiping: boolean;
  onEditAnywayPress: () => void;
}

export default function CardOverlays({
  insightId,
  viewers,
  editors,
  isSwiping,
  onEditAnywayPress,
}: CardOverlaysProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing border animation when someone is swiping
  useEffect(() => {
    if (!isSwiping) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isSwiping]);

  const handleEditorTap = (editor: UserSignal) => {
    Alert.alert(
      `${editor.userName} is editing…`,
      "What would you like to do?",
      [
        { text: "View Only", style: "cancel" },
        {
          text: "Edit Anyway",
          style: "destructive",
          onPress: onEditAnywayPress,
        },
      ],
    );
  };

  return (
    <>
      {/* Pulsing border when someone is swiping */}
      {isSwiping && (
        <Animated.View
          pointerEvents="none"
          style={[styles.swipeBorder, { opacity: pulseAnim }]}
        />
      )}

      {/* Lock icon when someone is editing */}
      {editors.length > 0 && (
        <TouchableOpacity
          style={styles.lockBadge}
          onPress={() => handleEditorTap(editors[0])}
          accessibilityLabel={`${editors[0].userName} is editing this insight`}
        >
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockText} numberOfLines={1}>
            {editors[0].userName} is editing…
          </Text>
        </TouchableOpacity>
      )}

      {/* Viewer avatar when someone is viewing */}
      {viewers.length > 0 && editors.length === 0 && (
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerIcon}>👁</Text>
          <Text style={styles.viewerText} numberOfLines={1}>
            {viewers[0].userName}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  swipeBorder: {
    position: "absolute",
    top: 6,
    left: 12,
    right: 12,
    bottom: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    zIndex: 10,
    pointerEvents: "none",
  } as object,
  lockBadge: {
    position: "absolute",
    bottom: 10,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.system.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    zIndex: 10,
  },
  lockIcon: { fontSize: 11 },
  lockText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: "700",
    maxWidth: 120,
  },
  viewerBadge: {
    position: "absolute",
    bottom: 10,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    zIndex: 10,
  },
  viewerIcon: { fontSize: 11 },
  viewerText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: "700",
    maxWidth: 100,
  },
});
