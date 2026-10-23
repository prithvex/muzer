import { Suspense, use } from "react";
import { RoomClient } from "./RoomClient";

function RoomContent({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = use(params);
  return <RoomClient creatorId={creatorId} />;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-xs text-[#777772]">
          Loading room...
        </div>
      }
    >
      <RoomContent params={params} />
    </Suspense>
  );
}
