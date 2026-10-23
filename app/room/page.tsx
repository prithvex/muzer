"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function RoomRedirectContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    const user = session?.user as any;
    if (user?.id) {
      router.replace(`/room/${user.id}`);
      return;
    }

    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms && data.rooms.length > 0) {
          router.replace(`/room/${data.rooms[0].id}`);
        } else {
          router.replace("/");
        }
      })
      .catch(() => router.replace("/"));
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-xs text-[#777772]">
      Redirecting to room...
    </div>
  );
}

export default function RoomRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-xs text-[#777772]">
          Loading...
        </div>
      }
    >
      <RoomRedirectContent />
    </Suspense>
  );
}
