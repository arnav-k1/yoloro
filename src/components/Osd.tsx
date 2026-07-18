"use client";

import { useEffect, useRef, useState } from "react";
import { VideoItem, VisualStyle } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";

interface OsdProps {
  channelNumber: number;
  channelLabel: string;
  video: VideoItem | null;
  demo: boolean;
  autoAdvance: boolean;
  timeLeft: number;
  intervalSeconds: number;
  paused: boolean;
  loading: boolean;
  style: VisualStyle;
  flipToken: number;
  onOpenSettings: () => void;
}

export function Osd({
  channelNumber,
  channelLabel,
  video,
  demo,
  autoAdvance,
  timeLeft,
  intervalSeconds,
  paused,
  loading,
  style,
  flipToken,
  onOpenSettings,
}: OsdProps) {
  const { muted, setMuted } = useSettings();
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);

  const wake = () => {
    setVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), 4500);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset OSD visibility whenever the channel flips
    wake();
    return () => window.clearTimeout(hideTimer.current);
  }, [flipToken]);

  useEffect(() => {
    const handler = () => wake();
    window.addEventListener("keydown", handler);
    window.addEventListener("pointerdown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("pointerdown", handler);
    };
  }, []);

  const progress = autoAdvance ? Math.max(0, Math.min(1, timeLeft / intervalSeconds)) : 0;
  const retro = style === "retro";

  return (
    <>
      <button
        onClick={() => setMuted(!muted)}
        className="absolute top-4 right-16 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <MutedIcon /> : <VolumeIcon />}
      </button>

      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        aria-label="Settings"
      >
        <GearIcon />
      </button>

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`flex items-baseline gap-2 rounded-md px-3 py-1.5 ${
            retro
              ? "border border-lime-400/60 bg-black/70 font-mono text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.35)]"
              : "bg-black/60 text-white backdrop-blur-sm"
          }`}
        >
          <span className={retro ? "text-2xl font-bold tabular-nums" : "text-lg font-semibold"}>
            CH {String(channelNumber + 1).padStart(2, "0")}
          </span>
          <span className={retro ? "text-sm uppercase tracking-wide" : "text-sm text-white/70"}>
            {channelLabel}
          </span>
        </div>

        {demo && (
          <div className="pointer-events-auto rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-black shadow">
            Demo mode — add a YOUTUBE_API_KEY for live videos
          </div>
        )}
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`pointer-events-auto max-w-md rounded-lg p-4 ${
            retro
              ? "border border-lime-400/50 bg-black/75 font-mono text-lime-200 shadow-[0_0_16px_rgba(163,230,53,0.25)]"
              : "bg-black/60 text-white backdrop-blur-md"
          }`}
        >
          {loading || !video ? (
            <p className="text-sm opacity-70">Tuning in…</p>
          ) : (
            <>
              <p className="line-clamp-2 text-base font-semibold">{video.title}</p>
              <p className={`mt-1 text-sm ${retro ? "opacity-80" : "text-white/70"}`}>
                {video.channelTitle}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`text-sm font-medium underline underline-offset-2 ${
                    retro ? "text-lime-300 hover:text-lime-100" : "text-blue-300 hover:text-blue-200"
                  }`}
                >
                  Watch on YouTube ↗
                </a>
                {autoAdvance && (
                  <span className="flex items-center gap-1 text-xs opacity-70">
                    {paused ? "paused" : `next in ${timeLeft}s`}
                  </span>
                )}
              </div>
              {autoAdvance && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                      retro ? "bg-lime-400" : "bg-blue-400"
                    }`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6a9 9 0 010 12" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m16 9 5 6m0-6-5 6" />
    </svg>
  );
}
