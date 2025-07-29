import { StyleSheet } from 'react-native';
import AppColors from '../../design_systems/colors';

export const chatScreenStyles = StyleSheet.create({
  // Common styles used across all chat screens
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
  },
  instituteNumber: {
    fontSize: 10,
    color: AppColors.basicBlack,
    marginLeft: 4,
    marginTop: 1,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.basicBlack,
    marginLeft: 8,
  },
  chatSubtitleNumber: {
    fontSize: 14,
    color: AppColors.basicBlack,
    marginLeft: 8,
    marginTop: 2,
  },
  chatSubtitle: {
    fontSize: 12,
    color: AppColors.basicBlack,
    opacity: 0.7,
    marginLeft: 8,
    marginTop: 2,
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
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  toggleButtonActive: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  toggleButtonInactive: {
    backgroundColor: AppColors.basicWhite,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    opacity: 0.8,
  },
  toggleTextActive: {
    color: AppColors.basicWhite,
    fontWeight: '500',
  },
  toggleTextInactive: {
    color: AppColors.basicBlack,
    fontWeight: '500',
  },
  destinationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  destinationItem: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 12,
  },
  destinationText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontWeight: '500',
  },
  // Custom Arrow Styles
  arrowSquareLeft: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  arrowVector1: {
    width: 18.6,
    height: 17.2,
    position: 'absolute',
    left: 17.2,
    top: 0,
    backgroundColor: '#273B33',
    transform: [{ rotate: '90deg' }],
  },
  arrowVector2: {
    width: 9.3,
    height: 7.0,
    position: 'absolute',
    left: 12.1,
    top: 3.9,
    backgroundColor: '#273B33',
    transform: [{ rotate: '90deg' }],
  },
});

export const tripInfoStyles = StyleSheet.create({
  ...chatScreenStyles,
  chatHeader: {
    ...chatScreenStyles.chatHeader,
    paddingVertical: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  toggleButtonActive: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  toggleButtonInactive: {
    backgroundColor: AppColors.basicWhite,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    opacity: 0.8,
  },
  toggleTextActive: {
    color: AppColors.basicWhite,
    fontWeight: '500',
  },
  toggleTextInactive: {
    color: AppColors.basicBlack,
    fontWeight: '500',
  },
  tripsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tripItem: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 15,
    marginBottom: 12,
    padding: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tripDate: {
    color: AppColors.basicWhite,
    fontSize: 12,
    opacity: 0.7,
  },
  tripDetails: {
    alignItems: 'flex-end',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  tripPrice: {
    color: AppColors.basicBlack,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tripParticipants: {
    color: AppColors.basicWhite,
    fontSize: 10,
    opacity: 0.7,
  },
  // Custom Arrow Styles
  arrowSquareLeft: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  arrowVector1: {
    width: 18.6,
    height: 17.2,
    position: 'absolute',
    left: 17.2,
    top: 0,
    backgroundColor: '#273B33',
    transform: [{ rotate: '90deg' }],
  },
  arrowVector2: {
    width: 9.3,
    height: 7.0,
    position: 'absolute',
    left: 12.1,
    top: 3.9,
    backgroundColor: '#273B33',
    transform: [{ rotate: '90deg' }],
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
    fontWeight: 'bold',
    color: AppColors.basicBlack,
  },
  chatSubtitle: {
    fontSize: 12,
    color: AppColors.basicBlack,
    opacity: 0.7,
    marginTop: 2,
  },
  carIcon: {
    backgroundColor: AppColors.basicWhite,
    padding: 8,
    borderRadius: 20,
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
  },
  messageTextSent: {
    color: AppColors.basicBlack,
    fontSize: 14,
    lineHeight: 18,
  },
  messageTime: {
    color: AppColors.basicWhite,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
  },
  messageTimeSent: {
    color: AppColors.basicBlack,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.7,
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
    marginBottom: 16, // Remove extra space since no main nav bar
    borderRadius: 44,
    borderWidth: 2.28,
    borderColor: AppColors.secondaryDarkGreen,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typingBarText: {
    opacity: 0.5,
    color: AppColors.basicBlack,
    fontSize: 16,
    fontWeight: '300',
    flex: 1,
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
});

export default {
  chatScreenStyles,
  passengerInfoStyles,
  tripInfoStyles,
  chatMessagesStyles,
};
