// Layout pass-through. Earlier this staggered content in with a fade;
// on a utility product that reads as marketing slop, so it now just
// renders its children (keeping the API/`style` so call sites are
// unchanged). Kept as a single seam in case a subtle, tasteful entrance
// is wanted later.
import React from "react";
import { View } from "react-native";

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  duration?: number;
  style?: any;
};

const Reveal: React.FC<RevealProps> = ({ children, style }) =>
  style ? <View style={style}>{children}</View> : <>{children}</>;

export default Reveal;
