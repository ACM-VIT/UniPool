/**
 * UniPool motion language.
 *
 * One small, opinionated set of durations and entrance presets so
 * animation across the app stays coherent instead of every screen
 * inventing its own timing. Built on Reanimated's layout animations,
 * which run entirely on the UI thread.
 *
 * The two rules these encode (from hard experience, not decoration):
 *
 *   1. Motion must answer a question the user just asked. A row fades
 *      in because new data arrived. A sheet slides up because they
 *      opened it. If you can't name the question, don't animate.
 *
 *   2. Most things live between 150ms and 300ms. Longer than that and
 *      the app feels like it's showing off / making the user wait.
 *
 * Reach for these instead of hand-rolling `withTiming(..., {duration})`
 * so the numbers stay in one place.
 */
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

/** Canonical durations, in milliseconds. */
export const DURATION = {
  /** Micro-feedback: a chip toggles, a small control reacts. */
  fast: 150,
  /** The default for almost everything — entrances, fades, reveals. */
  base: 220,
  /** Reserved for larger surfaces (a full sheet / screen). Don't exceed. */
  slow: 300,
} as const;

/** Standard easing — gentle in/out, no theatrics. */
export const EASE = Easing.out(Easing.cubic);

/**
 * A new piece of content arriving in place — a search result, a freshly
 * loaded card, a status line. Soft fade + a few px of upward drift so
 * the eye registers "this is new" without a bounce.
 */
export const enter = FadeInDown.duration(DURATION.base).easing(EASE);

/** Pure fade for content that shouldn't move (overlays, captions). */
export const enterFade = FadeIn.duration(DURATION.base).easing(EASE);

/** Matching exit for removed content. */
export const exitFade = FadeOut.duration(DURATION.fast).easing(EASE);

/**
 * Staggered entrance for list items. Apply as
 * `entering={enterStagger(index)}`. The per-item delay is capped so a
 * long list never makes the user wait on a slow cascade — after the
 * first handful everything lands together.
 */
export const enterStagger = (index: number) =>
  FadeInDown.duration(DURATION.base)
    .easing(EASE)
    .delay(Math.min(index, 6) * 45);

/**
 * Smooth reflow when a list reorders / items insert or remove. Use as
 * `layout={LAYOUT}` on animated rows so neighbours glide to their new
 * position instead of teleporting.
 */
export const LAYOUT = LinearTransition.duration(DURATION.base).easing(EASE);
