"use client";

import { useEffect, useRef, useState } from "react";
import { StreamItem } from "./QueueItem";
import { PlayIcon, PauseIcon, SkipForwardIcon, ExternalLinkIcon } from "./icons";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

interface NowPlayingProps {
  stream: StreamItem | null;
  isOwner?: boolean;
  onNext?: () => void;
  isSkipping?: boolean;
}

export function NowPlaying({
  stream,
  isOwner = false,
  onNext,
  isSkipping = false,
}: NowPlayingProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const ytPlayerRef = useRef<any>(null);
  const onNextRef = useRef(onNext);

  // Keep latest onNext in ref to prevent stale closures
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or update YouTube Player when stream changes
  useEffect(() => {
    if (!isOwner || !stream?.extractedId) return;

    let destroyed = false;

    const initPlayer = () => {
      if (destroyed || !window.YT || !window.YT.Player) return;

      const container = document.getElementById("youtube-player-container");
      if (!container) return;

      // If player already exists, load the new video directly
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
        try {
          ytPlayerRef.current.loadVideoById(stream.extractedId);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          return;
        } catch (e) {
          console.warn("Failed to loadVideoById, re-instantiating player:", e);
        }
      }

      // Clear previous container content before new instance
      container.innerHTML = '<div id="yt-player-target"></div>';

      try {
        ytPlayerRef.current = new window.YT.Player("yt-player-target", {
          videoId: stream.extractedId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            origin: typeof window !== "undefined" ? window.location.origin : "",
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event: any) => {
              try {
                event.target.playVideo();
                setIsPlaying(true);
              } catch (err) {
                console.error("Autoplay blocked or ready error:", err);
              }
            },
            onStateChange: (event: any) => {
              // event.data === 0 is YT.PlayerState.ENDED
              if (event.data === 0) {
                console.log("Song finished! Auto-advancing to next song from queue...");
                onNextRef.current?.();
              } else if (event.data === 1) {
                // PLAYING
                setIsPlaying(true);
              } else if (event.data === 2) {
                // PAUSED
                setIsPlaying(false);
              }
            },
          },
        });
      } catch (err) {
        console.error("Error creating YouTube player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initPlayer();
      };
    }

    return () => {
      destroyed = true;
    };
  }, [isOwner, stream?.extractedId]);

  // Secondary Fallback: postMessage listener for YouTube iframe ENDED event
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        // YouTube Player postMessage event when song ends:
        if (
          (data?.event === "onStateChange" && data?.info === 0) ||
          data?.info?.playerState === 0
        ) {
          console.log("YouTube song ended (postMessage event). Auto-playing next...");
          onNextRef.current?.();
        }
      } catch {
        // Not a JSON message, ignore
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const togglePlayPause = () => {
    if (ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
        return;
      } catch (e) {
        console.warn("Player toggle failed:", e);
      }
    }
    setIsPlaying(!isPlaying);
  };

  if (!stream) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg p-5 text-center">
        <div className="w-8 h-8 rounded-full bg-[#F0F0EB] text-[#777772] flex items-center justify-center mx-auto mb-2 text-xs">
          ♪
        </div>
        <p className="text-sm font-medium text-[#20201E]">Nothing playing right now</p>
        <p className="text-xs text-[#777772] mt-0.5">
          {isOwner
            ? "Click 'Start Autoplay Session' below to play the crowd's top-voted song."
            : "Add songs below to get the queue rolling."}
        </p>
        {isOwner && onNext && (
          <button
            onClick={onNext}
            disabled={isSkipping}
            className="mt-3 inline-flex items-center gap-1.5 bg-[#6D7552] hover:bg-[#5B6344] text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <PlayIcon className="w-3.5 h-3.5" />
            <span>Start Autoplay Session</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg p-4 sm:p-5 space-y-4">
      {/* Header bar: Status indicator & external link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6D7552] animate-pulse-subtle" />
          <span className="text-[11px] font-mono tracking-wider uppercase text-[#6D7552] font-semibold">
            Now Playing
          </span>
          <span className="text-[10px] font-mono uppercase bg-[#F2F4EC] text-[#6D7552] px-1.5 py-0.5 rounded">
            {isOwner ? "Host Broadcast Active" : "Host Broadcast"}
          </span>
        </div>

        <a
          href={stream.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#777772] hover:text-[#20201E] inline-flex items-center gap-1 transition-colors"
          title="Open video on YouTube"
        >
          <span>YouTube</span>
          <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>

      {/* Song details */}
      <div className="flex items-start gap-4">
        {/* Artwork */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-[#E7E7E2] shrink-0 border border-[#E7E7E2]">
          {stream.bigImg || stream.smallImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stream.bigImg || stream.smallImg}
              alt={stream.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-[#777772]">
              ♪
            </div>
          )}
        </div>

        {/* Title and artist */}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-semibold text-[#20201E] line-clamp-2 leading-snug">
            {stream.title}
          </h2>
          <p className="text-xs text-[#777772] mt-1 line-clamp-1">
            {stream.description || "Playing live from the crowd queue"}
          </p>
        </div>
      </div>

      {/* Owner Player & Controls (Embed only active for owner to drive audio playback) */}
      {isOwner ? (
        <div className="pt-3 border-t border-[#E7E7E2] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#777772] font-medium">
              Host Continuous Playback Controls
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-[#E7E7E2] rounded-md hover:bg-[#F0F0EB] text-[#20201E] transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <PauseIcon className="w-3 h-3 text-[#6D7552]" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-3 h-3 text-[#6D7552]" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {onNext && (
                <button
                  onClick={onNext}
                  disabled={isSkipping}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-[#20201E] hover:bg-[#333330] text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <SkipForwardIcon className="w-3 h-3" />
                  <span>{isSkipping ? "Skipping..." : "Play Next"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated YouTube Player Container for automated continuous playback */}
          <div
            id="youtube-player-container"
            className="relative w-full aspect-video rounded-md overflow-hidden bg-black border border-[#E7E7E2]"
          />
        </div>
      ) : (
        <div className="pt-3 border-t border-[#E7E7E2] flex items-center justify-between text-xs text-[#777772]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D7552]" />
            Host controls audio broadcast
          </span>
          <span className="text-[11px] font-mono text-[#6D7552]">
            Upvote below to decide next track
          </span>
        </div>
      )}
    </div>
  );
}
