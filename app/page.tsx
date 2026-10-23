"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "./components/Navbar";
import { JoinModal } from "./components/JoinModal";
import { UpvoteIcon, ArrowRightIcon } from "./components/icons";

import { CreateRoomModal } from "./components/CreateRoomModal";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Preview interactive state
  const [previewVotes, setPreviewVotes] = useState({
    song1: 18,
    song2: 12,
    song3: 7,
  });
  const [previewVoted, setPreviewVoted] = useState<Record<string, boolean>>({
    song1: true,
  });

  const togglePreviewVote = (songKey: "song1" | "song2" | "song3") => {
    const isVoted = previewVoted[songKey];
    setPreviewVoted((prev) => ({ ...prev, [songKey]: !isVoted }));
    setPreviewVotes((prev) => ({
      ...prev,
      [songKey]: isVoted ? prev[songKey] - 1 : prev[songKey] + 1,
    }));
  };

  const handleCreateRoom = () => {
    setIsCreateOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#20201E]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#F0F0EB] border border-[#E7E7E2] text-xs text-[#6D7552] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D7552]" />
            Fan-powered shared music rooms
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#20201E]">
            Your crowd. Your music.
          </h1>

          <p className="text-base sm:text-lg text-[#777772] max-w-lg mx-auto">
            Add the songs you love. Vote for what plays next.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleCreateRoom}
              className="w-full sm:w-auto bg-[#6D7552] hover:bg-[#5B6344] text-white px-5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
            >
              {session?.user ? "Go to your room" : "Create a room"}
            </button>

            <button
              onClick={() => setIsJoinOpen(true)}
              className="w-full sm:w-auto bg-[#FFFFFF] hover:bg-[#F0F0EB] text-[#20201E] border border-[#E7E7E2] px-5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
            >
              Join a room
            </button>
          </div>
        </div>

        {/* Realistic Queue Preview */}
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between pb-2 px-1">
            <span className="text-xs uppercase font-mono tracking-wider text-[#777772]">
              Live Queue Preview
            </span>
            <span className="text-xs text-[#6D7552] font-medium">
              Interactive demo
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg overflow-hidden shadow-xs">
            {/* Song 1 */}
            <div className="flex items-center justify-between p-3.5 border-b border-[#E7E7E2] hover:bg-[#F0F0EB] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-medium text-[#777772] w-4 text-right">
                  1
                </span>
                <div className="w-10 h-10 rounded-md bg-[#6D7552]/10 border border-[#E7E7E2] overflow-hidden shrink-0 flex items-center justify-center text-xs font-serif font-semibold text-[#6D7552]">
                  NJ
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#20201E] truncate">
                    Noor-e-Jahan
                  </p>
                  <p className="text-xs text-[#777772] truncate">
                    PATHAK • Prod. by ABS
                  </p>
                </div>
              </div>
              <button
                onClick={() => togglePreviewVote("song1")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  previewVoted.song1
                    ? "bg-[#6D7552] text-white border-[#6D7552]"
                    : "bg-[#FFFFFF] text-[#20201E] border-[#E7E7E2] hover:bg-[#F2F4EC]"
                }`}
              >
                <UpvoteIcon className="w-3.5 h-3.5" />
                <span className="font-mono">{previewVotes.song1}</span>
              </button>
            </div>

            {/* Song 2 */}
            <div className="flex items-center justify-between p-3.5 border-b border-[#E7E7E2] hover:bg-[#F0F0EB] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-medium text-[#777772] w-4 text-right">
                  2
                </span>
                <div className="w-10 h-10 rounded-md bg-[#20201E]/5 border border-[#E7E7E2] overflow-hidden shrink-0 flex items-center justify-center text-xs font-serif font-semibold text-[#777772]">
                  ST
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#20201E] truncate">
                    Starboy
                  </p>
                  <p className="text-xs text-[#777772] truncate">
                    The Weeknd ft. Daft Punk
                  </p>
                </div>
              </div>
              <button
                onClick={() => togglePreviewVote("song2")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  previewVoted.song2
                    ? "bg-[#6D7552] text-white border-[#6D7552]"
                    : "bg-[#FFFFFF] text-[#20201E] border-[#E7E7E2] hover:bg-[#F2F4EC]"
                }`}
              >
                <UpvoteIcon className="w-3.5 h-3.5" />
                <span className="font-mono">{previewVotes.song2}</span>
              </button>
            </div>

            {/* Song 3 */}
            <div className="flex items-center justify-between p-3.5 hover:bg-[#F0F0EB] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-medium text-[#777772] w-4 text-right">
                  3
                </span>
                <div className="w-10 h-10 rounded-md bg-[#20201E]/5 border border-[#E7E7E2] overflow-hidden shrink-0 flex items-center justify-center text-xs font-serif font-semibold text-[#777772]">
                  MI
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#20201E] truncate">
                    Midnight City
                  </p>
                  <p className="text-xs text-[#777772] truncate">M83</p>
                </div>
              </div>
              <button
                onClick={() => togglePreviewVote("song3")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  previewVoted.song3
                    ? "bg-[#6D7552] text-white border-[#6D7552]"
                    : "bg-[#FFFFFF] text-[#20201E] border-[#E7E7E2] hover:bg-[#F2F4EC]"
                }`}
              >
                <UpvoteIcon className="w-3.5 h-3.5" />
                <span className="font-mono">{previewVotes.song3}</span>
              </button>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          aria-label="How it works"
          className="max-w-2xl mx-auto pt-8 border-t border-[#E7E7E2] space-y-8"
        >
          <div className="text-center space-y-1">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#777772]">
              How Muzer Works
            </h2>
            <p className="text-lg font-semibold text-[#20201E]">
              Private rooms. Crowd voting. Host autoplay.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="p-4 bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg space-y-2">
              <span className="text-xs font-mono font-semibold text-[#6D7552]">
                01
              </span>
              <h3 className="text-sm font-semibold text-[#20201E]">Private Invites</h3>
              <p className="text-xs text-[#777772] leading-relaxed">
                All rooms are private. Share your direct Room ID or link with friends. Only invited guests can join.
              </p>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg space-y-2">
              <span className="text-xs font-mono font-semibold text-[#6D7552]">
                02
              </span>
              <h3 className="text-sm font-semibold text-[#20201E]">
                Fans Queue & Upvote
              </h3>
              <p className="text-xs text-[#777772] leading-relaxed">
                Guests add YouTube songs to the queue and vote. Tracks with the most upvotes automatically rise to the top.
              </p>
            </div>

            <div className="p-4 bg-[#FFFFFF] border border-[#E7E7E2] rounded-lg space-y-2">
              <span className="text-xs font-mono font-semibold text-[#6D7552]">
                03
              </span>
              <h3 className="text-sm font-semibold text-[#20201E]">
                Host-Only Playback
              </h3>
              <p className="text-xs text-[#777772] leading-relaxed">
                Only the host can skip or change music. Continuous autoplay streams each winning track smoothly.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Minimal Footer */}
      <footer className="border-t border-[#E7E7E2] py-8 text-center text-xs text-[#777772]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D7552]" />
            <span className="font-semibold text-[#20201E]">muzer</span>
            <span>— fan-powered music</span>
          </div>
          <p className="text-[11px]">
            Minimal, editorial music voting. Powered by YouTube & Next.js.
          </p>
        </div>
      </footer>

      <JoinModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
      <CreateRoomModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
