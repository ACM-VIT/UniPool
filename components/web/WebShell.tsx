// Web-only app chrome. Provides the sticky top navigation that replaces
// the mobile floating tab bar, the lime canvas the app lives on, and a
// forest footer that gently points visitors to the native app. Web
// screen variants (screens/*.web.tsx) render their content inside this
// so every page shares one header, brand, canvas, and footer.
//
// The bar + footer are forest (#263B33) — the same dark chrome the app
// paints on its floating nav pill — sitting over the lime canvas the
// rest of the app lives on, so the web reads as the same product.
//
// This file is only ever imported from *.web.tsx modules, so it never
// reaches the native bundle.
import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useUser } from "../../contexts/UserContext";
import { useAuthGate } from "../../contexts/AuthGate";
import { appHref } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardFloat, WEB_CONTENT_MAX } from "./theme";

export const WEB_HEADER_HEIGHT = 60;
export const WEB_MAX_WIDTH = WEB_CONTENT_MAX;

const APP_STORE_URL = "https://apps.apple.com/app/id6756426249";
const PLAY_STORE_URL = "https://unipool.download";

const openExternal = (url: string) => {
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
};

type NavLink = { label: string; route: string };

const NAV_LINKS: NavLink[] = [
  { label: "Find a ride", route: "HomeScreen" },
  { label: "Trips", route: "TripsListScreen" },
];

type WebShellProps = {
  children: React.ReactNode;
  /** Active nav route name, for highlighting the current tab. */
  active?: string;
  /** Fill the viewport exactly (header + flex content, no document
   *  scroll). Used by the map split-pane. Default false: the page
   *  grows and scrolls naturally. */
  fullBleed?: boolean;
  /** Constrain and pad the content column. Ignored when fullBleed. */
  contained?: boolean;
  maxWidth?: number;
};

const Wordmark: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel="UniPool home">
    <Text style={styles.wordmark}>UniPool</Text>
  </Pressable>
);

const Avatar: React.FC<{ name?: string; photo?: string | null; onPress: () => void }> = ({ name, photo, onPress }) => (
  <Pressable onPress={onPress} style={styles.avatar} accessibilityRole="link" accessibilityLabel="Your profile">
    {photo ? (
      <Image source={{ uri: photo }} style={styles.avatarImg} />
    ) : (
      <Text style={styles.avatarInitial}>{(name || "U").trim().charAt(0).toUpperCase()}</Text>
    )}
  </Pressable>
);

const StoreButton: React.FC<{ label: string; sub: string; url: string }> = ({ label, sub, url }) => (
  <Pressable
    onPress={() => openExternal(url)}
    style={({ hovered }: any) => [styles.storeBtn, hovered && styles.storeBtnHover]}
    accessibilityRole="link"
    accessibilityLabel={`${sub} ${label}`}
  >
    <Text style={styles.storeBtnSub}>{sub}</Text>
    <Text style={styles.storeBtnLabel}>{label}</Text>
  </Pressable>
);

const WebFooter: React.FC<{ maxWidth: number; onNav: (route: string) => void; compact: boolean }> = ({ maxWidth, onNav, compact }) => (
  <View style={styles.footer}>
    <View style={[styles.footerInner, { maxWidth }]}>
      <View style={[styles.footerCta, compact && styles.footerCtaStacked]}>
        <Image source={require("../../assets/unipool-hero.png")} style={styles.footerArt} resizeMode="contain" />
        <View style={styles.footerCtaText}>
          <Text style={styles.footerCtaTitle}>Ride with your campus.</Text>
          <View style={styles.storeRow}>
            <StoreButton sub="Download on the" label="App Store" url={APP_STORE_URL} />
            <StoreButton sub="Get it on" label="Google Play" url={PLAY_STORE_URL} />
          </View>
        </View>
      </View>

      <View style={styles.footerBottom}>
        <Text style={styles.footerWordmark}>UniPool</Text>
        <View style={styles.footerLinks}>
          <Pressable onPress={() => onNav("PrivacyPolicyScreen")}><Text style={styles.footerLink}>Privacy</Text></Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => onNav("TermsOfServiceScreen")}><Text style={styles.footerLink}>Terms</Text></Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => openExternal("https://acmvit.in")}><Text style={styles.footerLink}>ACM-VIT</Text></Pressable>
        </View>
        <Text style={styles.footerCopy}>Made with love by ACM-VIT.</Text>
      </View>
    </View>
  </View>
);

const WebShell: React.FC<WebShellProps> = ({
  children,
  active,
  fullBleed = false,
  contained = true,
  maxWidth = WEB_MAX_WIDTH,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { isGuest } = useAuthGate();
  const { width } = useWindowDimensions();
  const compact = width < 820;

  const go = (route: string) => router.push(appHref(route as any));
  const activeRoute = active ?? (pathname ? pathname.split("?")[0].replace("/", "") : "");

  const header = (
    <View style={styles.headerBar}>
      <View style={[styles.headerInner, { maxWidth }]}>
        <View style={styles.headerLeft}>
          <Wordmark onPress={() => go("HomeScreen")} />
          {!compact && (
            <View style={styles.navLinks}>
              {NAV_LINKS.map((link) => {
                const isActive = activeRoute === link.route;
                return (
                  <Pressable key={link.route} onPress={() => go(link.route)} style={styles.navLink}>
                    <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>{link.label}</Text>
                    {isActive && <View style={styles.navLinkUnderline} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <Pressable onPress={() => go("CreateRide")} style={({ hovered }: any) => [styles.postButton, hovered && styles.postButtonHover]} accessibilityRole="button">
            <Text style={styles.postButtonText}>Post a ride</Text>
          </Pressable>
          {isGuest || !user ? (
            <Pressable onPress={() => go("AuthScreen")} style={styles.signInButton} accessibilityRole="button">
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
          ) : (
            <Avatar name={user.name} photo={user.profile_picture_url} onPress={() => go("ProfileScreen")} />
          )}
        </View>
      </View>
    </View>
  );

  if (fullBleed) {
    return (
      <View style={styles.rootFixed}>
        {header}
        <View style={styles.fullBleedContent}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.rootScroll}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentArea}>
          {contained ? (
            <View style={[styles.contained, { maxWidth }]}>{children}</View>
          ) : (
            children
          )}
        </View>
        <WebFooter maxWidth={maxWidth} onNav={go} compact={compact} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootFixed: {
    // Exact viewport height so the flex content fills the screen below
    // the header without growing the document.
    height: "100vh" as unknown as number,
    backgroundColor: WEB.page,
    overflow: "hidden",
  },
  rootScroll: {
    // Must be a BOUNDED height (flex:1 of the 100vh app root), not
    // minHeight:100vh — otherwise the inner ScrollView grows to its
    // content height and never scrolls (and document scroll is off
    // because RNW sets body overflow:hidden). flex:1 → the ScrollView
    // gets a real viewport-bounded height and scrolls internally.
    flex: 1,
    backgroundColor: WEB.page,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "stretch" },
  contentArea: { flexGrow: 1, width: "100%", alignItems: "center" },
  contained: { width: "100%", paddingHorizontal: 24 },
  fullBleedContent: { flex: 1, minHeight: 0 },

  // The header is a floating forest pill on the lime canvas — the same
  // rounded forest chrome the mobile app paints on its floating nav bar.
  headerBar: {
    position: "sticky" as unknown as "absolute",
    top: 0,
    zIndex: 50,
    width: "100%",
    backgroundColor: WEB.page,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  headerInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    paddingLeft: 24,
    paddingRight: 14,
    backgroundColor: WEB.forest,
    borderRadius: 20,
    ...cardFloat,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 36 },
  wordmark: {
    fontFamily: FONT.black,
    fontSize: 22,
    color: WEB.cream,
    letterSpacing: -0.6,
  },
  navLinks: { flexDirection: "row", alignItems: "center", gap: 28 },
  navLink: { paddingVertical: 8, justifyContent: "center" },
  navLinkText: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: WEB.onForestMuted,
  },
  navLinkTextActive: { color: WEB.lime },
  navLinkUnderline: {
    position: "absolute",
    bottom: 2,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: WEB.lime,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  postButton: {
    backgroundColor: WEB.lime,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  postButtonHover: { backgroundColor: "#C2E15C" },
  postButtonText: {
    fontFamily: FONT.black,
    fontSize: 14.5,
    color: WEB.forest,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: WEB.onForestLine,
  },
  signInText: {
    fontFamily: FONT.bold,
    fontSize: 14.5,
    color: WEB.cream,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WEB.lime,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: WEB.lime,
  },
  avatarImg: { width: 40, height: 40 },
  avatarInitial: {
    fontFamily: FONT.black,
    fontSize: 17,
    color: WEB.forest,
  },

  // --- Footer (CTA + illustration) ---
  footer: { width: "100%", backgroundColor: WEB.forest, paddingVertical: 44, paddingHorizontal: 24, marginTop: 56, alignItems: "center" },
  footerInner: { width: "100%" },
  footerCta: { flexDirection: "row", alignItems: "center", gap: 28, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: WEB.onForestLine },
  footerCtaStacked: { flexDirection: "column", alignItems: "flex-start", gap: 18 },
  footerArt: { width: 240, height: 150 },
  footerCtaText: { flex: 1, gap: 16, minWidth: 240 },
  footerCtaTitle: { fontFamily: FONT.displayBlack, fontSize: 30, color: WEB.cream, letterSpacing: -0.6 },
  storeRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  footerBottom: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, paddingTop: 24 },
  footerWordmark: { fontFamily: FONT.black, fontSize: 20, color: WEB.lime, letterSpacing: -0.6 },
  footerLinks: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerLink: { fontFamily: FONT.bold, fontSize: 13.5, color: WEB.onForestMuted },
  footerDot: { color: WEB.onForestFaint, fontSize: 13 },
  footerCopy: { fontFamily: FONT.semibold, fontSize: 12.5, color: WEB.onForestFaint },
  storeBtn: {
    borderWidth: 1.5,
    borderColor: WEB.onForestLine,
    borderRadius: RADIUS.button,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  storeBtnHover: { borderColor: WEB.limeMuted, backgroundColor: WEB.onForestField },
  storeBtnSub: { fontFamily: FONT.semibold, fontSize: 10.5, color: WEB.onForestFaint },
  storeBtnLabel: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.cream, marginTop: 1 },
});

export default WebShell;
