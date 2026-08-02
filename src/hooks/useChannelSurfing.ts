"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Channel, VideoItem } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";

interface ChannelQueue {
  videos: VideoItem[];
  seen: Set<string>;
  cursor: number;
}

function buildQueryParams(channel: Channel): { kind: string; query: string; categoryId?: string } {
  if (channel.source.kind === "random") return { kind: "random", query: "" };
  if (channel.source.kind === "creator") return { kind: "creator", query: channel.source.query };
  return { kind: "topic", query: channel.source.query, categoryId: channel.source.categoryId };
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
  const { channels, autoAdvance, intervalSeconds, viewFilter, includeShorts, durationFilter, excludeKeywords } =
    useSettings();
  const [channelIndex, setChannelIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(intervalSeconds);
  const [flipToken, setFlipToken] = useState(0);
  // Bumped on every next()/prev(), independent of whether the resulting channel id actually
  // changes — with a single-channel lineup, index cycles 0 -> 0 and channel.id never changes,
  // so relying on channel?.id alone would make arrow keys do nothing.
  const [surfToken, setSurfToken] = useState(0);

  const queuesRef = useRef<Map<string, ChannelQueue>>(new Map());
  const safeChannelIndex = Math.min(channelIndex, Math.max(0, channels.length - 1));
  const channel = channels[safeChannelIndex];
  const loadTokenRef = useRef(0);

  const ensureQueue = useCallback(
    async (ch: Channel): Promise<ChannelQueue> => {
      // Keying the cache on the filters too means changing any of them naturally fetches a
      // fresh queue instead of continuing to serve videos picked under the old settings.
      const filterKey = [
        viewFilter.enabled ? `v${viewFilter.min}-${viewFilter.max}` : "v-",
        includeShorts ? "shorts" : "noshorts",
        durationFilter.enabled ? `max${durationFilter.maxMinutes}` : "nomax",
        excludeKeywords.length > 0 ? `ex${excludeKeywords.join(",")}` : "ex-",
      ].join("|");
      const cacheKey = `${ch.id}::${filterKey}`;
      const existing = queuesRef.current.get(cacheKey);
      if (existing && existing.cursor < existing.videos.length) return existing;

      const { kind, query, categoryId } = buildQueryParams(ch);
      const params = new URLSearchParams({ kind, query });
      if (categoryId) params.set("categoryId", categoryId);
      if (viewFilter.enabled) {
        params.set("viewMin", String(viewFilter.min));
        params.set("viewMax", String(viewFilter.max));
      }
      params.set("includeShorts", String(includeShorts));
      if (durationFilter.enabled) {
        params.set("maxDurationMinutes", String(durationFilter.maxMinutes));
      }
      if (excludeKeywords.length > 0) {
        params.set("exclude", excludeKeywords.join(","));
      }
      const res = await fetch(`/api/videos?${params.toString()}`);
      const data = await res.json();
      setDemo(Boolean(data.demo));

      const priorSeen = existing?.seen ?? new Set<string>();
      const fresh: VideoItem[] = shuffle((data.videos ?? []) as VideoItem[]);
      const unseen = fresh.filter((v) => !priorSeen.has(v.id));
      // If every candidate in this batch has already been shown, the pool is exhausted (common
      // for trending-chart channels, which barely change between fetches) — start a fresh
      // "seen" cycle instead of front-loading a queue that's 100% repeats from the first video.
      const seen = unseen.length > 0 ? priorSeen : new Set<string>();
      const videos = unseen.length > 0 ? [...unseen, ...fresh.filter((v) => priorSeen.has(v.id))] : fresh;
      const queue: ChannelQueue = { videos, seen, cursor: 0 };
      queuesRef.current.set(cacheKey, queue);
      return queue;
    },
    [
      viewFilter.enabled,
      viewFilter.min,
      viewFilter.max,
      includeShorts,
      durationFilter.enabled,
      durationFilter.maxMinutes,
      excludeKeywords,
    ]
  );

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch + swap the video whenever the active channel or a filter changes
    if (channel) loadChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    channel?.id,
    surfToken,
    viewFilter.enabled,
    viewFilter.min,
    viewFilter.max,
    includeShorts,
    durationFilter.enabled,
    durationFilter.maxMinutes,
    excludeKeywords,
  ]);

  const next = useCallback(() => {
    setChannelIndex((i) => (channels.length ? (i + 1) % channels.length : 0));
    setSurfToken((t) => t + 1);
  }, [channels.length]);

  const prev = useCallback(() => {
    setChannelIndex((i) => (channels.length ? (i - 1 + channels.length) % channels.length : 0));
    setSurfToken((t) => t + 1);
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
