import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Modal,
    ScrollView,
    Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import AppColors from "../design-system/colors";

const { width, height } = Dimensions.get("window");

const LOCATIONS = [
    "Chennai",
    "Vellore",
    "Bangalore",
    "Coimbatore",
    "Salem",
    "Madurai",
];

interface RideDetails {
    from: string;
    to: string;
    date: Date;
}

interface RideDetailsSelectorProps {
    onSubmit: (details: RideDetails) => void;
}

const RideDetailsSelector: React.FC<RideDetailsSelectorProps> = ({
    onSubmit,
}) => {
    // Form state
    const [fromLocation, setFromLocation] = useState("");
    const [toLocation, setToLocation] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date());

    // UI state
    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

    // Handle location selection
    const handleLocationSelect = (location: string, isFrom: boolean) => {
        if (isFrom) {
            setFromLocation(location);
            setShowFromDropdown(false);
        } else {
            setToLocation(location);
            setShowToDropdown(false);
        }
    };

    // Handle date/time selection
    const handleDateTimeChange = (event: any, selected?: Date) => {
        if (selected) {
            setSelectedDate(selected);
            if (pickerMode === "date") {
                setPickerMode("time");
            } else {
                setShowPicker(false);
                setPickerMode("date");
            }
        } else {
            setShowPicker(false);
            setPickerMode("date");
        }
    };

    // Handle date field click
    const handleDateFieldClick = () => {
        setPickerMode("date");
        setShowPicker(true);
    };

    const setToToday = () => {
        setSelectedDate(new Date());
    };

    const setToTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(tomorrow);
    };

    return (
        <View style={styles.container}>
            {/* From Location */}
            <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowFromDropdown(true)}
            >
                <View style={styles.inputContent}>
                    <Image
                        source={require("../assets/location-pin.png")}
                        style={styles.icon}
                    />
                </View>
                <Text style={styles.selectedText}>
                    {fromLocation || "From"}
                </Text>
            </TouchableOpacity>

            {/* To Location */}
            <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowToDropdown(true)}
            >
                <View style={styles.inputContent}>
                    <Image
                        source={require("../assets/arrow-icon.png")}
                        style={styles.icon}
                    />
                </View>
                <Text style={styles.selectedText}>{toLocation || "To"}</Text>
            </TouchableOpacity>

            {/* Date Selection */}
            <View style={styles.dateContainer}>
                <TouchableOpacity onPress={handleDateFieldClick}>
                    <View style={styles.inputContent}>
                        <Image
                            source={require("../assets/calendar-icon.png")}
                            style={styles.icon}
                        />
                        <View>
                            <Text style={styles.label}>
                                Date and Time of Journey
                            </Text>
                            <Text style={styles.selectedDateText}>
                                {format(selectedDate, "EEE d MMM yyyy, h:mm a")}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <View style={styles.dateButtons}>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={setToToday}
                    >
                        <Text style={styles.dateButtonText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={setToTomorrow}
                    >
                        <Text style={styles.dateButtonText}>Tomorrow</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Location Dropdowns */}
            <Modal
                visible={showFromDropdown || showToDropdown}
                transparent
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Select {showFromDropdown ? "From" : "To"} Location
                        </Text>
                        <ScrollView style={styles.locationList}>
                            {LOCATIONS.map((location) => (
                                <TouchableOpacity
                                    key={location}
                                    style={styles.locationItem}
                                    onPress={() =>
                                        handleLocationSelect(
                                            location,
                                            showFromDropdown
                                        )
                                    }
                                >
                                    <Text style={styles.locationText}>
                                        {location}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                                setShowFromDropdown(false);
                                setShowToDropdown(false);
                            }}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Date/Time Picker */}
            {showPicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode={pickerMode}
                    display="default"
                    onChange={handleDateTimeChange}
                    minimumDate={new Date()}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        borderRadius: 15,
        overflow: "hidden",
        borderColor: AppColors.basicBlack,
        borderWidth: 2,
    },
    inputContainer: {
        width: "100%",
        padding: "4%",
        paddingVertical: "6%",
        borderBottomWidth: 2,
        borderBottomColor: AppColors.basicBlack,
        flexDirection: "row",
    },
    inputContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    icon: {
        height: height * 0.03,
        width: height * 0.04,
        objectFit: "contain",
    },
    label: {
        fontSize: 8,
        color: AppColors.basicBlack,
        fontFamily: "NunitoSans_600SemiBold",
    },
    selectedText: {
        fontSize: 16,
        color: AppColors.basicBlack,
        fontFamily: "NunitoSans_600SemiBold",
        marginLeft: "2%",
    },
    selectedDateText: {
        fontSize: 12,
        color: AppColors.basicBlack,
        fontFamily: "NunitoSans_600SemiBold",
    },
    dateContainer: {
        width: "100%",
        padding: "4%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dateButtons: {
        flexDirection: "column",
        gap: 5,
    },
    dateButton: {
        backgroundColor: AppColors.basicBlack,
        paddingVertical: "4%",
        paddingHorizontal: "6%",
        borderRadius: 8,
        textAlign: "center",
        alignItems: "center",
    },
    dateButtonText: {
        color: AppColors.basicWhite,
        fontSize: 10,
        fontFamily: "NunitoSans_600SemiBold",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: AppColors.secondaryDarkGreen,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        padding: "5%",
        maxHeight: "60%",
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: "NunitoSans_600SemiBold",
        marginBottom: "4%",
        color: AppColors.primaryLightGreen
    },
    locationList: {
        maxHeight: "80%",
    },
    locationItem: {
        paddingVertical: "4%",
        borderBottomWidth: 1,
        borderBottomColor: AppColors.basicWhite,
        color: AppColors.basicWhite,
    },
    locationText: {
        fontSize: 16,
        fontFamily: "NunitoSans_400Regular",
        color: AppColors.basicWhite,
    },
    closeButton: {
        marginTop: "4%",
        alignItems: "center",
        padding: "3%",
        backgroundColor: AppColors.basicBlack,
        borderRadius: 8,
    },
    closeButtonText: {
        color: AppColors.basicWhite,
        fontSize: 16,
        fontFamily: "NunitoSans_600SemiBold",
    },
});

export default RideDetailsSelector;
