import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(60, "Room name too long"),
});

// Private Room Verification & Host Rooms (NO public listing of all private rooms)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const roomId = req.nextUrl.searchParams.get("id");

    // If verifying a specific private room ID
    if (roomId) {
      const space = await prismaClient.space.findUnique({
        where: { id: roomId, isActive: true },
        select: { id: true, name: true, hostId: true },
      });
      if (space) {
        return NextResponse.json({ exists: true, room: space });
      }

      const user = await prismaClient.user.findUnique({
        where: { id: roomId },
        select: { id: true, name: true },
      });
      if (user) {
        return NextResponse.json({ exists: true, room: { id: user.id, name: user.name || "Room" } });
      }

      return NextResponse.json({ exists: false, message: "Room not found" }, { status: 404 });
    }

    // If logged in, return only rooms hosted by the current user
    if (userId) {
      const mySpaces = await prismaClient.space.findMany({
        where: { hostId: userId, isActive: true },
        select: {
          id: true,
          name: true,
          hostId: true,
          _count: {
            select: { streams: { where: { played: false } } },
          },
        },
      });

      return NextResponse.json({
        rooms: mySpaces.map((s) => ({
          id: s.id,
          name: s.name,
          hostId: s.hostId,
          activeSongsCount: s._count.streams,
        })),
      });
    }

    // Unauthenticated visitors cannot see any private rooms list
    return NextResponse.json({ rooms: [] });
  } catch (e: any) {
    console.error("Error in /api/rooms:", e);
    return NextResponse.json({ rooms: [] });
  }
}

// Host creates a new Private Room
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let dbUser: any = null;

    // 1. Try finding database user by session ID
    const sessionUserId = (session?.user as any)?.id;
    if (sessionUserId) {
      dbUser = await prismaClient.user.findUnique({
        where: { id: sessionUserId },
      });
    }

    // 2. If not found by ID, resolve by session email
    if (!dbUser && session?.user?.email) {
      dbUser = await prismaClient.user.findUnique({
        where: { email: session.user.email },
      });
      if (!dbUser) {
        dbUser = await prismaClient.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split("@")[0],
            provider: "Google",
          },
        });
      }
    }

    // 3. Fallback: find existing host or create default host
    if (!dbUser) {
      dbUser = await prismaClient.user.findFirst();
    }
    if (!dbUser) {
      dbUser = await prismaClient.user.create({
        data: {
          email: "host@muzer.live",
          name: "Room Host",
          provider: "Credentials",
        },
      });
    }

    const hostId = dbUser.id;
    const body = await req.json();
    const data = CreateRoomSchema.parse(body);

    // Create the Private Space
    const space = await prismaClient.space.create({
      data: {
        name: data.name.trim(),
        hostId: hostId,
        isActive: true,
      },
    });

    if (!dbUser.name) {
      await prismaClient.user.update({
        where: { id: hostId },
        data: { name: data.name.trim() },
      });
    }

    const res = NextResponse.json({
      message: "Private room created successfully",
      room: {
        id: space.id,
        name: space.name,
        hostId: space.hostId,
      },
    });

    // Authoritative host token cookie for this room
    res.cookies.set(`muzer_host_${space.id}`, hostId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return res;
  } catch (e: any) {
    console.error("Error creating room:", e);
    return NextResponse.json(
      { message: e?.message || "Failed to create room" },
      { status: 400 }
    );
  }
}

// Host renames the room (Strictly forbidden for guests)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const body = await req.json();
    const { roomId, name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    const space = await prismaClient.space.findUnique({ where: { id: roomId } });
    if (!space) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Check host authority
    const hostCookie = req.cookies.get(`muzer_host_${roomId}`)?.value;
    const isHost = Boolean((userId && userId === space.hostId) || hostCookie === space.hostId);

    if (!isHost) {
      return NextResponse.json(
        { message: "Access denied. Only the room host can rename the room." },
        { status: 403 }
      );
    }

    const updated = await prismaClient.space.update({
      where: { id: roomId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ room: updated });
  } catch (e: any) {
    console.error("Error updating room:", e);
    return NextResponse.json({ message: "Failed to update room" }, { status: 500 });
  }
}
