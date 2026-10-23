"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { JoinModal } from "./JoinModal";
import { CreateRoomModal } from "./CreateRoomModal";

export function Navbar() {
  const { data: session } = useSession();
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const userId = (session?.user as any)?.id;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-[#E7E7E2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-2 h-2 rounded-full bg-[#6D7552] group-hover:scale-125 transition-transform" />
            <span className="font-semibold tracking-tight text-lg text-[#20201E]">
              muzer
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 sm:gap-3 text-sm">
            <Link
              href="/#how-it-works"
              className="hidden sm:inline-block text-[#777772] hover:text-[#20201E] px-2 py-1.5 transition-colors"
            >
              How it works
            </Link>

            <button
              onClick={() => setIsJoinOpen(true)}
              className="text-[#777772] hover:text-[#20201E] px-2 py-1.5 transition-colors font-medium cursor-pointer"
            >
              Join room
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-[#20201E] bg-[#F0F0EB] hover:bg-[#E7E7E2] px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Create room
            </button>

            {userId && (
              <Link
                href={`/room/${userId}`}
                className="text-[#6D7552] bg-[#F2F4EC] hover:bg-[#E5E9DC] px-2.5 py-1.5 rounded-md font-medium transition-colors text-xs sm:text-sm"
              >
                My Room
              </Link>
            )}

            {session?.user ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs text-[#777772] hover:text-[#20201E] border border-[#E7E7E2] hover:border-[#777772] px-2 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-[#20201E] hover:bg-[#333330] text-[#FAFAF8] px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs"
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>

      <JoinModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
      <CreateRoomModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
  );
}
