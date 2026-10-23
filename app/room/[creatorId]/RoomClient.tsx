"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/app/components/Navbar";
import { NowPlaying } from "@/app/components/NowPlaying";
import { SongSearch } from "@/app/components/SongSearch";
import { QueueItem, StreamItem } from "@/app/components/QueueItem";
import { CopyIcon, CheckIcon } from "@/app/components/icons";

interface CreatorData {
  id: string;
  name: string | null;
  hostId: string;
  email: string | null;
  type?: string;
}

interface RoomClientProps {
  creatorId: string;
}

export function RoomClient({ creatorId }: RoomClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [activeStream, setActiveStream] = useState<StreamItem | null>(null);
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Room name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const currentUserId = (session?.user as any)?.id;

  // STRICT AUTHORITATIVE ROLE ENFORCEMENT:
  // Evaluated directly by the backend via session OR host cookie.
  const isOwner = Boolean(
    isHost ||
    (currentUserId && creator?.hostId && currentUserId === creator.hostId)
  );

  // Authoritative fetch from backend
  const fetchRoomData = useCallback(async (isInitial = false) => {
    if (!creatorId) return;
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`/api/streams?creatorId=${creatorId}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      setStreams(data.streams || []);
      setActiveStream(data.activeStream || null);
      if (data.creator) {
        setCreator(data.creator);
        setEditedName(data.creator.name || "");
      }
      if (typeof data.isHost === "boolean") {
        setIsHost(data.isHost);
      }
    } catch (err) {
      console.error("Error fetching room queue:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [creatorId]);

  // Initial load and live polling synchronization
  useEffect(() => {
    fetchRoomData(true);

    const interval = setInterval(() => {
      fetchRoomData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchRoomData]);

  // Real-time voting interaction (fans & hosts)
  const handleVote = async (streamId: string, currentStatus: boolean) => {
    setVotingId(streamId);

    // Optimistic UI update
    setStreams((prev) =>
      prev
        .map((s) => {
          if (s.id === streamId) {
            return {
              ...s,
              upvotes: currentStatus ? Math.max(0, s.upvotes - 1) : s.upvotes + 1,
              haveUpvoted: !currentStatus,
            };
          }
          return s;
        })
        .sort((a, b) => b.upvotes - a.upvotes)
    );

    try {
      const endpoint = currentStatus
        ? "/api/streams/downvote"
        : "/api/streams/upvote";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId,
          spaceId: creatorId,
        }),
      });

      if (!res.ok) {
        fetchRoomData();
      } else {
        fetchRoomData();
      }
    } catch (err) {
      console.error("Voting error:", err);
      fetchRoomData();
    } finally {
      setVotingId(null);
    }
  };

  // Host-only action: Start session or Skip to next song
  const handleNext = async () => {
    if (!isOwner) return;

    setIsSkipping(true);
    try {
      const res = await fetch(`/api/streams/next?creatorId=${creatorId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      const data = await res.json();
      if (res.ok && data.stream) {
        setActiveStream(data.stream);
        fetchRoomData();
      }
    } catch (err) {
      console.error("Skip error:", err);
    } finally {
      setIsSkipping(false);
    }
  };

  // Host-only action: Remove song from queue
  const handleRemove = async (streamId: string) => {
    if (!isOwner) return;

    try {
      const res = await fetch(`/api/streams?streamId=${streamId}&creatorId=${creatorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStreams((prev) => prev.filter((s) => s.id !== streamId));
        fetchRoomData();
      }
    } catch (err) {
      console.error("Remove error:", err);
    }
  };

  // Host action: Update room name
  const handleSaveRoomName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !editedName.trim()) return;

    setIsSavingName(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: creatorId, name: editedName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreator((prev: any) => ({ ...prev, name: data.room.name }));
        setIsEditingName(false);
      }
    } catch (err) {
      console.error("Error saving room name:", err);
    } finally {
      setIsSavingName(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const roomDisplayName =
    creator?.name || creator?.email?.split("@")[0] || "Music Room";

  // Dedicated Private Room Not Found Screen
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#20201E]">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FDEDED] text-[#B23B3B] border border-[#F5C2C2] flex items-center justify-center mx-auto text-base font-mono">
            🔒
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#20201E]">
            Private Room Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#777772] leading-relaxed">
            This room does not exist, has expired, or the Room ID is incorrect.
            Muzer rooms are private and invite-only.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="bg-[#20201E] hover:bg-[#333330] text-white px-4 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors"
            >
              Return Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Room Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-[#E7E7E2] gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6D7552]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#777772]">
                Private Room
              </span>
              {isOwner ? (
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#F2F4EC] text-[#6D7552] border border-[#6D7552]/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span>👑</span>
                  <span>Room Host</span>
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#F0F0EB] text-[#777772] border border-[#E7E7E2] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span>🎧</span>
                  <span>Guest Fan (Voting Only)</span>
                </span>
              )}
            </div>

            {/* Room Title & Host Edit Control */}
            {isEditingName ? (
              <form onSubmit={handleSaveRoomName} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-lg sm:text-xl font-semibold text-[#20201E] bg-[#FFFFFF] border border-[#6D7552] rounded-md px-2 py-1 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="bg-[#6D7552] hover:bg-[#5B6344] text-white text-xs px-2.5 py-1.5 rounded-md font-medium cursor-pointer"
                >
                  {isSavingName ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="text-xs text-[#777772] hover:text-[#20201E] px-2 py-1"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#20201E] tracking-tight">
                  {roomDisplayName}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    title="Change room name"
                    className="text-xs text-[#777772] hover:text-[#20201E] hover:underline cursor-pointer"
                  >
                    ✎ Edit
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-[#777772] mt-0.5 font-mono">
              Room ID: {creatorId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 bg-[#FFFFFF] hover:bg-[#F0F0EB] text-[#20201E] border border-[#E7E7E2] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-[#6D7552]" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-[#777772]" />
                  <span>Share Private Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Now Playing & Song Discovery */}
          <div className="lg:col-span-5 space-y-6">
            <section aria-label="Now Playing">
              <NowPlaying
                stream={activeStream}
                isOwner={isOwner}
                onNext={handleNext}
                isSkipping={isSkipping}
              />
            </section>

            <section aria-label="Add Songs">
              <SongSearch
                creatorId={creatorId}
                onSongAdded={() => fetchRoomData(false)}
              />
            </section>

            {/* Room Info & Instructions */}
            <div className="p-4 bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg text-xs space-y-2 text-[#777772]">
              <p className="font-semibold text-[#20201E] flex items-center gap-1.5">
                <span>{isOwner ? "👑 Host Authority" : "🎧 Guest Permissions"}</span>
              </p>
              <p className="leading-relaxed">
                {isOwner
                  ? "As the Room Host, your device drives continuous playback. You can skip tracks, pause/play, rename the room, and remove songs from the queue. When a track finishes, the highest-voted song plays automatically."
                  : "You're tuned in as a Guest! All rooms are private. You can add tracks to the queue and upvote songs you want to hear next. Only the room host can skip songs or manage playback."}
              </p>
            </div>
          </div>

          {/* Right Column: Shared Queue */}
          <div className="lg:col-span-7">
            <div className="bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg overflow-hidden">
              {/* Queue Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E7E2] bg-[#FAFAF8]">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#20201E]">
                    Up Next in Queue
                  </h2>
                  <span className="text-[11px] font-mono text-[#777772] bg-[#E7E7E2] px-1.5 py-0.5 rounded">
                    {streams.length}
                  </span>
                </div>
                <span className="text-[11px] text-[#777772]">
                  Sorted by crowd votes
                </span>
              </div>

              {/* Queue List */}
              {loading && streams.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#777772]">
                  Loading queue...
                </div>
              ) : streams.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-[#F0F0EB] text-[#777772] flex items-center justify-center mx-auto text-xs">
                    ♪
                  </div>
                  <p className="text-sm font-medium text-[#20201E]">The queue is empty</p>
                  <p className="text-xs text-[#777772] max-w-sm mx-auto">
                    Be the first to add a track using the form on the left. The crowd can
                    then vote for it to play next.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E7E7E2]">
                  {streams.map((stream, index) => (
                    <QueueItem
                      key={stream.id}
                      stream={stream}
                      position={index + 1}
                      isOwner={isOwner}
                      onVote={handleVote}
                      onRemove={isOwner ? handleRemove : undefined}
                      isVoting={votingId === stream.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
