import { createContext, use } from "react";
import bottomNavItems from "../data/BottomNavigationItems";

type NavBarControls = {
  setNavBarVariant: (variant: 0 | 1 | 2) => void;
  setNavBarText: (text: string) => void;
  setNavBarIcon: (icon: any) => void;
  setNavBarItems: (items: any[]) => void;
};

const noop = () => {};

const NavBarContext = createContext<NavBarControls>({
  setNavBarVariant: noop,
  setNavBarText: noop,
  setNavBarIcon: noop,
  setNavBarItems: noop,
});

export const NavBarProvider = NavBarContext.Provider;

export const useNavBarControls = () => use(NavBarContext);

const resetNavBar = (controls: NavBarControls) => {
  controls.setNavBarVariant(0);
  controls.setNavBarText("");
  controls.setNavBarIcon(require("../assets/wallet.png"));
  controls.setNavBarItems(bottomNavItems);
};
