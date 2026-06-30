import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { Insight } from "../../types";
import { Colors } from "../../constants/colors";
import InsightCard from "./InsightCard";
import {
  useMoveInsight,
  getNextStage,
  getPrevStage,
} from "../../hooks/useMoveInsight";
import { InsightsQueryFilter } from "../../hooks/useInsights";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 0.5;

// Logarithmic resistance for blocked directions (sqrt curve feels natural)
function rubberBand(dx: number): number {
  return Math.sign(dx) * Math.sqrt(Math.abs(dx)) * 3;
}

interface SwipeableInsightCardProps {
  insight: Insight;
  // The exact filter the parent list's LIST_INSIGHTS query is using for
  // this stage — required so moveInsight reads/writes the correct cache
  // entry. Comes from useInsights' `filter` return value.
  filter: InsightsQueryFilter;
  onPress: (insight: Insight) => void;
  onLongPress: (insight: Insight) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function SwipeableInsightCard({
  insight,
  filter,
  onPress,
  onLongPress,
  onDragStart,
  onDragEnd,
}: SwipeableInsightCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const panelOpacity = useRef(new Animated.Value(1)).current;
  const { moveInsight } = useMoveInsight();

  // Mutable ref so the pan responder (created once) always reads fresh values
  const stateRef = useRef({
    insight,
    filter,
    moveInsight,
    onDragStart,
    onDragEnd,
  });
  stateRef.current = { insight, filter, moveInsight, onDragStart, onDragEnd };

  // True once we've actually been granted the gesture — used to refuse
  // termination requests from the list while a drag is in progress.
  const isDraggingRef = useRef(false);

  const snapBack = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 22,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 0,
        speed: 22,
      }),
      Animated.spring(panelOpacity, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 0,
        speed: 22,
      }),
    ]).start();
  }, [translateX, cardScale, panelOpacity]);

  const flyOff = useCallback(
    (direction: "left" | "right", onComplete: () => void) => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue:
            direction === "right" ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.88,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: 180, // ducks out slightly before the fly-off finishes
          useNativeDriver: true,
        }),
      ]).start(() => onComplete());
    },
    [translateX, cardScale, panelOpacity],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,

      onPanResponderTerminationRequest: () => !isDraggingRef.current,

      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        stateRef.current.onDragStart?.();
        translateX.stopAnimation();
        cardScale.stopAnimation();
        Animated.spring(cardScale, {
          toValue: 0.97,
          useNativeDriver: true,
          bounciness: 0,
          speed: 40,
        }).start();
      },
      onPanResponderMove: (_, g) => {
        const { insight } = stateRef.current;
        const nextStage = getNextStage(insight.stage);
        const prevStage = getPrevStage(insight.stage);

        if (g.dx > 0 && !nextStage) {
          translateX.setValue(rubberBand(g.dx));
        } else if (g.dx < 0 && !prevStage) {
          translateX.setValue(rubberBand(g.dx));
        } else {
          translateX.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        isDraggingRef.current = false;
        stateRef.current.onDragEnd?.();

        const { insight, filter, moveInsight } = stateRef.current;
        const nextStage = getNextStage(insight.stage);
        const prevStage = getPrevStage(insight.stage);

        const swipeRight =
          nextStage &&
          (g.dx > SWIPE_THRESHOLD || (g.dx > 20 && g.vx > VELOCITY_THRESHOLD));
        const swipeLeft =
          prevStage &&
          (g.dx < -SWIPE_THRESHOLD ||
            (g.dx < -20 && g.vx < -VELOCITY_THRESHOLD));

        if (swipeRight) {
          flyOff("right", () => moveInsight(insight, nextStage, filter));
        } else if (swipeLeft) {
          flyOff("left", () => moveInsight(insight, prevStage, filter));
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        stateRef.current.onDragEnd?.();
        snapBack();
      },
    }),
  ).current;

  const nextStage = getNextStage(insight.stage);
  const prevStage = getPrevStage(insight.stage);

  const rightOpacity = translateX.interpolate({
    inputRange: [0, 40, SWIPE_THRESHOLD],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });
  const rightScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.82, 1],
    extrapolate: "clamp",
  });

  const leftOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -40, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });
  const leftScale = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.82],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {nextStage && (
        <Animated.View
          style={[
            styles.rightPanel,
            {
              opacity: Animated.multiply(rightOpacity, panelOpacity),
              transform: [{ scale: rightScale }],
            },
          ]}
        >
          <Text style={styles.panelArrow}>→</Text>
          <Text style={styles.panelLabel}>{nextStage}</Text>
        </Animated.View>
      )}

      {prevStage && (
        <Animated.View
          style={[
            styles.leftPanel,
            {
              opacity: Animated.multiply(leftOpacity, panelOpacity),
              transform: [{ scale: leftScale }],
            },
          ]}
        >
          <Text style={styles.panelArrow}>←</Text>
          <Text style={styles.panelLabel}>{prevStage}</Text>
        </Animated.View>
      )}

      <Animated.View
        style={{ transform: [{ translateX }, { scale: cardScale }] }}
        {...panResponder.panHandlers}
      >
        <InsightCard
          insight={insight}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  rightPanel: {
    position: "absolute",
    left: 12,
    top: 6,
    bottom: 6,
    width: 120,
    backgroundColor: Colors.system.success,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  leftPanel: {
    position: "absolute",
    right: 12,
    top: 6,
    bottom: 6,
    width: 120,
    backgroundColor: Colors.system.warning,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  panelArrow: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 18,
  },
  panelLabel: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2,
  },
});
