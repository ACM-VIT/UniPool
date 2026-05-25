import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import AuthSheet, { AuthSheetReturnTo } from "../components/AuthSheet";
import { useApi } from "../utils/ApiUtil";

type GatedAction = AuthSheetReturnTo;

type AuthGateValue = {
  /** True if no Firebase user is currently signed in. */
  isGuest: boolean;
  /** True until the first auth state event resolves. */
  resolving: boolean;
  /**
   * Gate a user action. If signed in, returns `true` so the caller can
   * proceed inline. If not signed in, presents the AuthSheet (Vibecode /
   * FotMob pattern from Mobbin) over the current screen and returns
   * `false`. Pass a contextual `reason` like "to book this ride" so the
   * sheet shows tailored copy.
   */
  requireAuth: (returnTo: GatedAction, reason?: string) => boolean;
};

const AuthGateContext = createContext<AuthGateValue>({
  isGuest: true,
  resolving: true,
  requireAuth: () => false,
});

export const AuthGateProvider = ({ children }: { children: ReactNode }) => {
  const { apiUtil } = useApi();
  const [user, setUser] = useState<any>(null);
  const [resolving, setResolving] = useState(true);

  // Sheet state lives in the provider so any screen can trigger it
  // without dealing with refs or imperative navigation.
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetReason, setSheetReason] = useState<string | undefined>(undefined);
  const [sheetReturnTo, setSheetReturnTo] = useState<GatedAction | undefined>(undefined);

  // Track the latest `user` for use in callbacks without making them
  // dependent on the state directly (which would invalidate them on
  // every auth change).
  const userRef = useRef<any>(null);
  userRef.current = user;

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      apiUtil.setAuthStateResolved(true);
      if (!u) {
        apiUtil.clearAuthTokenCache();
      }
      setResolving(false);
    });
    return unsub;
  }, [apiUtil]);

  const requireAuth = useCallback(
    (returnTo: GatedAction, reason?: string) => {
      if (userRef.current) return true;
      setSheetReturnTo(returnTo);
      setSheetReason(reason);
      setSheetVisible(true);
      return false;
    },
    []
  );

  const dismissSheet = useCallback(() => setSheetVisible(false), []);
  const value = useMemo(
    () => ({ isGuest: !user, resolving, requireAuth }),
    [requireAuth, resolving, user],
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <AuthSheet
        visible={sheetVisible}
        reason={sheetReason}
        returnTo={sheetReturnTo}
        onDismiss={dismissSheet}
      />
    </AuthGateContext.Provider>
  );
};

export const useAuthGate = () => useContext(AuthGateContext);
