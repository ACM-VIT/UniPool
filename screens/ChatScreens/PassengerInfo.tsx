import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useFocusEffect, useRouter } from "expo-router";
import PressableScale from '../../components/PressableScale';
import { passengerInfoStyles } from './ChatScreen.styles';
import { PassengerInfoScreenProps, User } from './ChatScreen.types';
import { useThemeColors } from '../../contexts/ThemeContext';
import BrandInfo from '../../components/BrandInfo/BrandInfo';
import LoadingComponent from '../../components/LoadingComponent';
import SmileyGlyph from '../../components/SmileyGlyph';
import { useApi } from '../../utils/ApiUtil';
import { useUser } from '../../contexts/UserContext';
import RideService from '../../utils/RideService';
import styles from '../ProfileScreen/ProfileScreen.styles';
import { appHref } from "../../navigation/routes";
import { useTabletContentStyle } from "../../utils/responsive";

const generateDMRoomId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `dm_${sortedIds[0]}_${sortedIds[1]}`;
};

const PassengerRow = React.memo(function PassengerRow({
  passenger,
  onPress,
}: {
  passenger: User;
  onPress: (passenger: User) => void;
}) {
  const rowColors = useThemeColors();
  const handlePress = useCallback(() => {
    onPress(passenger);
  }, [onPress, passenger]);

  return (
    <PressableScale
      style={[passengerInfoStyles.destinationItem, { backgroundColor: rowColors.navFill }]}
      onPress={handlePress}
    >
      <Text style={[passengerInfoStyles.destinationText, { color: rowColors.navIconActive }]}>{passenger.name}</Text>
    </PressableScale>
  );
});

const PassengerInfoScreen: React.FC<Pick<PassengerInfoScreenProps, "setNavBarVariant">> = ({ setNavBarVariant }) => {
  const router = useRouter();
  const colors = useThemeColors();
  const tabletContentStyle = useTabletContentStyle();
  const [passengers, setPassengers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { apiUtil } = useApi();
  const { user: contextUser } = useUser();
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => {
    if (setNavBarVariant) {
      setNavBarVariant(0);
    }
  }, [setNavBarVariant]);

  const fetchPassengers = useCallback(async () => {
      try {
        setLoading(true);
        const [people, currentUserResponse] = await Promise.all([
          RideService.getAllPassengers(apiUtil),
          contextUser?.id
            ? Promise.resolve(null)
            : apiUtil.get<{user: {id: string, name: string}}>("/user/details?summary=1"),
        ]);
        const fetchedCurrentUserId = contextUser?.id ?? currentUserResponse?.user.id ?? '';
        setCurrentUserId(fetchedCurrentUserId);

        const uniquePeopleMap = new Map<string, User>();

        for (const person of people) {
          if (!person?.id || person.id === fetchedCurrentUserId) {
            continue;
          }
          uniquePeopleMap.set(person.id, {
            id: person.id,
            name: person.name,
            email: person.email || '',
          });
        }
        
        const uniquePeople = Array.from(uniquePeopleMap.values());
        setPassengers(uniquePeople);
      } catch (error: any) {
        if (error?.message === "AUTHENTICATION_REDIRECT") {
          console.log("Authentication redirect in PassengerInfo");
          return;
        }
        
        // Handle user not found - should redirect to signup (handled by ApiUtil)
        if (error?.response?.status === 404 && 
            error?.response?.data?.message === "User not found in database, signup required") {
          console.log("User not found in database - redirect to signup handled by ApiUtil");
          return;
        }
        
        console.error("Failed to fetch passengers:", error);
      } finally {
        setLoading(false);
      }
    }, [apiUtil, contextUser?.id]);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      void fetchPassengers();
      return undefined;
    }, [fetchPassengers]),
  );

  const openPassengerChat = useCallback((passenger: User) => {
    const dmRoomId = generateDMRoomId(currentUserId, passenger.id);
    router.navigate(appHref("ChatMessages", {
      chatId: dmRoomId,
      chatTitle: `Chat with ${passenger.name}`,
      chatSubtitle: ``,
      userId: currentUserId,
      isGroupChat: false,
      otherUserId: passenger.id,
    }));
  }, [currentUserId, router]);

  const renderPassenger: ListRenderItem<User> = useCallback(({ item }) => (
    <PassengerRow passenger={item} onPress={openPassengerChat} />
  ), [openPassengerChat]);

  const keyExtractor = useCallback((item: User) => item.id, []);

  const renderHeader = useCallback(() => (
    <>
        <View style={passengerInfoStyles.chatHeader}>
          <Text style={[passengerInfoStyles.chatTitle, { color: colors.textPrimary }]}>Chat</Text>
        </View>

        <View style={passengerInfoStyles.toggleContainer}>
          <TouchableOpacity
            style={[passengerInfoStyles.toggleButtonInactive, { borderColor: colors.navFill }]}
            onPress={() => router.navigate(appHref("TripsListScreen"))}
          >
            <Text style={[passengerInfoStyles.toggleTextInactive, { color: colors.textPrimary }]}>Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[passengerInfoStyles.toggleButtonActive, { backgroundColor: colors.navFill, borderColor: colors.navFill }]}>
            <Text style={[passengerInfoStyles.toggleTextActive, { color: colors.navIconInactive }]}>Passenger</Text>
          </TouchableOpacity>
        </View>
    </>
  ), [router, colors]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 200 }}>
          <LoadingComponent />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 180 }}>
              {/* Inline SVG smiley — vector replacement for the
                  pixelated happy-emoji.png raster. Stays crisp at @3x
                  and tracks the brand palette automatically. */}
              <View style={{ marginBottom: 20 }}>
                <SmileyGlyph size={120} />
              </View>
              <Text style={{ fontFamily: 'NunitoSans_800ExtraBold', fontSize: 20, color: colors.textPrimary, textAlign: 'center', marginBottom: 6, letterSpacing: -0.3 }}>
                No co-riders yet
              </Text>
              <Text style={{ fontFamily: 'NunitoSans_400Regular', fontSize: 15, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' }}>
                When you share a ride, the people you've travelled with show up here for direct messages.
              </Text>
      </View>
    );
  }, [loading, colors]);

  return (
    <View style={[passengerInfoStyles.container, { backgroundColor: colors.background }, tabletContentStyle]}>
      <StatusBar backgroundColor={colors.statusBarBackground} barStyle={colors.statusBarStyle} />
      <View style={[styles.brandInfoHeaderRow, { backgroundColor: colors.background }]}>
        <BrandInfo />
      </View>

      <FlatList
        data={loading ? [] : passengers}
        keyExtractor={keyExtractor}
        renderItem={renderPassenger}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={32}
        windowSize={7}
      />
    </View>
  );
};

export default PassengerInfoScreen;
