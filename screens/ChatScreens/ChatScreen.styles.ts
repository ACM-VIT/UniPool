import { Platform, StyleSheet } from 'react-native';
import AppColors from '../../design_systems/colors';

export const chatScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    // Lime brand canvas — on-brand. Bubbles use forest + white so
    // they pop clearly against the lime without the canvas going off
    // brand.
    backgroundColor: AppColors.primaryLightGreen,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instituteName: {
    fontSize: 12,
    color: AppColors.basicBlack,
    marginLeft: 4,
    fontFamily: 'NunitoSans-Regular',
  },
  instituteNumber: {
    fontSize: 10,
    color: AppColors.basicBlack,
    marginLeft: 4,
    marginTop: 1,
    fontFamily: 'NunitoSans-Regular',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'normal',
    color: AppColors.basicBlack,
    fontFamily: 'Trap-Bold',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  chatSubtitleNumber: {
    fontSize: 14,
    color: AppColors.basicBlack,
    marginLeft: 8,
    marginTop: 2,
    fontFamily: 'NunitoSans-Regular',
  },
  chatSubtitle: {
    fontSize: 12,
    color: AppColors.basicBlack,
    opacity: 0.7,
    marginLeft: 8,
    marginTop: 2,
    fontFamily: 'NunitoSans-Regular',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 12,
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 25,
  },
  navItem: {
    padding: 8,
  },
});

export const passengerInfoStyles = StyleSheet.create({
  ...chatScreenStyles,
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 0,
    gap: 12,
  },
  toggleButtonActive: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
  },
  toggleButtonInactive: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
  },
  toggleTextActive: {
    color: AppColors.primaryLightGreen,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Regular',
  },
  toggleTextInactive: {
    color: AppColors.secondaryDarkGreen,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Regular',
  },
  destinationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  destinationItem: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 12,
  },
  destinationText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Regular',
  },
});

export const tripInfoStyles = StyleSheet.create({
  ...chatScreenStyles,
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 0,
    gap: 12,
  },
  toggleButtonActive: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
  },
  toggleButtonInactive: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
  },
  toggleTextActive: {
    color: AppColors.primaryLightGreen,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Regular',
  },
  toggleTextInactive: {
    color: AppColors.secondaryDarkGreen,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Regular',
  },
  tripsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tripItem: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    marginTop: 5,
  },
  tripContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    color: AppColors.basicWhite,
    fontSize: 18,
    marginBottom: 4,
    fontFamily: 'NunitoSans-Regular',
  },
  tripDate: {
    color: AppColors.primaryLightGreen,
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
  },
  tripDetails: {
    alignItems: 'flex-end',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  tripPrice: {
    color: AppColors.basicWhite,
    fontSize: 12,
    marginLeft: 4,
    fontFamily: 'NunitoSans-Regular',
  },
  tripParticipants: {
    color: AppColors.basicWhite,
    fontSize: 10,
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
  },
});

export const chatMessagesStyles = StyleSheet.create({
  ...chatScreenStyles,
  chatHeader: {
    ...chatScreenStyles.chatHeader,
    paddingVertical: 12,
  },
  // ---------------------------------------------------------------
  // Conversation header. Forest "rail" pill from the status-bar
  // inset to a comfortable height, with avatar + name + subtitle on
  // the left and a settings icon on the right. Sits on the lime
  // canvas as a bold brand-anchored chrome bar.
  // ---------------------------------------------------------------
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  chatHeaderBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(181,215,80,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderAvatarText: {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 17,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
  },
  chatHeaderTitle: {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 17,
    color: AppColors.primaryLightGreen,
    letterSpacing: -0.3,
  },
  chatHeaderSubtitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  chatHeaderSettings: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(181,215,80,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTitle: {
    fontSize: 22,
    color: AppColors.basicBlack,
    fontFamily: 'NunitoSans-Regular',
  },
  chatSubtitle: {
    fontSize: 12,
    color: AppColors.basicBlack,
    opacity: 0.7,
    marginTop: 2,
    fontFamily: 'NunitoSans-Regular',
  },
  carIcon: {
    // Forest circle on the lime canvas — matches the rest of the chat
    // surface system. Tucked-in icon, not a hard white blob.
    backgroundColor: AppColors.secondaryDarkGreen,
    padding: 8,
    borderRadius: 20,
  },
  senderName: {
    // Sender name above other-person bubbles in a group chat. Lime
    // text on the forest received bubble — same pattern as Slack's
    // colored sender names on dark.
    color: AppColors.primaryLightGreen,
    fontSize: 11.5,
    marginBottom: 3,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: 0.2,
    opacity: 0.95,
  },
  infoMessage: {
    // System notices on the chat — sit on the lime canvas as a darker
    // tinted pill so they read as system, not as a sent message.
    backgroundColor: "rgba(38,59,51,0.10)",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 15,
  },
  infoText: {
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
    textAlign: 'center',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageReceived: {
    // Other-person bubble: forest dark on the lime canvas. Big shape,
    // tail-less rounded rect with asymmetric bottom-left corner.
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    marginVertical: 3,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  messageSent: {
    // Self bubble: a deeper olive lime (`midOliveGreen`). Still in
    // the brand family but darker than the canvas, so the edge of
    // the bubble is unambiguous without injecting a white surface.
    backgroundColor: AppColors.midOliveGreen,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    marginVertical: 3,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    shadowColor: AppColors.secondaryDarkGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 2,
  },
  messageText: {
    color: AppColors.basicWhite,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'NunitoSans_600SemiBold',
    letterSpacing: -0.05,
  },
  messageTextSent: {
    // White on the olive bubble — the olive is dark enough that
    // white reads cleanly without going off-brand.
    color: AppColors.basicWhite,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.05,
  },
  messageTime: {
    // Inside forest received bubble — lime, faded so it reads as
    // metadata rather than text.
    color: AppColors.primaryLightGreen,
    fontSize: 10.5,
    marginTop: 3,
    alignSelf: 'flex-end',
    opacity: 0.7,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  messageTimeSent: {
    // Inside olive self bubble — soft white.
    color: AppColors.basicWhite,
    fontSize: 10.5,
    marginTop: 3,
    alignSelf: 'flex-end',
    opacity: 0.78,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    // Forest input on the lime canvas — same as SignUpScreen inputs.
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.basicWhite,
    fontFamily: "NunitoSans_600SemiBold",
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    padding: 12,
  },
  typingBarContainer: {
    // Composer pill. Forest fill on the lime canvas — matches the
    // chat header and the rest of the brand inputs. Sits with
    // generous side margins so it doesn't graze the screen edges.
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 5,
    marginHorizontal: 18,
    marginBottom: Platform.OS === 'ios' ? 22 : 14,
    marginTop: 8,
    borderRadius: 26,
    backgroundColor: AppColors.secondaryDarkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  typingBarText: {
    // Lime text on the forest composer pill — same colour pattern as
    // the SignUp / RideDetails inputs.
    color: AppColors.basicWhite,
    fontSize: 15,
    flex: 1,
    paddingVertical: 8,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  typingBarIconContainer: {
    // Lime send button on the forest pill — inverse of the rest of
    // the system (lime fill on forest surface).
    width: 38,
    height: 38,
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  
  // Settings Button
  settingsButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // ---------------------------------------------------------------
  // Settings Modal — slide-up sheet from the chat header. Lime canvas
  // matches the rest of the app; forest section blocks group related
  // settings rows; tinted-forest hairlines (vs. solid forest, which
  // was overpowering) separate rows.
  // ---------------------------------------------------------------
  // pageSheet modals on iOS don't sit behind the status bar, so the
  // SafeAreaView top inset is ~0. Without an explicit paddingTop the
  // Cancel / Done buttons hug the sheet's rounded top edge. Bumped to
  // 18 so the row breathes the same as the rest of the chrome.
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: AppColors.primaryLightGreen,
  },
  settingsCloseButton: {
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: 0.2,
  },
  settingsTitle: {
    fontSize: 17,
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.2,
  },
  settingsContent: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  settingsSection: {
    marginBottom: 18,
    marginHorizontal: 16,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },

  // Chat Info Section
  chatInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  chatAvatarText: {
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.4,
  },
  chatInfoDetails: {
    flex: 1,
  },
  chatTitleLarge: {
    fontSize: 18,
    color: AppColors.primaryLightGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  tapToEdit: {
    fontSize: 11,
    color: AppColors.primaryLightGreen,
    opacity: 0.6,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  participantCount: {
    fontSize: 13,
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editNameInput: {
    flex: 1,
    fontSize: 17,
    color: AppColors.basicWhite,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181,215,80,0.4)',
    paddingVertical: 4,
    fontFamily: 'NunitoSans_700Bold',
  },
  saveButton: {
    fontSize: 14,
    color: AppColors.primaryLightGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    marginLeft: 12,
    letterSpacing: 0.3,
  },

  // Section Titles — matches the ProfileScreen / HomeScreen pattern
  // (14pt 600SemiBold, sentence-case, dimmed) so every settings-style
  // surface in the app reads with the same calm hierarchy. Lime here
  // because these titles sit inside forest dark settings cards;
  // ProfileScreen uses the forest variant on its lime canvas.
  sectionTitle: {
    fontSize: 14,
    color: AppColors.primaryLightGreen,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 8,
    letterSpacing: -0.05,
    opacity: 0.7,
  },

  // Participants Section
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181,215,80,0.14)',
  },
  participantAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  participantAvatarText: {
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.3,
  },
  // New: simple coloured-dot identifier per participant. Same colour
  // they wear in the conversation. No letters, no busy circles.
  participantDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  participantDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    color: AppColors.basicWhite,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  participantRole: {
    fontSize: 11.5,
    color: AppColors.primaryLightGreen,
    opacity: 0.6,
    fontFamily: 'NunitoSans_600SemiBold',
    letterSpacing: 0.2,
  },

  // Ride Details Section
  rideDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181,215,80,0.14)',
  },
  rideDetailLabel: {
    fontSize: 13,
    color: AppColors.primaryLightGreen,
    opacity: 0.65,
    fontFamily: 'NunitoSans_700Bold',
    flex: 1,
    letterSpacing: 0.2,
  },
  rideDetailValue: {
    fontSize: 14,
    color: AppColors.basicWhite,
    fontFamily: 'NunitoSans_700Bold',
    flex: 2,
    textAlign: 'right',
    letterSpacing: -0.1,
  },

  // Settings Items
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181,215,80,0.14)',
  },
  settingLabel: {
    fontSize: 14.5,
    color: AppColors.basicWhite,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.1,
  },
  
  // Action Buttons — these live inside the forest settings cards, so
  // they invert to lime fill with forest label (matches the rest of
  // the inverse-button pattern on forest surfaces).
  actionButton: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 10,
    marginTop: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: 0.2,
  },
  // Destructive ("Leave Ride") — warm coral that reads as warning on
  // the forest surface without going pure red.
  destructiveButton: {
    backgroundColor: '#FF6B5B',
  },
  destructiveButtonText: {
    color: AppColors.basicWhite,
  },
});

export default {
  chatScreenStyles,
  passengerInfoStyles,
  tripInfoStyles,
  chatMessagesStyles,
};