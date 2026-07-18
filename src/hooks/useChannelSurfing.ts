"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Channel, VideoItem } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";

interface ChannelQueue {
  videos: VideoItem[];
  seen: Set<string>;
  cursor: number;
}

function buildQueryParams(channel: Channel): { kind: string; query: string } {
  if (channel.source.kind === "random") return { kind: "random", query: "" };
  if (channel.source.kind === "creator") return { kind: "creator", query: channel.source.query };
  return { kind: "topic", query: channel.source.query };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useChannelSurfing() {
  const { channels, autoAdvance, intervalSeconds } = useSettings();
  const [channelIndex, setChannelIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(intervalSeconds);
  const [flipToken, setFlipToken] = useState(0);

  const queuesRef = useRef<Map<string, ChannelQueue>>(new Map());
  const safeChannelIndex = Math.min(channelIndex, Math.max(0, channels.length - 1));
  const channel = channels[safeChannelIndex];
  const loadTokenRef = useRef(0);

  const ensureQueue = useCallback(async (ch: Channel): Promise<ChannelQueue> => {
    const existing = queuesRef.current.get(ch.id);
    if (existing && existing.cursor < existing.videos.length) return existing;

    const { kind, query } = buildQueryParams(ch);
    const params = new URLSearchParams({ kind, query });
    const res = await fetch(`/api/videos?${params.toString()}`);
    const data = await res.json();
    setDemo(Boolean(data.demo));

    const seen = existing?.seen ?? new Set<string>();
    const fresh: VideoItem[] = shuffle((data.videos ?? []) as VideoItem[]);
    const reordered = [...fresh.filter((v) => !seen.has(v.id)), ...fresh.filter((v) => seen.has(v.id))];
    const queue: ChannelQueue = { videos: reordered.length ? reordered : fresh, seen, cursor: 0 };
    queuesRef.current.set(ch.id, queue);
    return queue;
  }, []);

  const loadChannel = useCallback(
    async (ch: Channel) => {
      const token = ++loadTokenRef.current;
      setLoading(true);
      const queue = await ensureQueue(ch);
      if (token !== loadTokenRef.current) return;

      const video = queue.videos[queue.cursor] ?? null;
      queue.cursor += 1;
      if (video) queue.seen.add(video.id);

      setCurrentVideo(video);
      setLoading(false);
      setTimeLeft(intervalSeconds);
      setFlipToken((t) => t + 1);
    },
    [ensureQueue, intervalSeconds]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch + swap the video whenever the active channel changes
    if (channel) loadChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id]);

  const next = useCallback(() => {
    setChannelIndex((i) => (channels.length ? (i + 1) % channels.length : 0));
  }, [channels.length]);

  const prev = useCallback(() => {
    setChannelIndex((i) => (channels.length ? (i - 1 + channels.length) % channels.length : 0));
  }, [channels.length]);

  const reroll = useCallback(() => {
    if (channel) loadChannel(channel);
  }, [channel, loadChannel]);

  const togglePaused = useCallback(() => setPaused((p) => !p), []);

  const onVideoEnded = useCallback(() => {
    if (autoAdvance) next();
    else reroll();
  }, [autoAdvance, next, reroll]);

  // Auto-advance countdown ticker.
  useEffect(() => {
    if (!autoAdvance || paused) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          next();
          return intervalSeconds;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoAdvance, paused, intervalSeconds, next]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the countdown when the channel or interval changes
    setTimeLeft(intervalSeconds);
  }, [channel?.id, intervalSeconds]);

  return {
    channel,
    channelIndex: safeChannelIndex,
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
  };
}
