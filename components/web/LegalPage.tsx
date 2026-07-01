// Shared layout for the static legal pages (Terms, Privacy). Renders a
// readable cream column on the lime canvas with a back link, title, and
// titled sections. Content is passed in so each page stays a thin data
// file. Links open via Linking (mailto / external site).
import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import WebShell from "./WebShell";
import { appHref } from "../../navigation/routes";
import { WEB, RADIUS, FONT, cardBorder } from "./theme";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  // Optional labelled sub-blocks (e.g. "For Drivers:" under a section).
  subblocks?: { label: string; body: string }[];
};

type Props = {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const LegalPage: React.FC<Props> = ({ title, intro, lastUpdated, sections }) => {
  const router = useRouter();
  return (
    <WebShell active="HomeScreen">
      <View style={styles.wrap}>
        <Pressable style={styles.backLink} onPress={() => router.push(appHref("HomeScreen"))}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5 L8 12 L15 19" stroke={WEB.forest} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.backLinkText}>Home</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>{lastUpdated}</Text>

        <View style={styles.card}>
            <Text style={styles.intro}>{intro}</Text>
            {sections.map((s) => (
              <View key={s.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{s.heading}</Text>
                {s.paragraphs?.map((p, i) => (
                  <Text key={i} style={styles.body}>{p}</Text>
                ))}
                {s.subblocks?.map((b) => (
                  <View key={b.label} style={styles.subblock}>
                    <Text style={styles.subLabel}>{b.label}</Text>
                    <Text style={styles.body}>{b.body}</Text>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.contactRow}>
              <Pressable onPress={() => Linking.openURL("mailto:outreach.acmvit@gmail.com")}>
                <Text style={styles.link}>outreach.acmvit@gmail.com</Text>
              </Pressable>
              <Text style={styles.dot}>{"·"}</Text>
              <Pressable onPress={() => Linking.openURL("https://acmvit.in")}>
                <Text style={styles.link}>acmvit.in</Text>
              </Pressable>
            </View>
          </View>
      </View>
    </WebShell>
  );
};

export default LegalPage;

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 780, alignSelf: "center", paddingTop: 24, paddingBottom: 64 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  backLinkText: { fontFamily: FONT.bold, fontSize: 14, color: WEB.inkStrong },
  title: { fontFamily: FONT.display, fontSize: 30, color: WEB.forest, letterSpacing: -0.7 },
  updated: { fontFamily: FONT.semibold, fontSize: 14, color: WEB.inkMuted, marginTop: 8, marginBottom: 22 },

  card: { backgroundColor: WEB.surface, borderRadius: RADIUS.card, padding: 32, ...cardBorder },
  intro: { fontFamily: FONT.semibold, fontSize: 16, lineHeight: 26, color: WEB.inkStrong, marginBottom: 8 },
  section: { marginTop: 26 },
  sectionHeading: { fontFamily: FONT.black, fontSize: 17.5, color: WEB.forest, marginBottom: 10, letterSpacing: -0.2 },
  body: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 24, color: WEB.inkStrong, marginBottom: 8 },
  subblock: { marginTop: 6, marginBottom: 6 },
  subLabel: { fontFamily: FONT.black, fontSize: 14.5, color: WEB.forest, marginBottom: 4 },

  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: WEB.inkSubtle },
  link: { fontFamily: FONT.bold, fontSize: 14.5, color: WEB.forest, textDecorationLine: "underline" },
  dot: { fontFamily: FONT.bold, fontSize: 14.5, color: WEB.inkMuted },
});
