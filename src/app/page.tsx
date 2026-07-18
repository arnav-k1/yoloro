"use client";

import { useEffect, useRef, useState } from "react";
import { Player } from "@/components/Player";
import { Osd } from "@/components/Osd";
import { StaticTransition } from "@/components/StaticTransition";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useSettings } from "@/context/SettingsContext";
import { useChannelSurfing } from "@/hooks/useChannelSurfing";

export default function Home() {
  const { style, muted, autoAdvance, intervalSeconds, hydrated } = useSettings();
  const {
    channel,
    channelIndex,
    currentVideo,
    loading,
    demo,
    paused,
    timeLeft,
    flipToken,
    next,
    prev,
    reroll,
    togglePaused,
    onVideoEnded,
  } = useChannelSurfing();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowRight") next();
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") prev();
      else if (e.key === " " || e.key === "Spacebar") togglePaused();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, togglePaused, settingsOpen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) next();
    else prev();
  };

  if (!hydrated) {
    return <div className="h-screen w-screen bg-black" />;
  }

  return (
    <main
      className={`relative h-screen w-screen overflow-hidden bg-black ${
        style === "retro" ? "crt-scanlines crt-vignette" : ""
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {currentVideo && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <Player
            key={currentVideo.id}
            videoId={currentVideo.id}
            muted={muted}
            paused={paused}
            onEnded={onVideoEnded}
            onError={reroll}
          />
        </div>
      )}

      {(loading || !currentVideo) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-white/60">
          Tuning in…
        </div>
      )}

      <StaticTransition flipToken={flipToken} />

      <Osd
        channelNumber={channelIndex}
        channelLabel={channel?.label ?? ""}
        video={currentVideo}
        demo={demo}
        autoAdvance={autoAdvance}
        timeLeft={timeLeft}
        intervalSeconds={intervalSeconds}
        paused={paused}
        loading={loading}
        style={style}
        flipToken={flipToken}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
        <p className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/50">
          ↑/↓ change channel · space pause
        </p>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
