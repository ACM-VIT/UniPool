import { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width, height } = Dimensions.get("window");

const CreateRide: React.FC = () => {
  const navigation = useNavigation();
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<"time">("time");
  const [show, setShow] = useState(false);
  const [passengerCount, setPassengerCount] = useState(3);

  const onChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setTime(selectedTime);
    }
    setShow(false);
  };

  const showTimepicker = () => {
    setShow(true);
    setMode("time");
  };

  const handleRideSubmit = (details: {
    from: string;
    to: string;
    date: Date;
  }) => {
    console.log("Submitted ride details:", details);
  };

  const increasePassengers = () => {
    if (passengerCount < 20) {
      setPassengerCount((prev) => prev + 1);
    }
  };

  const decreasePassengers = () => {
    if (passengerCount > 1) {
      setPassengerCount((prev) => prev - 1);
    }
  };

  const getPassengerImage = () => {
    if (passengerCount == 1 || passengerCount == 2) {
      return require("../assets/motorcycle.png");
    } else if (passengerCount == 3) {
      return require("../assets/Taxi.png");
    } else if (passengerCount == 4) {
      return require("../assets/racer.png");
    } else if (passengerCount > 4 && passengerCount < 8) {
      return require("../assets/wagon.png");
    } else if (passengerCount >= 8 && passengerCount < 11) {
      return require("../assets/foodvan.png");
    } else if (passengerCount >= 11 && passengerCount < 20) {
      return require("../assets/Bus.png");
    } else if (passengerCount == 20) {
      return require("../assets/UFO.png");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require("../assets/arrow-square-left.png")} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UniPool</Text>
      </View>
      
      <View style={styles.mainContent}>
        <Text style={styles.title}>Create a Ride</Text>

        <View style={styles.section}>
          <RideDetailsSelector 
            onSubmit={handleRideSubmit} 
            onLocationSelectionChange={() => {}}
          />
        </View>

        <Text style={styles.label}>When will the voyage begin?</Text>
        <TouchableOpacity onPress={showTimepicker} style={styles.buttonTime}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).split(':')[0]}
            </Text>
            <Text style={styles.timeColon}>:</Text>
            <Text style={styles.timeText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).split(':')[1]}
            </Text>
          </View>
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={time}
            mode={mode}
            is24Hour={true}
            onChange={onChange}
          />
        )}

        <Text style={styles.label}>Number of Passengers</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity
            onPress={decreasePassengers}
            style={styles.counterButton}
          >
            <Text style={styles.counterText}>−</Text>
          </TouchableOpacity>
          <View style={styles.counterValueContainer}>
            <Text style={styles.counterValue}>{passengerCount}</Text>
          </View>
          <TouchableOpacity
            onPress={increasePassengers}
            style={styles.counterButton}
          >
            <Text style={styles.counterText}>+</Text>
          </TouchableOpacity>
        </View>

        <Image style={styles.passengerImage} source={getPassengerImage()} />

        <TouchableOpacity style={styles.slideButton}>
          <View style={styles.slideButtonContent}>
            <Image 
              source={require("../assets/arrow-square-left.png")} 
              style={styles.slideIcon} 
            />
            <Text style={styles.slideText}>Slide to create ride</Text>
            <Image 
              source={require("../assets/smiling-emoji.png")} 
              style={styles.emojiIcon} 
            />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: AppColors.basicBlack,
  },
  headerTitle: {
    flex: 1,
    textAlign: "right",
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    paddingBottom: 15,
    color: AppColors.basicBlack,
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: "2.5%",
  },
  label: {
    paddingTop: "6%",
    paddingBottom: "3%",
    fontWeight: "500",
    fontSize: 18,
    color: AppColors.basicBlack,
  },
  buttonTime: {
    backgroundColor: AppColors.basicBlack,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: "center",
    alignSelf: "center",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: AppColors.basicWhite,
    fontSize: 30,
  },
  timeColon: {
    color: AppColors.primaryLightGreen,
    fontSize: 30,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: "40%",
    alignSelf: "center",
  },
  counterButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: {
    color: AppColors.primaryLightGreen,
    fontSize: 22,
    fontWeight: "bold",
  },
  counterValueContainer: {
    backgroundColor: AppColors.basicBlack,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  counterValue: {
    color: AppColors.basicWhite,
    fontSize: 20,
    fontWeight: "bold",
  },
  passengerImage: {
    width: 150,
    height: 150,
    alignSelf: "center",
    resizeMode: "contain",
  },
  slideButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  slideButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  slideIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: AppColors.basicWhite,
  },
  slideText: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.basicWhite,
    marginRight: 5,
  },
  emojiIcon: {
    width: 20,
    height: 20,
  },
});

export default CreateRide;
