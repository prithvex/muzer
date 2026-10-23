"use client";

import { useState } from "react";
import { SearchIcon, PlusIcon, CheckIcon } from "./icons";

interface SongSearchProps {
  creatorId: string;
  onSongAdded: () => void;
}

export function SongSearch({ creatorId, onSongAdded }: SongSearchProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          url: cleanUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add song");
      }

      setUrl("");
      setStatusMessage({
        text: "Song added to queue",
        type: "success",
      });
      onSongAdded();

      setTimeout(() => {
        setStatusMessage(null);
      }, 3500);
    } catch (err: any) {
      setStatusMessage({
        text: err.message || "Could not add song. Check the YouTube link.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="song-input"
          className="text-xs font-semibold text-[#20201E] uppercase tracking-wider"
        >
          Add a Song
        </label>
        <span className="text-[11px] text-[#777772]">YouTube URL supported</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777772]">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            id="song-input"
            type="url"
            placeholder="Paste YouTube watch or share link..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="w-full bg-[#FAFAF8] border border-[#E7E7E2] focus:border-[#6D7552] focus:bg-[#FFFFFF] text-sm text-[#20201E] placeholder-[#777772] pl-9 pr-3 py-2 rounded-md outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-[#6D7552] hover:bg-[#5B6344] disabled:opacity-40 text-[#FFFFFF] px-3.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
        >
          {loading ? (
            <span className="animate-spin text-xs">⏳</span>
          ) : (
            <PlusIcon className="w-3.5 h-3.5" />
          )}
          <span>{loading ? "Adding..." : "Add to Queue"}</span>
        </button>
      </form>

      {/* Small inline feedback */}
      {statusMessage && (
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded ${
            statusMessage.type === "success"
              ? "bg-[#F2F4EC] text-[#6D7552]"
              : "bg-[#FDEDED] text-[#B23B3B]"
          }`}
        >
          {statusMessage.type === "success" && <CheckIcon className="w-3 h-3" />}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
