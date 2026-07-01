import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

interface LazyViewProps {
  children: React.ReactNode;
  scrollY: number;
  screenHeight: number;
}

export default function LazyView({
  children,
  scrollY,
  screenHeight,
}: LazyViewProps) {
  const [visible, setVisible] = useState(false);
  const [layoutY, setLayoutY] = useState<number | null>(null);

  const checkVisibility = (y: number, scroll: number) => {
    if (!visible && y < scroll + screenHeight) {
      setVisible(true);
    }
  };

  // Re-check every time scrollY changes
  React.useEffect(() => {
    if (layoutY !== null) {
      checkVisibility(layoutY, scrollY);
    }
  }, [scrollY, layoutY]);

  return (
    <View
      onLayout={(e) => {
        const y = e.nativeEvent.layout.y;
        setLayoutY(y);
        checkVisibility(y, scrollY);
      }}
    >
      {visible ? children : <Placeholder />}
    </View>
  );
}

function Placeholder() {
  return (
    <View style={styles.placeholder}>
      <ActivityIndicator color={Colors.primary[500]} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 220,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
