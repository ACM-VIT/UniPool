const bottomNavItems = [
    {
        iconPath: require("../assets/home-icon.png"),
        route: "home",
        isActive: true,
        label: "Home",
    },
    {
        iconPath: require("../assets/suitcase-icon.png"),
        route: "trips",
        isActive: false,
        label: "Trips",
    },
    {
        iconPath: require("../assets/message-icon.png"),
        route: "chat",
        isActive: false,
        label: "Chat",
    },
    {
        iconPath: require("../assets/user-icon.png"),
        route: "profile",
        isActive: false,
        label: "Profile",   
    },
];

export default bottomNavItems;