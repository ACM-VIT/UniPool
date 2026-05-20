import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from "expo-router";
import BrandInfo from '../components/BrandInfo';
import ChevronBack from '../components/ChevronBack';
import AppColors from '../design_systems/colors';

const PrivacyPolicyScreen: React.FC = () => {
  const router = useRouter();

  const openExternalLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AppColors.primaryLightGreen} />
      <View style={styles.brandInfoHeaderRow}>
        <BrandInfo />
      </View>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last Updated: December 1, 2025</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to UniPool ("we," "our," or "us"). UniPool is a carpooling application developed 
          by ACM-VIT that helps university students share rides safely and efficiently. This Privacy 
          Policy explains how we collect, use, disclose, and safeguard your information when you use 
          our mobile application.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subSectionTitle}>Personal Information</Text>
        <Text style={styles.paragraph}>
          When you register for an account, we collect:{'\n'}
          • Name (from your Google or Apple account){'\n'}
          • Email address{'\n'}
          • Phone number{'\n'}
          • Year of birth{'\n'}
          • Gender{'\n'}
          • Profile picture (if provided)
        </Text>

        <Text style={styles.subSectionTitle}>Location Data</Text>
        <Text style={styles.paragraph}>
          We collect location data to:{'\n'}
          • Show available rides near you{'\n'}
          • Display your pickup and drop-off locations{'\n'}
          • Calculate ride routes and distances{'\n'}
          • Improve our services
        </Text>

        <Text style={styles.subSectionTitle}>Usage Data</Text>
        <Text style={styles.paragraph}>
          We automatically collect information about how you interact with our app, including:{'\n'}
          • Rides created and booked{'\n'}
          • App usage patterns{'\n'}
          • Device information
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the collected information to:{'\n'}
          • Provide and maintain our carpooling service{'\n'}
          • Match riders with drivers{'\n'}
          • Facilitate communication between users{'\n'}
          • Send push notifications about ride updates{'\n'}
          • Improve and personalize user experience{'\n'}
          • Ensure safety and prevent fraud{'\n'}
          • Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>4. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We share your information only in the following circumstances:{'\n'}
          • With other users: Your name and contact information are shared with riders/drivers 
          you are matched with{'\n'}
          • Service providers: We use Firebase for authentication and data storage{'\n'}
          • Legal requirements: When required by law or to protect rights and safety{'\n'}
          {'\n'}
          We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect your personal 
          information. However, no method of transmission over the Internet is 100% secure, and we 
          cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:{'\n'}
          • Access your personal data{'\n'}
          • Correct inaccurate data{'\n'}
          • Delete your account and associated data{'\n'}
          • Opt-out of marketing communications{'\n'}
          {'\n'}
          To exercise these rights, go to Account Settings or contact us.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as your account is active or as needed 
          to provide services. You can delete your account at any time through Account Settings.
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          UniPool is intended for university students and is not directed at children under 16. 
          We do not knowingly collect information from children under 16.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes 
          by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at:
        </Text>
        <TouchableOpacity onPress={() => openExternalLink('mailto:outreach.acmvit@gmail.com')}>
          <Text style={styles.link}>outreach.acmvit@gmail.com</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.websiteLink}
          onPress={() => openExternalLink('https://acmvit.in')}
        >
          <Text style={styles.link}>https://acmvit.in</Text>
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

export default PrivacyPolicyScreen;
