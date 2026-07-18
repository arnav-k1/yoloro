"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { PRESET_CHANNELS } from "@/lib/presets";
import { Channel } from "@/lib/types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    autoAdvance,
    intervalSeconds,
    style,
    muted,
    channels,
    setAutoAdvance,
    setIntervalSeconds,
    setStyle,
    setMuted,
    addChannel,
    removeChannel,
  } = useSettings();

  const [customKind, setCustomKind] = useState<"topic" | "creator">("topic");
  const [customValue, setCustomValue] = useState("");

  if (!open) return null;

  const activeIds = new Set(channels.map((c) => c.id));
  const availablePresets = PRESET_CHANNELS.filter((c) => !activeIds.has(c.id));

  const submitCustom = () => {
    const value = customValue.trim();
    if (!value) return;
    const channel: Channel = {
      id: `${customKind}:${value.toLowerCase()}`,
      label: value,
      source: { kind: customKind, query: value },
    };
    addChannel(channel);
    setCustomValue("");
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-neutral-900 p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">yoloro settings</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <section className="mb-6">
          <div className="flex items-center justify-between">
            <label htmlFor="auto-advance-toggle" className="text-sm font-medium">
              Auto-advance channels
            </label>
            <Toggle id="auto-advance-toggle" checked={autoAdvance} onChange={setAutoAdvance} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={3}
              max={120}
              value={intervalSeconds}
              disabled={!autoAdvance}
              onChange={(e) => setIntervalSeconds(Number(e.target.value))}
              className="w-full accent-lime-400 disabled:opacity-40"
            />
            <span className="w-14 shrink-0 text-right text-sm tabular-nums text-white/70">
              {intervalSeconds}s
            </span>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Muted</span>
            <Toggle checked={muted} onChange={setMuted} />
          </div>
        </section>

        <section className="mb-6">
          <span className="mb-2 block text-sm font-medium">Visual style</span>
          <div className="flex gap-2">
            <button
              onClick={() => setStyle("retro")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                style === "retro" ? "bg-lime-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Retro CRT
            </button>
            <button
              onClick={() => setStyle("modern")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                style === "modern" ? "bg-blue-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Modern
            </button>
          </div>
        </section>

        <section className="mb-6">
          <span className="mb-2 block text-sm font-medium">Your channel lineup</span>
          <ul className="space-y-1.5">
            {channels.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-sm"
              >
                <span>
                  <span className="mr-2 text-white/40 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {c.label}
                </span>
                {channels.length > 1 && (
                  <button
                    onClick={() => removeChannel(c.id)}
                    className="text-white/40 hover:text-red-400"
                    aria-label={`Remove ${c.label}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {availablePresets.length > 0 && (
          <section className="mb-6">
            <span className="mb-2 block text-sm font-medium">Quick add</span>
            <div className="flex flex-wrap gap-2">
              {availablePresets.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addChannel(c)}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20"
                >
                  + {c.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <span className="mb-2 block text-sm font-medium">Add a custom channel</span>
          <div className="mb-2 flex gap-2 text-xs">
            <button
              onClick={() => setCustomKind("topic")}
              className={`rounded-md px-2 py-1 ${
                customKind === "topic" ? "bg-white/20" : "bg-white/5 text-white/50"
              }`}
            >
              Topic
            </button>
            <button
              onClick={() => setCustomKind("creator")}
              className={`rounded-md px-2 py-1 ${
                customKind === "creator" ? "bg-white/20" : "bg-white/5 text-white/50"
              }`}
            >
              Creator
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCustom()}
              placeholder={customKind === "topic" ? "e.g. space documentaries" : "e.g. @mkbhd"}
              className="flex-1 rounded-md bg-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              onClick={submitCustom}
              className="rounded-md bg-lime-500 px-3 py-2 text-sm font-medium text-black hover:bg-lime-400"
            >
              Add
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-lime-500" : "bg-white/20"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
