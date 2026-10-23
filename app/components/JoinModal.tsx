"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "./icons";

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinModal({ isOpen, onClose }: JoinModalProps) {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const extractRoomId = (rawInput: string): string => {
    const trimmed = rawInput.trim();
    if (!trimmed) return "";

    // If a full URL was pasted (e.g. https://domain.com/room/abc-123 or /room/abc-123)
    try {
      if (trimmed.includes("/room/")) {
        const parts = trimmed.split("/room/");
        const afterRoom = parts[1]?.split(/[?#]/)[0];
        if (afterRoom) return afterRoom.trim();
      }
    } catch {
      // fallback to trimmed
    }
    return trimmed;
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const targetId = extractRoomId(roomIdInput);
    if (!targetId) {
      setErrorMessage("Please enter a Room ID or invite link.");
      return;
    }

    setIsChecking(true);
    try {
      const res = await fetch(`/api/rooms?id=${encodeURIComponent(targetId)}`);
      const data = await res.json();

      if (!res.ok || !data.exists) {
        setErrorMessage("Private room not found. Please verify the ID with your host.");
        setIsChecking(false);
        return;
      }

      onClose();
      router.push(`/room/${targetId}`);
    } catch (err) {
      console.error("Room verification failed:", err);
      // Fallback: route directly if network check fails
      onClose();
      router.push(`/room/${targetId}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FAFAF8] border border-[#E7E7E2] rounded-lg shadow-lg p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E7E7E2] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6D7552]" />
              <h3 className="text-base font-semibold text-[#20201E]">Join Private Room</h3>
            </div>
            <p className="text-xs text-[#777772] mt-0.5">
              Enter the unique Room ID or link shared by the host.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#777772] hover:text-[#20201E] px-2 py-1 rounded cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#777772] block mb-1.5">
              Private Room ID or Share Link
            </label>
            <input
              type="text"
              placeholder="e.g. 5d13ef2b-... or paste full URL"
              value={roomIdInput}
              onChange={(e) => {
                setRoomIdInput(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              className="w-full bg-[#FFFFFF] border border-[#E7E7E2] focus:border-[#6D7552] text-sm text-[#20201E] px-3 py-2 rounded-md outline-none transition-colors"
              autoFocus
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-[#B23B3B] bg-[#FDEDED] border border-[#F5C2C2] px-3 py-1.5 rounded-md">
              {errorMessage}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-[#777772] hover:text-[#20201E] rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChecking || !roomIdInput.trim()}
              className="inline-flex items-center gap-1.5 bg-[#20201E] hover:bg-[#333330] disabled:opacity-40 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <span>{isChecking ? "Verifying..." : "Join Room"}</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-[#E7E7E2] text-[11px] text-[#777772] leading-relaxed">
          <span className="font-semibold text-[#20201E]">🔒 Private by default:</span> Muzer rooms
          are accessible only via explicit Room ID or invitation links. Ask the host for their invite
          link to join.
        </div>
      </div>
    </div>
  );
}

