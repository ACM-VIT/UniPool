import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import type { RootStackParamList } from "./RootStackParamList";

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

export const encodeRouteParams = (
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

export const decodeRouteParams = (params?: Params): Record<string, any> => {
  if (!params) return {};

  return Object.entries(params).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[key] = decodeParamValue(value);
    return acc;
  }, {});
};

export const appHref = <Route extends AppRouteName>(
  screen: Route,
  params?: RootStackParamList[Route],
) =>
  ({
    pathname: `/${String(screen)}`,
    params: encodeRouteParams(params as Params),
  }) as any;

export const targetHref = (target: AppRouteTarget) =>
  appHref(target.screen, target.params as any);

export const routeNameFromPath = (pathname?: string | null) => {
  if (!pathname || pathname === "/") return undefined;
  const segment = pathname.split("?")[0].split("/").filter(Boolean)[0];
  return segment ? (decodeURIComponent(segment) as AppRouteName) : undefined;
};

export const useDecodedLocalSearchParams = <T extends Record<string, any> = Record<string, any>>() => {
  const params = useLocalSearchParams();
  const paramsKey = JSON.stringify(params);
  return useMemo(() => decodeRouteParams(params) as T, [paramsKey]);
};
