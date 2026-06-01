// Wraps any card/tile to lift it a few px on hover, giving the web
// surfaces tactile feedback. Animated transform only, so it composes
// over whatever shadow/border the child already carries.
import React, { useRef } from "react";
import { Animated, Easing, Pressable } from "react-native";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  distance?: number;
  style?: any;
};

const HoverLift: React.FC<Props> = ({ children, onPress, distance = 4, style }) => {
  const t = useRef(new Animated.Value(0)).current;
  const animate = (to: number) =>
    Animated.timing(t, { toValue: to, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[style, { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => animate(1)}
        onHoverOut={() => animate(0)}
        style={{ flex: 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default HoverLift;
