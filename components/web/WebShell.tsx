// Web-only app chrome. Provides the sticky top navigation that replaces
// the mobile floating tab bar, plus a responsive content area. Web
// screen variants (screens/*.web.tsx) render their content inside this
// so every page shares one header, brand, and max-width rhythm.
//
// The bar is forest (#263B33) — the same dark chrome the app paints on
// its floating nav pill — sitting over the lime canvas the rest of the
// app lives on, so the web reads as the same product rather than a
// separate white site.
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
import { WEB, RADIUS, FONT, WEB_CONTENT_MAX } from "./theme";

export const WEB_HEADER_HEIGHT = 60;
export const WEB_MAX_WIDTH = WEB_CONTENT_MAX;

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
  <Pressable onPress={onPress} style={styles.wordmarkWrap} accessibilityRole="link" accessibilityLabel="UniPool home">
    <View style={styles.wordmarkDot} />
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
          <Pressable onPress={() => go("CreateRide")} style={styles.postButton} accessibilityRole="button">
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
        {contained ? (
          <View style={[styles.contained, { maxWidth }]}>{children}</View>
        ) : (
          children
        )}
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
    minHeight: "100vh" as unknown as number,
    backgroundColor: WEB.page,
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", paddingBottom: 0 },
  contained: { width: "100%", paddingHorizontal: 24 },
  fullBleedContent: { flex: 1, minHeight: 0 },

  headerBar: {
    position: "sticky" as unknown as "absolute",
    top: 0,
    zIndex: 50,
    height: WEB_HEADER_HEIGHT,
    width: "100%",
    backgroundColor: WEB.forest,
    borderBottomWidth: 1,
    borderBottomColor: WEB.onForestLine,
    alignItems: "center",
  },
  headerInner: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 36 },
  wordmarkWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  wordmarkDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: WEB.lime,
    borderWidth: 3,
    borderColor: WEB.forest,
    // A faint cream ring so the lime wheel reads cleanly on forest.
    shadowColor: WEB.cream,
    shadowOpacity: 0.0,
  },
  wordmark: {
    fontFamily: FONT.display,
    fontSize: 22,
    color: WEB.cream,
    letterSpacing: -0.3,
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
});

export default WebShell;
