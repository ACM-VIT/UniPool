import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ImageSourcePropType,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Ellipse, Defs, RadialGradient, Stop } from "react-native-svg";
const clockIcon = require("../assets/clock.png");
const walletIcon = require("../assets/wallet.png");
const sofaIcon = require("../assets/sofa.png");
// Same calendar glyph used on AvailableRideScreenSelected + RideDetails,
// so the visual vocabulary stays consistent across the booking flow.
const calendarIcon = require("../assets/calendar.png");
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import ShareRideSheet from "./ShareRideSheet";
import RouteStack from "./RouteStack";

/**
 * BlushTexture — full-bleed pink confetti pattern painted behind a
 * ride card's content. Used when the viewer + host both resolve to
 * female. Replaces the earlier "two blobs in opposite corners" attempt,
 * which read as floating clip-art rather than a textured surface.
 *
 * Layout strategy: a handful of large soft radial-gradient blobs lay
 * down a watercolor base, then ~30 small/medium opaque dots in a couple
 * of warm pink shades sit on top for the confetti grain. Positions are
 * hand-tuned (not randomised at render time) so the texture is stable
 * across re-renders and reads as composed, not noisy.
 *
 * Drawn in a 340×160 viewBox with preserveAspectRatio="none" so it
 * stretches to whatever the card's real dimensions are.
 */
const BlushTexture: React.FC = () => (
  <Svg
    width="100%"
    height="100%"
    viewBox="0 0 340 160"
    preserveAspectRatio="none"
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  >
    <Defs>
      {/* Soft watercolor blobs — radial gradient from saturated pink
          center to transparent edge. Gives the surface depth so the
          confetti dots on top don't read as floating on a flat plane. */}
      <RadialGradient id="blushBlob" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#F4A4BC" stopOpacity="0.55" />
        <Stop offset="1" stopColor="#F4A4BC" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="blushBlobWarm" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#F1B0A8" stopOpacity="0.40" />
        <Stop offset="1" stopColor="#F1B0A8" stopOpacity="0" />
      </RadialGradient>
    </Defs>

    {/* Watercolor base — three overlapping soft blobs scattered across
        the card. Different sizes / colors so they read as organic
        gradient bands rather than three identical balls. */}
    <Ellipse cx="60" cy="40" rx="90" ry="70" fill="url(#blushBlob)" />
    <Ellipse cx="270" cy="120" rx="110" ry="80" fill="url(#blushBlobWarm)" />
    <Ellipse cx="200" cy="30" rx="80" ry="55" fill="url(#blushBlob)" />
    <Ellipse cx="40" cy="140" rx="70" ry="50" fill="url(#blushBlobWarm)" />

    {/* Confetti dots — hand-placed scatter. Mix of sizes + opacities +
        two pink shades to break up the regularity. Numbers tuned by
        eye to feel "speckled paper" rather than "polka dot wrapping
        paper." */}
    {/* Row 1 — top band */}
    <Circle cx="22"  cy="14" r="2.5" fill="#E991AE" opacity="0.55" />
    <Circle cx="56"  cy="22" r="4"   fill="#F4B6C8" opacity="0.7"  />
    <Circle cx="92"  cy="10" r="2"   fill="#E991AE" opacity="0.5"  />
    <Circle cx="128" cy="18" r="3"   fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="170" cy="8"  r="2.5" fill="#E991AE" opacity="0.45" />
    <Circle cx="208" cy="22" r="4.5" fill="#F4B6C8" opacity="0.65" />
    <Circle cx="248" cy="14" r="2"   fill="#E991AE" opacity="0.5"  />
    <Circle cx="282" cy="20" r="3"   fill="#F4B6C8" opacity="0.55" />
    <Circle cx="318" cy="12" r="2.5" fill="#E991AE" opacity="0.5"  />

    {/* Row 2 — upper-middle */}
    <Circle cx="14"  cy="48" r="3"   fill="#F4B6C8" opacity="0.55" />
    <Circle cx="44"  cy="58" r="2"   fill="#E991AE" opacity="0.5"  />
    <Circle cx="80"  cy="50" r="4"   fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="116" cy="62" r="2.5" fill="#E991AE" opacity="0.55" />
    <Circle cx="152" cy="46" r="3.5" fill="#F4B6C8" opacity="0.65" />
    <Circle cx="190" cy="56" r="2"   fill="#E991AE" opacity="0.45" />
    <Circle cx="226" cy="50" r="4"   fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="262" cy="60" r="2.5" fill="#E991AE" opacity="0.5"  />
    <Circle cx="298" cy="48" r="3"   fill="#F4B6C8" opacity="0.55" />

    {/* Row 3 — lower-middle */}
    <Circle cx="28"  cy="92" r="2.5" fill="#E991AE" opacity="0.5"  />
    <Circle cx="64"  cy="100" r="3.5" fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="98"  cy="88"  r="2"   fill="#E991AE" opacity="0.45" />
    <Circle cx="136" cy="96"  r="4"   fill="#F4B6C8" opacity="0.65" />
    <Circle cx="172" cy="106" r="2.5" fill="#E991AE" opacity="0.5"  />
    <Circle cx="210" cy="94"  r="3"   fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="246" cy="102" r="2"   fill="#E991AE" opacity="0.45" />
    <Circle cx="282" cy="92"  r="3.5" fill="#F4B6C8" opacity="0.55" />
    <Circle cx="316" cy="100" r="2.5" fill="#E991AE" opacity="0.5"  />

    {/* Row 4 — bottom band */}
    <Circle cx="18"  cy="138" r="3"   fill="#F4B6C8" opacity="0.55" />
    <Circle cx="52"  cy="148" r="2"   fill="#E991AE" opacity="0.5"  />
    <Circle cx="86"  cy="140" r="4"   fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="122" cy="150" r="2.5" fill="#E991AE" opacity="0.55" />
    <Circle cx="158" cy="140" r="3"   fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="196" cy="148" r="2"   fill="#E991AE" opacity="0.5"  />
    <Circle cx="232" cy="142" r="3.5" fill="#F4B6C8" opacity="0.6"  />
    <Circle cx="268" cy="150" r="2.5" fill="#E991AE" opacity="0.55" />
    <Circle cx="306" cy="140" r="3"   fill="#F4B6C8" opacity="0.6"  />

    {/* A few tiny white "sparkle" specks scattered across — adds the
        last bit of grain so the texture feels like real paper rather
        than a uniform dot field. */}
    <Circle cx="38"  cy="32"  r="1" fill="#FFFFFF" opacity="0.7" />
    <Circle cx="148" cy="74"  r="1" fill="#FFFFFF" opacity="0.7" />
    <Circle cx="240" cy="32"  r="1" fill="#FFFFFF" opacity="0.7" />
    <Circle cx="76"  cy="118" r="1" fill="#FFFFFF" opacity="0.7" />
    <Circle cx="288" cy="128" r="1" fill="#FFFFFF" opacity="0.7" />
    <Circle cx="182" cy="124" r="1" fill="#FFFFFF" opacity="0.7" />
  </Svg>
);

const { width, height } = Dimensions.get("window");

const isSmallDevice = width < 350;
const isMediumDevice = width >= 350 && width < 400;
const isLargeDevice = width >= 400;

const wp = (percentage: number) => (width * percentage) / 100;
const hp = (percentage: number) => (height * percentage) / 100;

const getFontSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

const getIconSize = (small: number, medium: number, large: number) => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

interface RideCardProps {
  id: string;
  origin?: string;
  destination?: string;
  time?: string;
  price?: number;
  isSelected?: boolean;
  seatsAvailable?: string;
  totalSeats?: number;
  onSelect?: (id: string) => void;
  pricePerPerson?: boolean;
  variant?: "upcoming" | "inprogress";
  date?: string;
  status?: string;
  matchReason?: string;
  /**
   * Booking is awaiting the host's accept/reject. Card dims slightly
   * and surfaces a "Waiting for host approval" pill so the user knows
   * the trip is not yet confirmed without hiding it from the list.
   */
  isPending?: boolean;
  /**
   * Same-gender female affinity tint. When the searching passenger is
   * female AND the host is female, the card surface shifts from
   * cream/white to a soft warm blush + carries a subtle blush
   * decorative shape, signalling a same-gender match without putting
   * a heavy badge on it. Purely a visual cue — no functional gate.
   */
  isSameGenderFemale?: boolean;
  /**
   * Opt-in: when true AND `startTimeIso` is provided, long-pressing
   * the card opens the ShareRideSheet (same QR + native-share modal
   * the host's "Share" pill uses). Available to passengers too, not
   * just the host — anyone who has the ride card in front of them
   * can hand the link to a friend.
   */
  shareable?: boolean;
  /**
   * ISO start time used for share-message formatting. Separate from
   * the pre-formatted `time` + `date` props (which are display-only)
   * because the share message needs to render its own date/time
   * strings consistently across locales.
   */
  startTimeIso?: string;
}

// Format time to add colon between hours (e.g., '1700 hrs' -> '17:00 hrs')
const formatTime = (rawTime: string) => {
  // Match '1700 hrs', '0900 hrs', etc.
  const match = rawTime.match(/^(\d{2})(\d{2})\s*hrs$/);
  if (match) {
    return `${match[1]}:${match[2]} hrs`;
  }
  return rawTime;
};

const RideCard: React.FC<RideCardProps> = ({
  id = "01",
  origin = "VIT Vellore",
  destination = "Chennai Airport",
  time = "1700 hrs",
  price = 500,
  isSelected = false,
  seatsAvailable = "1/2",
  totalSeats,
  onSelect = () => {},
  pricePerPerson = false,
  variant = "upcoming",
  date = "",
  isPending = false,
  isSameGenderFemale = false,
  shareable = false,
  startTimeIso,
}) => {
  const colors = useThemeColors();
  const handleSelect = () => {
    onSelect(id);
  };

  // Long-press → share sheet. Only enabled when the caller opts in
  // (`shareable`) AND we have enough data to build a valid share
  // message (origin, destination, ISO start time, ride id). Falls
  // back to no-op so opt-out cards never trap a long-press.
  const [shareOpen, setShareOpen] = React.useState(false);
  const canShare = !!(shareable && startTimeIso && id && origin && destination);
  const handleLongPress = canShare ? () => setShareOpen(true) : undefined;

  const maxSeats = typeof totalSeats === "number" ? totalSeats : parseInt(seatsAvailable.split("/")[1]) || 0;
  const getVehicleIcon = (): ImageSourcePropType => {
    if (maxSeats < 3) return require("../assets/motorcycle.png");
    if (maxSeats === 3) return require("../assets/Taxi.png");
    if (maxSeats === 4) return require("../assets/racer.png");
    if (maxSeats < 8) return require("../assets/wagon.png");
    if (maxSeats < 11) return require("../assets/foodvan.png");
    if (maxSeats < 20) return require("../assets/Bus.png");
    return require("../assets/UFO.png");
  };

  // Background priority: selected (theme-defined highlight) >
  // same-gender female (blush) > pending (grey, via cardPending
  // below) > default (themed surface — cream in light, raised
  // charcoal in dark). `cardSelected` resolves to the historical
  // #1e4620 forest in light (unchanged from before the theme
  // refactor) and to the lime accent in dark (where the lime IS
  // the brand splash). `cardSelectedText` follows in lockstep.
  // In light mode the unselected card is white (#ffffff per the
  // historical unselectedCard style). `colors.surface` is cream
  // (#FFFDF4) which differs — use surface only in dark mode.
  const baseBackground = isSelected
    ? colors.cardSelected
    : isSameGenderFemale
    ? "#FCE4EC"
    : (colors.mode === "dark" ? colors.surface : "#ffffff");

  const contentColor = isSelected ? colors.cardSelectedText : colors.textPrimary;

  // Dark-mode selected cards get a hairline cream border for
  // definition — without it the raised-charcoal fill blends into the
  // near-black canvas and the card barely reads as elevated. Light
  // mode keeps the borderless forest tile as historically.
  const darkSelectedBorder = colors.mode === "dark" && isSelected
    ? { borderWidth: 1, borderColor: "rgba(237,236,231,0.08)" }
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: baseBackground },
        isSameGenderFemale && !isSelected && styles.cardSameGenderFemale,
        // Pending booking: dim the whole card so it visually
        // recedes vs. confirmed trips, but keep it tappable.
        isPending && styles.cardPending,
        darkSelectedBorder,
      ]}
      onPress={handleSelect}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      {/* Full-bleed blush confetti texture — only painted when the
          same-gender affinity tint is active and the card isn't
          selected. Sits behind all the card content (route, vehicle,
          etc.) via StyleSheet.absoluteFill on the inner SVG. Replaces
          the earlier two-corner-blob attempt which read as floating
          clip-art instead of a textured surface. */}
      {isSameGenderFemale && !isSelected ? <BlushTexture /> : null}
      <View style={styles.topContainer}>
        <View style={styles.routeContainer}>
          {/* Route block — outlined dot for origin, filled dot for
              destination, vertical dotted connector between. Same
              idiom as RideDetailsSelector and PreviousTripsCompressed
              so the visual language stays consistent. Replaces the
              old pin / dashed-line / arrow PNG combo that read as
              mismatched icons. */}
          {/* Canonical RouteStack — pin → vertical dashed connector →
              navigation arrow. The selected variant uses the lime
              accent against the forest card; unselected stays in
              forest on white. */}
          <RouteStack
            tone={isSelected ? "onForest" : "onLime"}
            start={origin}
            end={destination}
          />
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.timeContainer}>
            <Image
              source={clockIcon}
              style={[
                styles.timeIcon,
                {
                  tintColor: contentColor,
                  width: getIconSize(14, 16, 16),
                  height: getIconSize(14, 16, 16),
                },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.detailText,
                isSelected ? styles.selectedDetailText : styles.unselectedDetailText,
                { color: contentColor },
              ]}
            >
              {formatTime(time)}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Image
              source={walletIcon}
              style={[
                styles.priceIcon,
                {
                  tintColor: contentColor,
                  width: getIconSize(14, 16, 16),
                  height: getIconSize(14, 16, 16),
                },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.detailText,
                isSelected ? styles.selectedDetailText : styles.unselectedDetailText,
                { color: contentColor },
              ]}
            >
              {price} pp
            </Text>
          </View>
        </View>
      </View>
      {variant === "upcoming" ? (
        // Bottom row for upcoming rides — calendar glyph + date string.
        // Icon styled to match the clock + wallet icons in the top-right
        // (same tint logic, same size buckets) so the card reads as a
        // single iconographic system instead of mixing line and filled
        // glyphs. Empty wrapper if no date prop is passed so the layout
        // stays stable.
        <View style={styles.seatsContainer}>
          {date ? (
            <>
              <Image
                source={calendarIcon}
                style={[
                  styles.smallIcon,
                  {
                    tintColor: contentColor,
                    width: getIconSize(14, 16, 16),
                    height: getIconSize(14, 16, 16),
                  },
                ]}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.seatsText,
                  isSelected ? styles.selectedText : styles.unselectedText,
                  { color: contentColor },
                ]}
              >
                {date}
              </Text>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.seatsContainer}>
          <Image
            source={sofaIcon}
            style={[
              styles.smallIcon,
              {
                tintColor: contentColor,
                width: getIconSize(16, 18, 18),
                height: getIconSize(16, 18, 18),
              },
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.seatsText,
              isSelected ? styles.selectedText : styles.unselectedText,
              { color: contentColor },
            ]}
          >
            {seatsAvailable} seat{parseInt(seatsAvailable.split("/")[0]) !== 1 ? "s" : ""} available
          </Text>
        </View>
      )}
      <View style={styles.vehicleImageContainer}>
        <Image source={getVehicleIcon()} style={styles.vehicleImage} resizeMode="contain" />
      </View>

      {/* Share-on-long-press sheet — only rendered when the caller
          enabled `shareable` and provided enough data to build a
          valid share message. Modal portals itself above the rest of
          the UI, so it's safe to mount from inside the card. */}
      {canShare ? (
        <ShareRideSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          rideId={id}
          startLocation={origin || ""}
          endLocation={destination || ""}
          startTime={startTimeIso || ""}
        />
      ) : null}
    </TouchableOpacity>
  );
};

interface Styles {
  card: ViewStyle;
  cardPending: ViewStyle;
  cardSameGenderFemale: ViewStyle;
  pendingPill: ViewStyle;
  pendingDot: ViewStyle;
  pendingText: TextStyle;
  topContainer: ViewStyle;
  selectedCard: ViewStyle;
  unselectedCard: ViewStyle;
  routeContainer: ViewStyle;
  locationContainer: ViewStyle;
  dotOutline: ViewStyle;
  dotFilled: ViewStyle;
  routeConnector: ViewStyle;
  routeConnectorDash: ViewStyle;
  locationText: TextStyle;
  selectedText: TextStyle;
  unselectedText: TextStyle;
  seatsContainer: ViewStyle;
  smallIcon: ImageStyle;
  seatsText: TextStyle;
  detailsContainer: ViewStyle;
  timeContainer: ViewStyle;
  priceContainer: ViewStyle;
  timeIcon: ImageStyle;
  priceIcon: ImageStyle;
  detailText: TextStyle;
  selectedDetailText: TextStyle;
  unselectedDetailText: TextStyle;
  vehicleImageContainer: ViewStyle;
  vehicleImage: ImageStyle;
}

const styles = StyleSheet.create<Styles>({
  cardPending: {
    // Cool greyed-out state. No pill, no label, no dashed border —
    // just a calm shift in surface + opacity that reads as
    // "not-yet-active." Pure-grey background (instead of brand
    // lime or white) signals the pending state in the same way
    // iOS uses lighter weights for in-flight content.
    backgroundColor: "#EBECE5",
    opacity: 0.78,
    shadowOpacity: 0.04,
  },
  cardSameGenderFemale: {
    // Same-gender affinity (female passenger ↔ female host).
    // Hairline blush border so the card reads as gently tinted,
    // not as a different component. The texture inside is rendered
    // by the BlushTexture SVG above the card's content layer.
    borderWidth: 1,
    borderColor: "#E991AE",
  },
  pendingPill: {
    // Unused — retained as an empty style to avoid breaking the
    // Styles interface; can be deleted once we're sure no other
    // screen pulled it in.
    display: "none",
  },
  pendingDot: { display: "none" },
  pendingText: { display: "none" },
  card: {
    // Slightly shorter + more refined: ~19% of screen height instead
    // of 22%. Compact list of trips, less aggressive vertical real
    // estate per row.
    height: hp(19),
    width: "100%",
    borderRadius: wp(3),
    padding: wp(4),
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    // overflow: hidden is what makes the vehicle wheel-clip trick
    // work — the image extends past the card's bottom edge and the
    // padding-below-the-wheels gets clipped off here.
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: "2%",
  },
  topContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selectedCard: {
    backgroundColor: "#1e4620",
  },
  unselectedCard: {
    backgroundColor: "#ffffff",
  },
  routeContainer: {
    marginBottom: 0,
    flex: 1,
    marginRight: wp(2),
    minHeight: hp(12),
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: hp(5),
    paddingVertical: hp(0.5),
  },
  // Route dots + connector — same dimensions as the
  // PreviousTripsCompressed card so the route idiom is unified.
  dotOutline: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: wp(2.5),
  },
  dotFilled: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: wp(2.5),
  },
  routeConnector: {
    // Vertical column of three 3pt-tall dashes between the two route
    // dots — gives the dotted-line feel without an image asset.
    marginLeft: 4.5,
    marginVertical: 2,
    width: 2,
    alignItems: "center",
    justifyContent: "space-between",
    height: hp(2.2),
  },
  routeConnectorDash: {
    width: 2,
    height: 3,
    borderRadius: 1,
  },
  locationText: {
    fontSize: getFontSize(14, 16, 18),
    fontFamily: "NunitoSans_400Regular",
    flex: 1,
    lineHeight: getFontSize(18, 20, 22),
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  selectedText: {
    color: AppColors.basicWhite,
  },
  unselectedText: {
    color: AppColors.basicBlack,
  },
  seatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: hp(4),
    paddingVertical: hp(0.5),
  },
  smallIcon: {
    marginRight: wp(1.5),
  },
  seatsText: {
    fontSize: getFontSize(12, 14, 16),
    fontFamily: "NunitoSans_400Regular",
    lineHeight: getFontSize(16, 18, 20),
  },
  detailsContainer: {
    flexDirection: "column",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    gap: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeIcon: {
    marginRight: 4,
  },
  priceIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
  },
  selectedDetailText: {
    color: AppColors.basicWhite,
  },
  unselectedDetailText: {
    color: AppColors.basicBlack,
  },
  vehicleImageContainer: {
    // Self-clipping wrapper. Empirical PIL measurement of the vehicle
    // PNGs (255 × 271): opaque taxi pixels run y=75..195, leaving
    // ~28% transparent above and ~28% transparent below the wheels.
    // The wrapper ends at the card's bottom edge with overflow:hidden;
    // the image inside is taller than the wrapper AND positioned with
    // its bottom further below, so that bottom transparent strip
    // falls off the wrapper and is clipped. Wheels read as resting
    // on the card's bottom rail.
    position: "absolute",
    right: -wp(3),
    bottom: 0,
    width: "52%",
    height: hp(14),
    overflow: "hidden",
  },
  vehicleImage: {
    position: "absolute",
    right: 0,
    // Push the image's bottom edge ~28% of its rendered height below
    // the wrapper — same fraction as the transparent strip in the
    // PNG — so the wrapper's overflow:hidden clips the strip away
    // and the wheels land flush with the wrapper's (= card's) edge.
    bottom: -hp(4.5),
    width: "100%",
    height: hp(17),
  },
});

export default RideCard;
