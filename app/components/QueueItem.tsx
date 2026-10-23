"use client";

import { UpvoteIcon, TrashIcon } from "./icons";

export interface StreamItem {
  id: string;
  type: string;
  url: string;
  extractedId: string;
  title: string;
  description?: string;
  smallImg: string;
  bigImg: string;
  active: boolean;
  played: boolean;
  upvotes: number;
  haveUpvoted?: boolean;
  userId: string;
  addedBy?: string;
  createAt?: string;
}

interface QueueItemProps {
  stream: StreamItem;
  position: number;
  isOwner?: boolean;
  onVote: (streamId: string, currentStatus: boolean) => void;
  onRemove?: (streamId: string) => void;
  isVoting?: boolean;
}

export function QueueItem({
  stream,
  position,
  isOwner = false,
  onVote,
  onRemove,
  isVoting = false,
}: QueueItemProps) {
  const isUpvoted = Boolean(stream.haveUpvoted);

  return (
    <div className="group flex items-center justify-between py-3 px-3 sm:px-4 border-b border-[#E7E7E2] hover:bg-[#F0F0EB] transition-colors gap-3">
      {/* Left: Position, artwork, metadata */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Position */}
        <span className="w-5 text-xs font-mono font-medium text-[#777772] text-right shrink-0">
          {position}
        </span>

        {/* Thumbnail artwork */}
        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-[#E7E7E2] shrink-0 border border-[#E7E7E2]">
          {stream.smallImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stream.smallImg}
              alt={stream.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#777772]">
              ♪
            </div>
          )}
        </div>

        {/* Title and metadata */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#20201E] truncate tracking-tight">
            {stream.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#777772]">
            <span className="uppercase text-[10px] tracking-wider font-semibold text-[#6D7552]">
              {stream.type}
            </span>
            <span className="text-[#E7E7E2]">•</span>
            <span className="truncate text-[11px]">
              {stream.extractedId ? `id: ${stream.extractedId}` : "queued"}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Vote count, Upvote button, and Owner remove action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Upvote button */}
        <button
          onClick={() => onVote(stream.id, isUpvoted)}
          disabled={isVoting}
          aria-label={isUpvoted ? "Remove upvote" : "Upvote song"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border ${
            isUpvoted
              ? "bg-[#6D7552] text-[#FFFFFF] border-[#6D7552] hover:bg-[#5B6344]"
              : "bg-[#FFFFFF] text-[#20201E] border-[#E7E7E2] hover:border-[#6D7552] hover:bg-[#F2F4EC]"
          }`}
        >
          <UpvoteIcon className={`w-3.5 h-3.5 ${isUpvoted ? "text-white" : "text-[#6D7552]"}`} />
          <span className="font-mono">{stream.upvotes}</span>
        </button>

        {/* Owner Delete button */}
        {isOwner && onRemove && (
          <button
            onClick={() => onRemove(stream.id)}
            title="Remove from queue"
            className="opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1.5 text-[#777772] hover:text-[#B23B3B] hover:bg-[#FFFFFF] rounded transition-all cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
