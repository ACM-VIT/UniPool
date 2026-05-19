import { router } from "expo-router";
import {
  routeNameFromPath,
  screenToHref,
  type NavigationState,
} from "./router-compat";
import type { RootStackParamList } from "./RootStackParamList";

type RouteName = keyof RootStackParamList | string;
type Listener = () => void;

let ready = false;
let currentRouteName = "HomeScreen";
const listeners = new Set<Listener>();

const notifyStateListeners = () => {
  listeners.forEach((listener) => listener());
};

const resolveResetTarget = (payload: any) => {
  const routes = payload?.routes ?? [];
  return routes[payload?.index ?? routes.length - 1] ?? routes[0];
};

export const navigationRef: any = {
  current: null,

  isReady: () => ready,

  setReady: (value: boolean) => {
    ready = value;
  },

  setCurrentRouteName: (name?: string) => {
    const nextName = name ?? "HomeScreen";
    if (currentRouteName !== nextName) {
      currentRouteName = nextName;
      notifyStateListeners();
    }
  },

  addListener: (event: string, callback: Listener) => {
    if (event !== "state") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  getRootState: (): NavigationState => ({
    index: 0,
    routes: [{ name: currentRouteName }],
  }),

  getCurrentRoute: () => ({
    key: currentRouteName,
    name: currentRouteName,
  }),

  navigate: (screen: RouteName, params?: Record<string, any>) => {
    router.navigate(screenToHref(screen, params) as any);
  },

  replace: (screen: RouteName, params?: Record<string, any>) => {
    router.replace(screenToHref(screen, params) as any);
  },

  reset: (state: { index?: number; routes: Array<{ name: RouteName; params?: any }> }) => {
    const target = resolveResetTarget(state);
    if (target) {
      router.replace(screenToHref(target.name, target.params) as any);
    }
  },

  dispatch: (action: any) => {
    if (action?.type === "RESET") {
      const target = resolveResetTarget(action.payload);
      if (target) {
        router.replace(screenToHref(target.name, target.params) as any);
      }
    }
  },

  canGoBack: () => {
    try {
      return router.canGoBack();
    } catch {
      return false;
    }
  },

  goBack: () => {
    try {
      if (router.canGoBack()) {
        router.back();
      }
    } catch {
      router.replace(screenToHref("HomeScreen") as any);
    }
  },

  setOptions: () => {},
};

navigationRef.current = navigationRef;

export const getRouteNameFromPath = routeNameFromPath;
