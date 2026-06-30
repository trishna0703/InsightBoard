import React, { useEffect, useRef, useCallback } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Colors } from "../../constants/colors";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const DISMISS_DISTANCE_THRESHOLD = SHEET_HEIGHT * 0.25;
const DISMISS_VELOCITY_THRESHOLD = 0.8;

interface DetailSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fires after the close animation finishes and the Modal is unmounted.
   *  Safe to open another Modal inside this callback on both iOS and Android. */
  onClosed?: () => void;
  children: React.ReactNode;
  /**
   * Optional guard hook for user-initiated closes (drag or backdrop tap).
   * Receives a `proceed` function — call it to execute the dismiss animation.
   * If not provided, the sheet dismisses immediately.
   * NOTE: this is NOT called for programmatic closes (setting visible=false).
   */
  onCloseRequest?: (proceed: () => void) => void;
}

export default function DetailSheet({
  visible,
  onClose,
  onClosed,
  children,
  onCloseRequest,
}: DetailSheetProps) {
  // translateY: 0 = fully open (resting position), SHEET_HEIGHT = fully closed
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Mirrors `visible` but stays true during the close animation, so the
  // Modal doesn't unmount mid-animation and cut the slide-down short.
  const [isMounted, setIsMounted] = React.useState(visible);

  const animateOpen = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const animateClose = useCallback(
    (onComplete?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => onComplete?.());
    },
    [translateY, backdropOpacity],
  );

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      // Defer to next tick so the Modal is actually mounted at translateY=SHEET_HEIGHT
      // before we animate — otherwise the opening slide can be skipped on Android.
      requestAnimationFrame(animateOpen);
    } else if (isMounted) {
      animateClose(() => {
        setIsMounted(false);
        onClosed?.();
      });
    }
  }, [visible, isMounted, animateOpen, animateClose, onClosed]);

  // The actual close: animate the sheet down, then call onClose.
  const executeDismiss = useCallback(() => {
    animateClose(() => {
      setIsMounted(false);
      onClose();
      onClosed?.();
    });
  }, [animateClose, onClose, onClosed]);

  // User-initiated close (drag handle or backdrop). Routes through the
  // optional guard first; if no guard, goes straight to executeDismiss.
  const requestDismiss = useCallback(() => {
    if (onCloseRequest) {
      onCloseRequest(executeDismiss);
    } else {
      executeDismiss();
    }
  }, [onCloseRequest, executeDismiss]);

  // Keep the guard ref current inside the stale PanResponder closure
  const requestDismissRef = useRef(requestDismiss);
  useEffect(() => {
    requestDismissRef.current = requestDismiss;
  }, [requestDismiss]);

  const snapBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, [translateY]);

  // snapBack ref for stale closure
  const snapBackRef = useRef(snapBack);
  useEffect(() => {
    snapBackRef.current = snapBack;
  }, [snapBack]);

  // PanResponder is attached ONLY to the drag handle (see handle View below),
  // never to the content body — that lets the body be a plain
  // ScrollView with no gesture conflict to solve.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // Only allow dragging downward (closing); resist upward drag slightly
        if (g.dy > 0) {
          translateY.setValue(g.dy);
        } else {
          translateY.setValue(g.dy * 0.2);
        }
      },
      onPanResponderRelease: (_, g) => {
        const shouldDismiss =
          g.dy > DISMISS_DISTANCE_THRESHOLD ||
          g.vy > DISMISS_VELOCITY_THRESHOLD;

        if (shouldDismiss) {
          // Snap back to fully-open before the guard runs — the guard may
          // show an Alert while the sheet is visible, and only execute the
          // dismiss if the user confirms.
          snapBackRef.current();
          requestDismissRef.current();
        } else {
          snapBackRef.current();
        }
      },
    }),
  ).current;

  if (!isMounted) return null;

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={requestDismiss} // Android hardware back button
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={requestDismiss}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            { height: SHEET_HEIGHT, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black,
    opacity: 0.5,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  handleArea: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral[500],
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
});
