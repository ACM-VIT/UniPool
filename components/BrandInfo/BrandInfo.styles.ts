import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  locationText: {
    fontWeight: "bold",
    fontFamily: "NunitoSans_400Regular",
    fontSize: 16,
    color: "#222",
  },
  pincodeText: {
    fontSize: 13,
    color: "#222",
    marginTop: -6,
  },
  brandText: {
    fontWeight: "normal",
    fontFamily: "Trap-Bold",
    fontSize: 24,
    color: "#222",
  },
});

export default styles;