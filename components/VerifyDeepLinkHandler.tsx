import React, { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import BrandedAlert from './BrandedAlert';
import { haptic } from './PressableScale';
import { useApi } from '../utils/ApiUtil';

/**
 * Listens for `unipool://verify?t=<token>` deeplinks fired by the
 * email magic-link CTA. The user tapping that link drops them back
 * into the app at this handler — we exchange the token for a
 * verified status server-side, then nudge every screen that reads
 * `/user/details` to revalidate.
 *
 * Renders nothing. Mount once near the root of the auth'd app.
 */
const VerifyDeepLinkHandler: React.FC = () => {
  const { apiUtil, triggerRevalidation } = useApi();

  // Guard against re-firing on the same URL during fast-refresh or
  // when the user backgrounds + foregrounds the app while a verify
  // URL is still the current incoming URL.
  const handledTokens = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      // Accept `unipool://verify?t=…` and the host-style variant
      // (`unipool:/verify`, `unipool:///verify`) some clients
      // produce when rewriting the URL.
      if (parsed.hostname !== 'verify' && parsed.path !== 'verify') return;
      const token =
        (parsed.queryParams?.t as string | undefined) ||
        (parsed.queryParams?.token as string | undefined);
      if (!token) return;
      if (handledTokens.current.has(token)) return;
      handledTokens.current.add(token);

      try {
        await apiUtil.post<{ status: string }, { token: string }>(
          '/user/verify/confirm',
          { token },
        );
        haptic('success');
        triggerRevalidation();
        BrandedAlert.show({
          title: 'Verified',
          body: 'Your academic status is now verified — welcome aboard.',
        });
      } catch (err: any) {
        haptic('error');
        BrandedAlert.show({
          title: "Couldn't verify",
          body:
            err?.response?.data?.error ||
            'The link is expired or already used — request a new one from Personal Information.',
        });
      }
    };

    // Cold-launch: app opened via the link from a fully terminated
    // state. `getInitialURL` resolves once.
    Linking.getInitialURL().then(handle);

    // Warm-launch: app already running, OS hands off the URL via
    // this event.
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [apiUtil, triggerRevalidation]);

  return null;
};

export default VerifyDeepLinkHandler;
