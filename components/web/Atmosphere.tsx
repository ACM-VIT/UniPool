// Forest brand-panel background: a deep forest gradient with a soft
// glow. This is the one expressive surface in the web UI (the auth
// brand panel); the working screens sit on flat cream. Pure SVG over
// react-native-web so it stays in the shared codebase.
import React, { useId } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from "react-native-svg";
import { ATMOS } from "./theme";

const Atmosphere: React.FC<{ style?: any }> = ({ style }) => {
  // Unique ids per instance: SVG url(#id) references are document-global.
  const uid = useId().replace(/:/g, "");
  const fillId = `atmos-${uid}`;
  const glowId = `glow-${uid}`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={fillId} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={ATMOS.forestTop} />
            <Stop offset="1" stopColor={ATMOS.forestDeep} />
          </LinearGradient>
          <RadialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={ATMOS.forestGlow} stopOpacity={0.5} />
            <Stop offset="1" stopColor={ATMOS.forestGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${fillId})`} />
        <Circle cx="22" cy="12" r="46" fill={`url(#${glowId})`} />
      </Svg>
    </View>
  );
};

export default Atmosphere;
