"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MusicIcon } from "./icons";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) {
      setError("Please provide a name for your room.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create room");
      }

      onClose();
      router.push(`/room/${data.room.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong while creating the room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md bg-[#FAFAF8] border border-[#E7E7E2] rounded-lg shadow-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E7E7E2] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6D7552]" />
            <h3 className="text-base font-semibold text-[#20201E]">Create Your Music Room</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#777772] hover:text-[#20201E] px-2 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[#777772]">
          Name your private room before launching. Your room is private by default—share the unique Room ID or link with friends so they can queue songs and vote.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#20201E] uppercase tracking-wider">
              Room Name
            </label>
            <input
              type="text"
              placeholder="e.g. Prithvi's Vibe Lounge, Friday Night House..."
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                if (error) setError(null);
              }}
              maxLength={60}
              className="w-full bg-[#FFFFFF] border border-[#E7E7E2] focus:border-[#6D7552] text-sm text-[#20201E] px-3 py-2 rounded-md outline-none"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-[#B23B3B] bg-[#FDEDED] px-2.5 py-1.5 rounded">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E7E2]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-[#777772] hover:text-[#20201E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !roomName.trim()}
              className="bg-[#6D7552] hover:bg-[#5B6344] disabled:opacity-40 text-white px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              {loading ? "Creating..." : "Launch Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
