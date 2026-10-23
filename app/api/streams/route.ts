import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/app/lib/db";
import youtubesearchapi from "youtube-search-api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|[?&]v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
}

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
});

// Add Song to Queue (Open to all fans & host)
export async function POST(req: NextRequest) {
  try {
    const data = CreateStreamSchema.parse(await req.json());
    const extractedId = extractYouTubeId(data.url);

    if (!extractedId) {
      return NextResponse.json(
        {
          message: "Invalid YouTube URL. Please provide a valid YouTube watch or share link.",
        },
        {
          status: 400,
        }
      );
    }

    // Check if creatorId is a Space or User room
    const space = await prismaClient.space.findUnique({
      where: { id: data.creatorId },
    });

    const targetUserId = space ? space.hostId : data.creatorId;
    const targetSpaceId = space ? space.id : null;

    // Get current session if user is logged in
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as any)?.id;
    const addedBy = sessionUserId || targetUserId;

    // Fetch video details
    let rst: any = null;
    try {
      rst = await youtubesearchapi.GetVideoDetails(extractedId);
    } catch (apiError) {
      console.warn("YouTube search API failed to get details, using fallback:", apiError);
    }

    const thumbnails = rst?.thumbnail?.thumbnails || [];
    if (thumbnails.length > 0) {
      thumbnails.sort((a: any, b: any) => a.width - b.width);
    }

    const defaultSmallImg = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
    const defaultBigImg = `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`;

    const smallImg =
      (thumbnails.length > 1
        ? thumbnails[thumbnails.length - 2]?.url
        : thumbnails[0]?.url) ?? defaultSmallImg;

    const bigImg = thumbnails[thumbnails.length - 1]?.url ?? defaultBigImg;

    const stream = await prismaClient.stream.create({
      data: {
        userId: targetUserId,
        spaceId: targetSpaceId,
        addedBy: addedBy,
        url: `https://www.youtube.com/watch?v=${extractedId}`,
        extractedId,
        type: "Youtube",
        title: rst?.title || "YouTube Video",
        description: rst?.description || "No description provided",
        smallImg,
        bigImg,
      },
      include: {
        _count: {
          select: {
            upvotes: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Stream created successfully",
      stream: {
        ...stream,
        upvotes: stream._count.upvotes,
        haveUpvoted: false,
      },
    });
  } catch (e: any) {
    console.error("Error adding stream:", e);
    return NextResponse.json(
      {
        message: e?.message || "Error while adding stream",
      },
      {
        status: 411,
      }
    );
  }
}

// Fetch Private Room Queue (Authoritatively tells UI if viewer is Host or Fan)
export async function GET(req: NextRequest) {
  try {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    if (!creatorId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    // Check if targetId is a Space or User room
    const space = await prismaClient.space.findUnique({
      where: { id: creatorId },
      include: { host: true },
    });

    let creatorInfo: any = null;
    let streamWhere: any = {};
    let currentStreamWhere: any = {};
    let hostId = "";

    if (space) {
      hostId = space.hostId;
      creatorInfo = {
        id: space.id,
        name: space.name,
        hostId: space.hostId,
        email: space.host.email,
        type: "space",
      };
      streamWhere = {
        OR: [
          { spaceId: space.id },
          { userId: space.hostId, spaceId: null },
        ],
        played: false,
      };
      currentStreamWhere = {
        OR: [
          { spaceId: space.id },
          { userId: space.hostId },
        ],
      };
    } else {
      const user = await prismaClient.user.findUnique({
        where: { id: creatorId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        return NextResponse.json(
          { message: "Private room not found. Please verify the Room ID." },
          { status: 404 }
        );
      }

      hostId = user.id;
      creatorInfo = {
        id: user.id,
        name: user.name || `${user.email?.split("@")[0]}'s Room`,
        hostId: user.id,
        email: user.email,
        type: "user",
      };
      streamWhere = {
        userId: user.id,
        played: false,
      };
      currentStreamWhere = {
        userId: user.id,
      };
    }

    // Authoritative check: Is the current visitor the Host of this private room?
    const hostCookie = req.cookies.get(`muzer_host_${creatorId}`)?.value;
    const isHost = Boolean(
      (currentUserId && currentUserId === hostId) ||
      (hostCookie && hostCookie === hostId)
    );

    const voterId =
      currentUserId ||
      req.cookies.get("muzer_voter_id")?.value ||
      "";

    const [streams, currentStreamRecord] = await Promise.all([
      prismaClient.stream.findMany({
        where: streamWhere,
        include: {
          _count: {
            select: {
              upvotes: true,
            },
          },
          upvotes: {
            where: {
              userId: voterId,
            },
          },
        },
      }),
      prismaClient.currentStream.findFirst({
        where: currentStreamWhere,
        include: {
          stream: true,
        },
      }),
    ]);

    const formattedStreams = streams
      .map(({ _count, upvotes, ...rest }: any) => ({
        ...rest,
        upvotes: _count.upvotes,
        haveUpvoted: upvotes.length > 0,
      }))
      .sort((a: any, b: any) => {
        if (b.upvotes !== a.upvotes) {
          return b.upvotes - a.upvotes;
        }
        return new Date(a.createAt).getTime() - new Date(b.createAt).getTime();
      });

    return NextResponse.json({
      streams: formattedStreams,
      activeStream: currentStreamRecord?.stream ?? null,
      creator: creatorInfo,
      isHost, // Authoritative flag: Host vs Fan
    });
  } catch (e: any) {
    console.error("Error fetching streams:", e);
    return NextResponse.json(
      {
        message: "Error fetching streams",
      },
      {
        status: 500,
      }
    );
  }
}

// Remove Song from Queue (STRICTLY FORBIDDEN FOR FANS - ONLY HOST ALLOWED)
export async function DELETE(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get("streamId");
    if (!streamId) {
      return NextResponse.json({ message: "streamId is required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const stream = await prismaClient.stream.findUnique({
      where: { id: streamId },
      include: { space: true },
    });

    if (!stream) {
      return NextResponse.json({ message: "Stream not found" }, { status: 404 });
    }

    const hostId = stream.space ? stream.space.hostId : stream.userId;
    const roomId = stream.spaceId || stream.userId;
    const hostCookie = req.cookies.get(`muzer_host_${roomId}`)?.value;

    const isHost = Boolean(
      (currentUserId && currentUserId === hostId) ||
      (hostCookie && hostCookie === hostId)
    );

    if (!isHost) {
      return NextResponse.json(
        { message: "Access denied. Only the room host can delete songs from the queue." },
        { status: 403 }
      );
    }

    await prismaClient.stream.delete({
      where: {
        id: streamId,
      },
    });

    return NextResponse.json({ message: "Stream deleted successfully" });
  } catch (e: any) {
    console.error("Error deleting stream:", e);
    return NextResponse.json(
      { message: "Error deleting stream" },
      { status: 500 }
    );
  }
}
