import { StyleSheet } from 'react-native';
import AppColors from '../../design_systems/colors';

export const chatScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 48,
  },
  chatTitle: {
    fontSize: 20,
    color: AppColors.basicBlack,
    marginLeft: 8,
    fontFamily: 'NunitoSans-Regular',
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
  chatHeader: {
    ...chatScreenStyles.chatHeader,
    marginTop: 48,
  },
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
    backgroundColor: AppColors.basicWhite,
    padding: 8,
    borderRadius: 20,
  },
  senderName: {
    color: AppColors.primaryLightGreen,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'NunitoSans-SemiBold',
    opacity: 0.9,
  },
  infoMessage: {
    backgroundColor: AppColors.basicWhite,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 15,
    opacity: 0.9,
  },
  infoText: {
    fontSize: 12,
    color: AppColors.basicBlack,
    textAlign: 'center',
    fontFamily: 'NunitoSans-Regular',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageReceived: {
    backgroundColor: AppColors.secondaryDarkGreen,
    padding: 12,
    borderRadius: 15,
    marginVertical: 4,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  messageSent: {
    backgroundColor: AppColors.basicWhite,
    padding: 12,
    borderRadius: 15,
    marginVertical: 4,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: AppColors.basicWhite,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'NunitoSans-Regular',
  },
  messageTextSent: {
    color: AppColors.basicBlack,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'NunitoSans-Regular',
  },
  messageTime: {
    color: AppColors.basicWhite,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
  },
  messageTimeSent: {
    color: AppColors.basicBlack,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: AppColors.basicWhite,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.basicBlack,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    padding: 12,
  },
  typingBarContainer: {
    paddingHorizontal: 26,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 44,
    borderWidth: 2.28,
    borderColor: AppColors.secondaryDarkGreen,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typingBarText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    flex: 1,
    fontFamily: 'NunitoSans-Regular',
  },
  typingBarIconContainer: {
    width: 35,
    height: 35,
    backgroundColor: 'transparent',
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 11,
  },
  
  // Settings Button
  settingsButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Settings Modal Styles
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.secondaryDarkGreen,
    backgroundColor: AppColors.primaryLightGreen,
  },
  settingsCloseButton: {
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    fontWeight: '600',
    fontFamily: 'NunitoSans-SemiBold',
  },
  settingsTitle: {
    fontSize: 18,
    color: AppColors.basicBlack,
    fontWeight: '600',
    fontFamily: 'NunitoSans-SemiBold',
  },
  settingsContent: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  settingsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  
  // Chat Info Section
  chatInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  chatAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.secondaryDarkGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatAvatarText: {
    fontSize: 24,
    color: AppColors.basicWhite,
    fontWeight: '600',
    fontFamily: 'NunitoSans-SemiBold',
  },
  chatInfoDetails: {
    flex: 1,
  },
  chatTitleLarge: {
    fontSize: 20,
    color: AppColors.basicBlack,
    fontWeight: '600',
    fontFamily: 'NunitoSans-SemiBold',
    marginBottom: 4,
  },
  tapToEdit: {
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 14,
    color: AppColors.basicBlack,
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editNameInput: {
    flex: 1,
    fontSize: 18,
    color: AppColors.basicBlack,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.secondaryDarkGreen,
    paddingVertical: 4,
    fontFamily: 'NunitoSans-Regular',
  },
  saveButton: {
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'NunitoSans-SemiBold',
  },
  
  // Section Titles
  sectionTitle: {
    fontSize: 16,
    color: AppColors.basicBlack,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'NunitoSans-SemiBold',
  },
  
  // Participants Section
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.secondaryDarkGreen,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.secondaryDarkGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  participantAvatarText: {
    fontSize: 16,
    color: AppColors.basicWhite,
    fontWeight: '600',
    fontFamily: 'NunitoSans-SemiBold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: AppColors.primaryLightGreen,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    color: AppColors.basicBlack,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Medium',
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 12,
    color: AppColors.basicBlack,
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
  },
  
  // Ride Details Section
  rideDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.secondaryDarkGreen,
  },
  rideDetailLabel: {
    fontSize: 14,
    color: AppColors.basicBlack,
    opacity: 0.7,
    fontFamily: 'NunitoSans-Regular',
    flex: 1,
  },
  rideDetailValue: {
    fontSize: 14,
    color: AppColors.basicBlack,
    fontWeight: '500',
    fontFamily: 'NunitoSans-Medium',
    flex: 2,
    textAlign: 'right',
  },
  
  // Settings Items
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.secondaryDarkGreen,
  },
  settingLabel: {
    fontSize: 16,
    color: AppColors.basicBlack,
    fontFamily: 'NunitoSans-Regular',
  },
  
  // Action Buttons
  actionButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    color: AppColors.basicWhite,
    fontWeight: '600',
    fontFamily: 'NunitoSans-SemiBold',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
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