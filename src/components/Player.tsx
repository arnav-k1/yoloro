"use client";

import { useEffect, useRef } from "react";
import { loadYouTubeIframeApi } from "@/lib/ytIframeLoader";

interface PlayerProps {
  videoId: string;
  muted: boolean;
  paused: boolean;
  onEnded: () => void;
  onError: () => void;
}

export function Player({ videoId, muted, paused, onEnded, onError }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
  }, [onEnded, onError]);

  useEffect(() => {
    const container = containerRef.current;
    let cancelled = false;
    let player: YT.Player | undefined;

    loadYouTubeIframeApi().then((YTNamespace) => {
      if (cancelled || !container) return;
      // The IFrame API replaces its target node in place, which conflicts with React's
      // reconciliation if we hand it the ref'd div directly. Give it a plain child instead.
      const mountNode = document.createElement("div");
      mountNode.className = "h-full w-full";
      container.appendChild(mountNode);
      player = new YTNamespace.Player(mountNode, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: muted ? 1 : 0,
          // Controls are disabled and the iframe is click-through (see page.tsx): this is a
          // "remote control" UI — you never touch the screen, only keyboard/swipe/OSD. That
          // also sidesteps a real bug where clicking into the cross-origin iframe steals
          // keyboard focus permanently, since key events inside it can't bubble to our window
          // listener at all.
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
        } as YT.PlayerVars,
        events: {
          onStateChange: (e) => {
            if (e.data === YTNamespace.PlayerState.ENDED) onEndedRef.current();
          },
          onReady: (e) => {
            if (muted) e.target.mute();
            else e.target.unMute();
          },
          onError: () => onErrorRef.current(),
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      player?.destroy?.();
      playerRef.current = null;
      container?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) p.mute();
    else p.unMute();
  }, [muted]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (paused) p.pauseVideo();
    else p.playVideo();
  }, [paused]);

  return <div className="yoloro-player-cover h-full w-full" ref={containerRef} />;
}
