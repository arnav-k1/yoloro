"use client";

import { useEffect, useState } from "react";
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
    viewFilter,
    includeShorts,
    durationFilter,
    setAutoAdvance,
    setIntervalSeconds,
    setStyle,
    setMuted,
    addChannel,
    removeChannel,
    setViewFilterEnabled,
    setViewMin,
    setViewMax,
    setIncludeShorts,
    setDurationFilterEnabled,
    setMaxDurationMinutes,
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
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filter by view count</span>
            <Toggle checked={viewFilter.enabled} onChange={setViewFilterEnabled} />
          </div>
          <div className={`mt-3 grid grid-cols-2 gap-3 ${!viewFilter.enabled ? "opacity-40" : ""}`}>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Min views</span>
              <NumberField
                value={viewFilter.min}
                disabled={!viewFilter.enabled}
                onCommit={setViewMin}
              />
              <span className="mt-1 block text-xs text-white/40">{formatViews(viewFilter.min)}</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Max views</span>
              <NumberField
                value={viewFilter.max}
                disabled={!viewFilter.enabled}
                onCommit={setViewMax}
              />
              <span className="mt-1 block text-xs text-white/40">{formatViews(viewFilter.max)}</span>
            </label>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Include YouTube Shorts</span>
            <Toggle checked={includeShorts} onChange={setIncludeShorts} />
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Limit max video length</span>
            <Toggle checked={durationFilter.enabled} onChange={setDurationFilterEnabled} />
          </div>
          <div className={`mt-3 flex items-center gap-3 ${!durationFilter.enabled ? "opacity-40" : ""}`}>
            <input
              type="range"
              min={1}
              max={240}
              value={durationFilter.maxMinutes}
              disabled={!durationFilter.enabled}
              onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
              className="w-full accent-lime-400 disabled:opacity-40"
            />
            <span className="w-16 shrink-0 text-right text-sm tabular-nums text-white/70">
              {formatMinutes(durationFilter.maxMinutes)}
            </span>
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

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K views`;
  return `${n} views`;
}

function formatMinutes(n: number): string {
  if (n < 60) return `${n}m`;
  const hours = Math.floor(n / 60);
  const minutes = n % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes}m`;
}

/** A number input that buffers raw text while focused instead of round-tripping every
 *  keystroke through the committed numeric value — otherwise clearing the field to type a new
 *  number snaps to 0 mid-edit (`Number("") || 0`) and corrupts whatever you type next. */
function NumberField({
  value,
  onCommit,
  disabled,
}: {
  value: number;
  onCommit: (n: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync the local text buffer from the committed value, but only while not actively editing
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const n = Number(text);
    onCommit(Number.isFinite(n) && text.trim() !== "" ? n : value);
  };

  return (
    <input
      type="number"
      min={0}
      step={1000}
      value={text}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full rounded-md bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:cursor-not-allowed"
    />
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
