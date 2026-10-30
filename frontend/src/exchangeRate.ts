/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from "react";

// Falls back to this static rate if the live API is unreachable (offline, rate-limited, etc.)
// so currency conversion never breaks - it just stops updating.
const FALLBACK_RATE = 16000;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // hourly - forex doesn't need second-by-second updates

let currentRate = FALLBACK_RATE;
let lastUpdated: Date | null = null;
let isLive = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function fetchLiveRate() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) return;
    const data = await res.json();
    const idrRate = data?.rates?.IDR;
    if (typeof idrRate === "number" && idrRate > 0) {
      currentRate = idrRate;
      lastUpdated = new Date();
      isLive = true;
      notify();
    }
  } catch {
    // Network/API failure - silently keep using the last known (or fallback) rate.
  }
}

let initialized = false;
export function initExchangeRate() {
  if (initialized) return;
  initialized = true;
  fetchLiveRate();
  setInterval(fetchLiveRate, REFRESH_INTERVAL_MS);
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return currentRate;
}

/** Live USD -> IDR rate (1 USD = N IDR), refreshed hourly from a public exchange-rate API.
 * Re-renders the calling component automatically when the rate updates. */
export function useExchangeRate(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** For display next to the currency toggle - whether the current rate is live-fetched data or
 * still the static fallback, and when it was last refreshed. */
export function useExchangeRateMeta(): { isLive: boolean; lastUpdated: Date | null } {
  useSyncExternalStore(subscribe, getSnapshot); // subscribe so this re-renders on updates too
  return { isLive, lastUpdated };
}
