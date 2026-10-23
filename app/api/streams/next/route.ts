import { authOptions } from "@/app/lib/auth-options";
import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Advance track / Play Next (STRICTLY FORBIDDEN FOR FANS - ONLY ROOM HOST ALLOWED)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    const body = await req.json().catch(() => ({}));

    const creatorId =
      req.nextUrl.searchParams.get("creatorId") ||
      body?.creatorId;

    if (!creatorId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 });
    }

    // Determine target Space or User room and find hostId
    const space = await prismaClient.space.findUnique({
      where: { id: creatorId },
    });

    let hostId = "";
    let streamWhere: any = {};

    if (space) {
      hostId = space.hostId;
      streamWhere = {
        OR: [{ spaceId: space.id }, { userId: space.hostId, spaceId: null }],
        played: false,
      };
    } else {
      const user = await prismaClient.user.findUnique({
        where: { id: creatorId },
      });
      if (!user) {
        return NextResponse.json({ message: "Private room not found" }, { status: 404 });
      }
      hostId = user.id;
      streamWhere = { userId: user.id, played: false };
    }

    // Enforce role: ONLY the host can change or skip music
    const hostCookie = req.cookies.get(`muzer_host_${creatorId}`)?.value;
    const isHost = Boolean(
      (currentUserId && currentUserId === hostId) ||
      (hostCookie && hostCookie === hostId)
    );

    if (!isHost) {
      return NextResponse.json(
        { message: "Access denied. Only the room host can change or skip music." },
        { status: 403 }
      );
    }

    // Find unplayed streams for this room, ordered by upvotes desc, then creation time asc
    const streams = await prismaClient.stream.findMany({
      where: streamWhere,
      include: {
        _count: {
          select: { upvotes: true },
        },
      },
    });

    if (streams.length === 0) {
      if (space) {
        await prismaClient.currentStream.deleteMany({
          where: { OR: [{ spaceId: space.id }, { userId: space.hostId }] },
        });
      } else {
        await prismaClient.currentStream.deleteMany({
          where: { userId: hostId },
        });
      }

      return NextResponse.json({
        stream: null,
        message: "No more songs in the queue",
      });
    }

    // Sort by upvotes desc, then creation time asc
    streams.sort((a, b) => {
      if (b._count.upvotes !== a._count.upvotes) {
        return b._count.upvotes - a._count.upvotes;
      }
      return new Date(a.createAt).getTime() - new Date(b.createAt).getTime();
    });

    const mostVotedStream = streams[0];

    // Mark winning track as played
    await prismaClient.stream.update({
      where: {
        id: mostVotedStream.id,
      },
      data: {
        played: true,
        playedTs: new Date(),
      },
    });

    // Update CurrentStream
    if (space) {
      await prismaClient.currentStream.deleteMany({
        where: { OR: [{ spaceId: space.id }, { userId: space.hostId }] },
      });
      const current = await prismaClient.currentStream.create({
        data: {
          userId: space.hostId,
          spaceId: space.id,
          streamId: mostVotedStream.id,
        },
        include: {
          stream: true,
        },
      });
      return NextResponse.json({ stream: current.stream });
    } else {
      await prismaClient.currentStream.deleteMany({
        where: { userId: hostId },
      });
      const current = await prismaClient.currentStream.create({
        data: {
          userId: hostId,
          streamId: mostVotedStream.id,
        },
        include: {
          stream: true,
        },
      });
      return NextResponse.json({ stream: current.stream });
    }
  } catch (e: any) {
    console.error("Error advancing stream:", e);
    return NextResponse.json(
      { message: "Error advancing to next song" },
      { status: 500 }
    );
  }
}
