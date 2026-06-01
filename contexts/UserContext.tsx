import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "./AuthGate";

// Lightweight `/user/details` mirror. The index signature keeps the context
// tolerant of extra fields returned by the API.
export type UserDetails = {
  id: string;
  name: string;
  email?: string;
  contact_number?: string;
  gender?: string;
  yob?: number;
  upi_vpa?: string;
  profile_picture_url?: string;
  is_email_verified?: boolean;
  institute_id?: string;
  institute_name?: string;
  [extra: string]: unknown;
};

type UserContextValue = {
  /** Latest user-details response, or null when signed out or not fetched yet. */
  user: UserDetails | null;
  /** True while the context is fetching user details. */
  loading: boolean;
  /** Re-fetch `/user/details` after writes that mutate profile data. */
  refresh: () => Promise<UserDetails | null>;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: false,
  refresh: async () => null,
});

/**
 * Centralized cache for `/user/details`.
 * Fetches after auth resolves, clears itself for guests, and exposes
 * `refresh()` for profile writes that need to update every consumer.
 */
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { apiUtil } = useApi();
  const { isGuest, resolving: authResolving } = useAuthGate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<UserDetails | null> => {
    if (isGuest) {
      setUser(null);
      return null;
    }
    setLoading(true);
    try {
      const resp = await apiUtil.get<{ user: UserDetails }>("/user/details?summary=1");
      const next = resp?.user ?? null;
      setUser(next);
      return next;
    } catch (err) {
      // Treat missing or unreachable profile data as an empty context value;
      // screens can still render and offer the relevant recovery flow.
      console.warn("[UserContext] refresh failed", err);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiUtil, isGuest]);

  // Wait for AuthGate so bootstrap does not race the first profile request.
  useEffect(() => {
    if (authResolving) return;
    void refresh();
  }, [authResolving, refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh }),
    [loading, refresh, user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

/**
 * Synchronous access to cached `/user/details` data.
 */
export const useUser = () => use(UserContext);
