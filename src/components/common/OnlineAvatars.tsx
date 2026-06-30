import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import { OnlineUser } from "../../hooks/usePresence";
import { Colors } from "../../constants/colors";

// Generate a consistent color from a string
function colorFromString(str: string): string {
  const colors = [
    "#3F51B5",
    "#E91E63",
    "#009688",
    "#FF5722",
    "#607D8B",
    "#9C27B0",
    "#FF9800",
    "#4CAF50",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface OnlineAvatarsProps {
  users: OnlineUser[];
  currentUserId: string;
}

export default function OnlineAvatars({
  users,
  currentUserId,
}: OnlineAvatarsProps) {
  const [showAll, setShowAll] = React.useState(false);

  // Exclude current user from display
  const others = users.filter((u) => u.userId !== currentUserId);
  const visible = others.slice(0, 3);
  const overflow = others.length - 3;

  const renderAvatar = useCallback(
    (user: OnlineUser, size: number = 32) => (
      <View
        key={user.userId}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colorFromString(user.userId),
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
          {getInitials(user.name)}
        </Text>
      </View>
    ),
    [],
  );

  if (others.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowAll(true)}
        accessibilityLabel={`${others.length} users online, tap to see all`}
      >
        {visible.map((u) => renderAvatar(u))}
        {overflow > 0 && (
          <View style={styles.overflowBadge}>
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom sheet listing all online users */}
      <Modal
        visible={showAll}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAll(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setShowAll(false)}
          activeOpacity={1}
        >
          <SafeAreaView style={styles.sheet}>
            <Text style={styles.sheetTitle}>Online Now</Text>
            <FlatList
              data={others}
              keyExtractor={(u) => u.userId}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  {renderAvatar(item, 40)}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  <View style={styles.onlineDot} />
                </View>
              )}
            />
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: -8,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  initials: {
    color: Colors.white,
    fontWeight: "700",
  },
  overflowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  overflowText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.system.success,
  },
});
