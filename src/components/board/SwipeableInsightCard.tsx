import React, { useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
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
import { BroadcastState } from "../../hooks/useBroadcast";
import CardOverlays from "./CardOverlays";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 0.5;

// Logarithmic resistance for blocked directions (sqrt curve feels natural)
function rubberBand(dx: number): number {
  return Math.sign(dx) * Math.sqrt(Math.abs(dx)) * 3;
}

interface SwipeableInsightCardProps {
  insight: Insight;
  filter: InsightsQueryFilter;
  onPress: (insight: Insight) => void;
  onLongPress: (insight: Insight) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  broadcastState?: BroadcastState;
  onEmitSignal?: (
    type: "swiping",
    insightId: string,
    action: "start" | "stop",
  ) => void;
  onEditAnyway?: (insight: Insight) => void;
  highlighted?: boolean;
}

export default function SwipeableInsightCard({
  insight,
  filter,
  onDragStart,
  onLongPress,
  onDragEnd,
  onEditAnyway,
  broadcastState,
  onEmitSignal,
  onPress,
  highlighted,
}: SwipeableInsightCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const panelOpacity = useRef(new Animated.Value(1)).current;
  const { moveInsight } = useMoveInsight();

  const viewers = broadcastState?.viewing[insight.id] ?? [];
  const editors = broadcastState?.editing[insight.id] ?? [];
  const isSwiping = broadcastState?.swiping.has(insight.id) ?? false;

  const handleCardPress = useCallback(() => {
    if (editors.length > 0) {
      Alert.alert(
        `${editors[0].userName} is editing…`,
        "What would you like to do?",
        [
          { text: "View Only", style: "cancel", onPress: () => onPress(insight) },
          {
            text: "Edit Anyway",
            style: "destructive",
            onPress: () => onEditAnyway?.(insight),
          },
        ],
      );
      return;
    }
    onPress(insight);
  }, [editors, insight, onPress, onEditAnyway]);

  const stateRef = useRef({
    insight,
    filter,
    moveInsight,
    onDragStart,
    onDragEnd,
    onEmitSignal,
  });
  stateRef.current = {
    insight,
    filter,
    moveInsight,
    onDragStart,
    onDragEnd,
    onEmitSignal,
  };

  const isDraggingRef = useRef(false);

  // FlashList recycles this component instance for different insights. If a card
  // flew off-screen (translateX/scale/panelOpacity left at their end-state) and
  // the instance is then reused for another insight — e.g. after a local swipe
  // or a peer's real-time move removes a row — the recycled card renders
  // off-screen inside a full-height cell, which shows up as an empty GAP in the
  // list. Reset the per-card animation state whenever the underlying insight
  // changes so a recycled cell always starts from a clean, on-screen position.
  useEffect(() => {
    translateX.setValue(0);
    cardScale.setValue(1);
    panelOpacity.setValue(1);
    isDraggingRef.current = false;
  }, [insight.id, translateX, cardScale, panelOpacity]);

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
    (direction: "left" | "right", onComplete: () => Promise<void> | void) => {
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
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        try {
          await onComplete();
        } catch {
          // Move was rejected (conflict or network error) — spring the card back.
          translateX.setValue(
            direction === "right" ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3,
          );
          snapBack();
        }
      });
    },
    [translateX, cardScale, panelOpacity, snapBack],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,

      onPanResponderTerminationRequest: () => !isDraggingRef.current,

      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        stateRef.current.onEmitSignal?.(
          "swiping",
          stateRef.current.insight.id,
          "start",
        );
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
        stateRef.current.onEmitSignal?.(
          "swiping",
          stateRef.current.insight.id,
          "stop",
        );

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
        stateRef.current.onEmitSignal?.(
          "swiping",
          stateRef.current.insight.id,
          "stop",
        );
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
      <CardOverlays
        insightId={insight.id}
        viewers={viewers}
        editors={editors}
        isSwiping={isSwiping}
        onEditAnywayPress={() => onEditAnyway?.(insight)}
      />

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
          onPress={handleCardPress}
          onLongPress={onLongPress}
          highlighted={highlighted}
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
