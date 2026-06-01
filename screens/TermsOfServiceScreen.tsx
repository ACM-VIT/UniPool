import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  StatusBar,
} from 'react-native';
import { useRouter } from "expo-router";
import BrandInfo from '../components/BrandInfo/BrandInfo';
import ChevronBack from '../components/ChevronBack/ChevronBack';
import AppColors from '../design_systems/colors';
import { useTabletContentStyle, useTabletScrollContentStyle } from "../utils/responsive";
import { useThemeColors } from "../contexts/ThemeContext";

const TermsOfServiceScreen: React.FC = () => {
  const { back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const colors = useThemeColors();

  const openExternalLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.statusBarBackground} />
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Terms of Service</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.contentContainer, tabletScrollContentStyle]}>
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>Last Updated: December 1, 2025</Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          By downloading, installing, or using UniPool ("the App"), you agree to be bound by these
          Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. Description of Service</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          UniPool is a carpooling platform developed by ACM-VIT that connects university students
          who want to share rides. The App facilitates ride matching, communication between users,
          and ride coordination. UniPool does not provide transportation services and is not a
          transportation carrier.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>3. Eligibility</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          To use UniPool, you must:{'\n'}
          • Be at least 16 years of age{'\n'}
          • Be a university student or affiliated with a university{'\n'}
          • Have a valid driver's license if offering rides{'\n'}
          • Provide accurate and complete registration information
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. User Responsibilities</Text>
        <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>For Drivers:</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          • Maintain a valid driver's license and vehicle insurance{'\n'}
          • Ensure your vehicle is safe and roadworthy{'\n'}
          • Follow all traffic laws and regulations{'\n'}
          • Arrive at pickup locations on time{'\n'}
          • Treat passengers with respect
        </Text>

        <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>For Riders:</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          • Be ready at the pickup location on time{'\n'}
          • Treat drivers and other passengers with respect{'\n'}
          • Wear seatbelts during the ride{'\n'}
          • Not engage in disruptive or illegal behavior
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>5. Prohibited Conduct</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Users are prohibited from:{'\n'}
          • Providing false or misleading information{'\n'}
          • Harassing, threatening, or intimidating other users{'\n'}
          • Using the App for illegal purposes{'\n'}
          • Soliciting commercial services outside the platform{'\n'}
          • Creating multiple accounts{'\n'}
          • Sharing account credentials
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>6. Safety Disclaimer</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          UniPool is a platform that connects users but does not guarantee the safety of any ride.
          Users participate in carpooling at their own risk. We encourage users to:{'\n'}
          • Verify the identity of drivers/riders{'\n'}
          • Share ride details with trusted contacts{'\n'}
          • Trust their instincts and cancel if uncomfortable
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>7. Limitation of Liability</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          To the maximum extent permitted by law, UniPool and ACM-VIT shall not be liable for:{'\n'}
          • Any direct, indirect, incidental, or consequential damages{'\n'}
          • Personal injury or property damage during rides{'\n'}
          • Actions or omissions of other users{'\n'}
          • Service interruptions or technical issues
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>8. Intellectual Property</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          All content, features, and functionality of the App are owned by ACM-VIT and are
          protected by intellectual property laws. You may not copy, modify, distribute, or
          create derivative works without our express permission.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>9. Account Termination</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We reserve the right to suspend or terminate your account at any time for violation
          of these Terms or for any other reason at our discretion. You may delete your account
          at any time through Account Settings.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>10. Modifications to Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We may modify these Terms at any time. Continued use of the App after changes
          constitutes acceptance of the modified Terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>11. Governing Law</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          These Terms shall be governed by the laws of India. Any disputes shall be resolved
          in the courts of Vellore, Tamil Nadu.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>12. Contact Information</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          For questions about these Terms, please contact us at:
        </Text>
        <TouchableOpacity onPress={() => openExternalLink('mailto:outreach.acmvit@gmail.com')}>
          <Text style={[styles.link, { color: colors.textPrimary }]}>outreach.acmvit@gmail.com</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.websiteLink}
          onPress={() => openExternalLink('https://acmvit.in')}
        >
          <Text style={[styles.link, { color: colors.textPrimary }]}>https://acmvit.in</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  brandInfoHeaderRow: {
    // No paddingTop — BrandInfo already pads the safe-area inset
    // internally. Stacking another 50pt here pushed the entire
    // screen content ~half a Dynamic Island down.
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.secondaryDarkGreen,
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.secondaryDarkGreen,
    marginTop: 20,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.secondaryDarkGreen,
    marginTop: 10,
    marginBottom: 5,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
  link: {
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  websiteLink: {
    marginTop: 5,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default TermsOfServiceScreen;
