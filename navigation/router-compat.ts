import React from "react";
import {
  router,
  useFocusEffect,
  useIsFocused,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import type { RootStackParamList } from "./RootStackParamList";

const JSON_PARAM_PREFIX = "__json:";

type Params = Record<string, any> | undefined;
type RouteName = keyof RootStackParamList | string;

export type NavigationState = {
  index?: number;
  routes: Array<{
    name: string;
    state?: NavigationState;
    params?: Params;
  }>;
};

export type CompatRoute<
  ParamList extends Record<string, any> = RootStackParamList,
  Route extends keyof ParamList = keyof ParamList
> = {
  key: string;
  name: Route;
  params: ParamList[Route];
};

export type CompatNavigation = {
  navigate: (screen: RouteName, params?: Params) => void;
  replace: (screen: RouteName, params?: Params) => void;
  reset: (state: { index?: number; routes: Array<{ name: RouteName; params?: Params }> }) => void;
  dispatch: (action: any) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  getState: () => NavigationState;
  isFocused: () => boolean;
  addListener: (_event: string, _callback: () => void) => () => void;
  setOptions: (_options: Record<string, any>) => void;
};

export type NativeStackNavigationProp<
  _ParamList extends Record<string, any>,
  _RouteName extends keyof _ParamList = keyof _ParamList
> = CompatNavigation;

export type NativeStackScreenProps<
  ParamList extends Record<string, any>,
  Route extends keyof ParamList
> = {
  navigation: CompatNavigation;
  route: CompatRoute<ParamList, Route>;
};

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

  return value;
};

export const encodeRouteParams = (params?: Params): Record<string, string | string[]> => {
  if (!params) return {};

  return Object.entries(params).reduce<Record<string, string | string[]>>(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = encodeParamValue(value);
      }
      return acc;
    },
    {}
  );
};

export const decodeRouteParams = (params?: Params): Record<string, any> => {
  if (!params) return {};

  return Object.entries(params).reduce<Record<string, any>>((acc, [key, value]) => {
    if (key !== "screen") {
      acc[key] = decodeParamValue(value);
    }
    return acc;
  }, {});
};

export const screenToHref = (screen: RouteName, params?: Params) => ({
  pathname: `/${String(screen)}`,
  params: encodeRouteParams(params),
});

export const routeNameFromPath = (pathname?: string | null) => {
  if (!pathname || pathname === "/") return undefined;
  const segment = pathname.split("?")[0].split("/").filter(Boolean)[0];
  return segment ? decodeURIComponent(segment) : undefined;
};

const resetToRoute = (
  navigation: Pick<CompatNavigation, "replace">,
  state: { index?: number; routes: Array<{ name: RouteName; params?: Params }> }
) => {
  const target = state.routes[state.index ?? state.routes.length - 1] ?? state.routes[0];
  if (target) {
    navigation.replace(target.name, target.params);
  }
};

export const CommonActions = {
  reset: (payload: { index?: number; routes: Array<{ name: RouteName; params?: Params }> }) => ({
    type: "RESET",
    payload,
  }),
};

export { useFocusEffect, useIsFocused };

export const useNavigation = <T extends CompatNavigation = CompatNavigation>(): T => {
  const expoRouter = useRouter();
  const pathname = usePathname();

  return React.useMemo(() => {
    const navigation: CompatNavigation = {
      navigate: (screen, params) => {
        expoRouter.navigate(screenToHref(screen, params) as any);
      },
      replace: (screen, params) => {
        expoRouter.replace(screenToHref(screen, params) as any);
      },
      reset: (state) => resetToRoute(navigation, state),
      dispatch: (action) => {
        if (action?.type === "RESET" && action.payload) {
          resetToRoute(navigation, action.payload);
        }
      },
      goBack: () => {
        if (expoRouter.canGoBack()) {
          expoRouter.back();
        }
      },
      canGoBack: () => expoRouter.canGoBack(),
      getState: () => ({
        index: 0,
        routes: [{ name: routeNameFromPath(pathname) ?? "HomeScreen" }],
      }),
      isFocused: () => true,
      addListener: () => () => {},
      setOptions: () => {},
    };

    return navigation as T;
  }, [expoRouter, pathname]);
};

export const useRoute = <
  ParamList extends Record<string, any> = RootStackParamList,
  Route extends keyof ParamList = keyof ParamList
>(): CompatRoute<ParamList, Route> => {
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const name = (routeNameFromPath(pathname) ?? "HomeScreen") as Route;

  return {
    key: String(name),
    name,
    params: decodeRouteParams(params) as ParamList[Route],
  };
};

export const navigate = (screen: RouteName, params?: Params) => {
  router.navigate(screenToHref(screen, params) as any);
};
