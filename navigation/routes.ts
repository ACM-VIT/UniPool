import { useMemo } from "react";
import { Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { RootStackParamList } from "./RootStackParamList";

// Clean web URL slugs for the user-facing screens. Native keeps the
// PascalCase route names (URLs are invisible in a native stack); only the
// web build rewrites them, so this stays risk-free for the shipping app.
// Screens not listed fall back to `/<ScreenName>`. Each slug has a matching
// alias route file in app/ (e.g. app/sign-in.tsx) that re-exports the same
// screen wrapper. Ride detail gets a REST-style /ride/<id> path.
const WEB_PATHS: Partial<Record<string, string>> = {
  HomeScreen: "/",
  AuthScreen: "/sign-in",
  SignInScreen: "/sign-in",
  SignUpScreen: "/welcome",
  AvailableRidesScreen: "/search",
  CreateRide: "/post",
  TripsListScreen: "/trips",
  ProfileScreen: "/profile",
  BookingsScreen: "/bookings",
  PersonalInformationScreen: "/personal-information",
  AccountSettingsScreen: "/account-settings",
  ChatMessages: "/chat",
};

const WEB_PATH_TO_NAME: Record<string, AppRouteNameLoose> = {
  "": "HomeScreen",
  "sign-in": "AuthScreen",
  welcome: "SignUpScreen",
  search: "AvailableRidesScreen",
  post: "CreateRide",
  trips: "TripsListScreen",
  profile: "ProfileScreen",
  bookings: "BookingsScreen",
  "personal-information": "PersonalInformationScreen",
  "account-settings": "AccountSettingsScreen",
  chat: "ChatMessages",
  ride: "RideDetailsScreen",
};

type AppRouteNameLoose = keyof RootStackParamList;

const JSON_PARAM_PREFIX = "__json:";

export type AppRouteName = keyof RootStackParamList;
export type AppRouteTarget<Route extends AppRouteName = AppRouteName> = {
  screen: Route;
  params?: RootStackParamList[Route];
};

type Params = Record<string, any> | undefined;

const encodeParamValue = (value: any): string | string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => encodeParamValue(item) as string);
  }

  if (value !== null && typeof value === "object") {
    return `${JSON_PARAM_PREFIX}${JSON.stringify(value)}`;
  }

  return String(value);
};

const decodeParamValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(decodeParamValue);
  }

  if (typeof value === "string" && value.startsWith(JSON_PARAM_PREFIX)) {
    try {
      return JSON.parse(value.slice(JSON_PARAM_PREFIX.length));
    } catch {
      return value;
    }
  }

  if (value === "true") return true;
  if (value === "false") return false;

  return value;
};

const encodeRouteParams = (
  params?: Params,
): Record<string, string | string[]> => {
  if (!params) return {};

  return Object.entries(params).reduce<Record<string, string | string[]>>(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = encodeParamValue(value);
      }
      return acc;
    },
    {},
  );
};

const decodeRouteParams = (params?: Params): Record<string, any> => {
  if (!params) return {};

  return Object.entries(params).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[key] = decodeParamValue(value);
    return acc;
  }, {});
};

export const appHref = <Route extends AppRouteName>(
  screen: Route,
  params?: RootStackParamList[Route],
) => {
  if (Platform.OS === "web") {
    // Ride detail → REST-style /ride/<id>. The id moves into the path; any
    // other params stay in the query string.
    if (screen === "RideDetailsScreen" && params && (params as any).rideId) {
      const { rideId, ...rest } = params as any;
      return {
        pathname: `/ride/${rideId}`,
        params: encodeRouteParams(rest as Params),
      } as any;
    }
    const clean = WEB_PATHS[String(screen)];
    if (clean) {
      return { pathname: clean, params: encodeRouteParams(params as Params) } as any;
    }
  }
  return {
    pathname: `/${String(screen)}`,
    params: encodeRouteParams(params as Params),
  } as any;
};

export const targetHref = (target: AppRouteTarget) =>
  appHref(target.screen, target.params as any);

export const routeNameFromPath = (pathname?: string | null) => {
  if (!pathname) return undefined;
  const segment = pathname.split("?")[0].split("/").filter(Boolean)[0] ?? "";
  if (Platform.OS === "web") {
    const mapped = WEB_PATH_TO_NAME[segment];
    if (mapped) return mapped as AppRouteName;
  }
  if (pathname === "/" || segment === "") return undefined;
  return decodeURIComponent(segment) as AppRouteName;
};

export const useDecodedLocalSearchParams = <T extends Record<string, any> = Record<string, any>>() => {
  const params = useLocalSearchParams();
  const paramsKey = JSON.stringify(params);
  return useMemo(() => decodeRouteParams(params) as T, [paramsKey]);
};
