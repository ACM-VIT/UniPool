export interface Ride {
  id: string;
  host_user_id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  is_same_gender: number;
}

export interface Trip {
  id: number;
  destination: string;
  date: string;
  price: string;
  participants: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  senderName?: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export interface ChatRoom {
  id: string;
  title: string;
  subtitle: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface PassengerDestination {
  id: string;
  name: string;
  isActive?: boolean;
}

export type ChatStackParamList = {
  PassengerInfo: undefined;
  TripInfo: undefined;
  ChatMessages: {
    chatRoom: ChatRoom;
  };
};

export interface PassengerInfoScreenProps {
  navigation?: any;
  route?: any;
  setNavBarVariant?: (variant: 0 | 1 | 2) => void;
}

export interface TripInfoScreenProps {
  navigation?: any;
  route?: any;
  setNavBarVariant?: (variant: 0 | 1 | 2) => void;
}

export interface ChatMessagesScreenProps {
  navigation?: any;
  route?: {
    params?: {
      chatId: string;
      chatTitle: string;
      chatSubtitle: string;
      messages: Array<{
        id: string;
        text: string;
        sender: 'me' | 'other';
      }>;
    };
  };
  setNavBarVariant?: (variant: 0 | 1 | 2) => void;
}
