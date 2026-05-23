import { useWindowDimensions } from "react-native";

/**
 * Width above which we treat the device as a tablet. 768pt covers
 * every iPad in portrait (smallest is the regular iPad at 768pt
 * portrait width) and also catches Android tablets and the Surface
 * Duo. Below this threshold we render the phone layout exactly as
 * designed.
 */
export const TABLET_BREAKPOINT = 768;

/**
 * Inner content width on tablets. 540pt is wider than every iPhone
 * (largest is the 16 Pro Max at 440pt portrait) so the mobile UI
 * has a bit of breathing room without spreading into airline-card
 * territory the way an unconstrained 1024+ pt canvas does. Picked
 * empirically by matching how Notion / Lyft / Cash App center their
 * phone UI on iPad before a real tablet redesign ships.
 */
export const TABLET_CONTENT_MAX_WIDTH = 540;

/**
 * Maximum vertical extent of the phone-shape column on a tablet.
 * Without this cap, screens with `flex: 1` hero blocks (the location
 * permission radar, the auth sheet illustration, etc.) expand into
 * ~1300pt of empty canvas on a 13" iPad and push their CTAs to the
 * very bottom of the screen. Capping at 900pt gives us roughly the
 * same vertical envelope as the tallest iPhone (956pt on a 16 Pro
 * Max) so internal `flex: 1` math behaves the way it does on phone.
 */
export const TABLET_CONTENT_MAX_HEIGHT = 900;

/**
 * Live hook for responsive layout. Returns the current window
 * dimensions plus a derived `isTablet` flag so screens can branch on
 * orientation changes without reading `Dimensions.get('window')`
 * once at module load (which freezes the value).
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= TABLET_BREAKPOINT,
    contentMaxWidth: TABLET_CONTENT_MAX_WIDTH,
    contentMaxHeight: TABLET_CONTENT_MAX_HEIGHT,
  };
};

/**
 * Hook that returns a style object to drop onto a screen's root
 * container so the content sits in a phone-shape column centered
 * within the iPad canvas. Phone-side it returns an empty object so
 * existing mobile layouts are untouched. Pattern:
 *
 *   const tabletStyle = useTabletContentStyle();
 *   <View style={[styles.container, tabletStyle]}>...</View>
 *
 * Works on regular `<View>` containers because `alignSelf: 'center'`
 * with `maxWidth` is honoured by the parent flex layout. For
 * `ScrollView.contentContainerStyle`, RN's internal layout doesn't
 * honour `alignSelf` reliably — use `useTabletScrollContentStyle`
 * below instead, which adds horizontal padding to centre the
 * content track.
 *
 * Use on every full-bleed screen that doesn't have its own custom
 * iPad layout (HomeScreen is the exception — it uses a side panel
 * over a full-bleed map). The cap is the same 540pt phone envelope
 * the modal sheets use so the entire app reads as one consistent
 * tablet design.
 */
export const useTabletContentStyle = () => {
  const { width } = useWindowDimensions();
  if (width < TABLET_BREAKPOINT) return null;
  return {
    width: "100%" as const,
    maxWidth: TABLET_CONTENT_MAX_WIDTH,
    alignSelf: "center" as const,
  };
};

/**
 * Variant for `ScrollView.contentContainerStyle` (and any other
 * container where `alignSelf: 'center'` doesn't centre the content).
 * Returns a horizontal padding pair that adds (window - 540) / 2 to
 * each edge on iPad, so the content track ends up 540pt wide
 * centred in the canvas without relying on flex alignment. On phones
 * it returns null so existing per-screen `paddingHorizontal` styles
 * are unchanged.
 *
 *   const tabletPad = useTabletScrollContentStyle();
 *   <ScrollView contentContainerStyle={[styles.x, tabletPad]} />
 *
 * Note this stacks on top of the screen's own `paddingHorizontal` —
 * the inner content track narrows by the screen's existing padding
 * on top of the centring padding. That's almost always fine
 * because the screen's padding is typically 16–28pt.
 */
export const useTabletScrollContentStyle = () => {
  const { width } = useWindowDimensions();
  if (width < TABLET_BREAKPOINT) return null;
  const sidePadding = Math.max(0, (width - TABLET_CONTENT_MAX_WIDTH) / 2);
  // Set `paddingHorizontal` as well as the explicit left/right because
  // RN's style flattening keeps shorthand and longhand properties
  // side-by-side rather than expanding the shorthand. If the screen's
  // own style sets `paddingHorizontal: 20`, we want our value to win
  // — so we redeclare the same shorthand here, then add slightly more
  // via the longhand pair so the screen's content padding still
  // shows on top of the centring track.
  return {
    paddingHorizontal: sidePadding,
  };
};
