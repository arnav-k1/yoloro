"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Channel, Settings, VisualStyle } from "@/lib/types";
import { defaultSettingsChannels } from "@/lib/presets";

const STORAGE_KEY = "yoloro:settings";

const DEFAULT_SETTINGS: Settings = {
  autoAdvance: true,
  intervalSeconds: 15,
  style: "retro",
  muted: true,
  channels: defaultSettingsChannels(),
  viewFilter: { enabled: true, min: 30_000, max: 2_000_000 },
};

interface SettingsContextValue extends Settings {
  setAutoAdvance: (value: boolean) => void;
  setIntervalSeconds: (value: number) => void;
  setStyle: (value: VisualStyle) => void;
  setMuted: (value: boolean) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (id: string) => void;
  setViewFilterEnabled: (value: boolean) => void;
  setViewMin: (value: number) => void;
  setViewMax: (value: number) => void;
  hydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          channels:
            parsed.channels && parsed.channels.length > 0
              ? parsed.channels
              : prev.channels,
        }));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  const setAutoAdvance = useCallback((value: boolean) => {
    setSettings((s) => ({ ...s, autoAdvance: value }));
  }, []);

  const setIntervalSeconds = useCallback((value: number) => {
    setSettings((s) => ({ ...s, intervalSeconds: Math.min(120, Math.max(3, value)) }));
  }, []);

  const setStyle = useCallback((value: VisualStyle) => {
    setSettings((s) => ({ ...s, style: value }));
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setSettings((s) => ({ ...s, muted: value }));
  }, []);

  const addChannel = useCallback((channel: Channel) => {
    setSettings((s) => {
      if (s.channels.some((c) => c.id === channel.id)) return s;
      return { ...s, channels: [...s.channels, channel] };
    });
  }, []);

  const removeChannel = useCallback((id: string) => {
    setSettings((s) => {
      if (s.channels.length <= 1) return s;
      return { ...s, channels: s.channels.filter((c) => c.id !== id) };
    });
  }, []);

  const setViewFilterEnabled = useCallback((value: boolean) => {
    setSettings((s) => ({ ...s, viewFilter: { ...s.viewFilter, enabled: value } }));
  }, []);

  const setViewMin = useCallback((value: number) => {
    setSettings((s) => {
      const min = Math.max(0, value);
      return { ...s, viewFilter: { ...s.viewFilter, min, max: Math.max(min, s.viewFilter.max) } };
    });
  }, []);

  const setViewMax = useCallback((value: number) => {
    setSettings((s) => {
      const max = Math.max(0, value);
      return { ...s, viewFilter: { ...s.viewFilter, max, min: Math.min(max, s.viewFilter.min) } };
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setAutoAdvance,
      setIntervalSeconds,
      setStyle,
      setMuted,
      addChannel,
      removeChannel,
      setViewFilterEnabled,
      setViewMin,
      setViewMax,
      hydrated,
    }),
    [
      settings,
      setAutoAdvance,
      setIntervalSeconds,
      setStyle,
      setMuted,
      addChannel,
      removeChannel,
      setViewFilterEnabled,
      setViewMin,
      setViewMax,
      hydrated,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
