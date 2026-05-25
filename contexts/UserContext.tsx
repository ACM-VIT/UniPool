import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "./AuthGate";

// Lightweight backend `/user/details` mirror. Only fields actually
// consumed by the app are typed here — we accept whatever else the
// API returns and just pass it through.
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
  /** Latest user-details response, or null when not signed in / not yet
   *  fetched. */
  user: UserDetails | null;
  /** True between the first refresh start and the first refresh end —
   *  consumers can show skeleton state on cold boot. */
  loading: boolean;
  /** Re-fetch `/user/details` and broadcast. Call after a profile edit
   *  (e.g. saving UPI VPA, contact, gender) so every screen reading
   *  via `useUser()` immediately sees the new value. */
  refresh: () => Promise<UserDetails | null>;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: false,
  refresh: async () => null,
});

/**
 * `UserProvider` — single source of truth for `/user/details`.
 *
 * The codebase used to call `/user/details` from at least eight
 * different surfaces (AvailableRideScreen, CreateRide,
 * RideRequestedScreen, ChatMessages, PassengerInfo, RideDetailsScreen,
 * ProfileScreen, AppShell). Half of them used `getUncached` to bypass
 * the ApiCache, which meant a cold boot to Home fanned out 4+
 * identical network round-trips before the user could do anything.
 *
 * This provider:
 *   - Fetches once on first render and re-fetches whenever auth state
 *     flips (so signing in / out updates the context).
 *   - Exposes `refresh()` for the rare callers that genuinely need to
 *     re-read after writing (ProfileScreen on UPI save, AppShell on
 *     verification deep-link, etc).
 *   - Stores the response in component state — consumers read from
 *     context (sync, no I/O) instead of calling the API themselves.
 *
 * Auth gating: when `isGuest`, the provider holds `user = null` and
 * skips the network round-trip entirely. The hook caller is
 * responsible for handling the `null` case (most of them already do
 * via optional chaining).
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
      const resp = await apiUtil.get<{ user: UserDetails }>("/user/details");
      const next = resp?.user ?? null;
      setUser(next);
      return next;
    } catch (err) {
      // 404 means the Firebase user is signed in but doesn't have a
      // backend row yet (post-signup waiting on profile completion).
      // That's not a context error — it's just an empty user. Other
      // failures we swallow so a network blip doesn't strand the
      // entire app in a loading state.
      console.warn("[UserContext] refresh failed", err);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiUtil, isGuest]);

  // Hydrate once auth state has resolved. The `authResolving` guard
  // prevents a wasted call during the AuthGate's bootstrap (which
  // would race the eventual `onAuthStateChanged` fire and force a
  // second fetch).
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
 * `useUser()` — sync access to `/user/details` from any component.
 * Returns `{ user, loading, refresh }`. `user` is `null` while loading
 * or when signed out — callers should handle that.
 */
export const useUser = () => useContext(UserContext);
