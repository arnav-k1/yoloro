export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));

  const w = window as unknown as { YT?: typeof YT; __ytApiPromise?: Promise<typeof YT> };
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (w.__ytApiPromise) return w.__ytApiPromise;

  w.__ytApiPromise = new Promise((resolve) => {
    const prevCallback = (window as unknown as { onYouTubeIframeAPIReady?: () => void })
      .onYouTubeIframeAPIReady;
    (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve((window as unknown as { YT: typeof YT }).YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return w.__ytApiPromise;
}
