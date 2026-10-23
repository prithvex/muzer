import db from "@/app/lib/db";
import { authOptions } from "@/app/lib/auth-options";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpvoteSchema = z.object({
  streamId: z.string(),
  spaceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = UpvoteSchema.parse(await req.json());
    const session = await getServerSession(authOptions);

    let userId = (session?.user as any)?.id;

    if (!userId && session?.user?.email) {
      const dbUser = await db.user.findUnique({
        where: { email: session.user.email },
      });
      userId = dbUser?.id;
    }

    // Guest / Anonymous fallback if not logged in
    let isGuest = false;
    if (!userId) {
      userId = req.cookies.get("muzer_voter_id")?.value;
      if (!userId) {
        // Find or create default guest user
        let guest = await db.user.findFirst({
          where: { email: "guest@muzer.live" },
        });
        if (!guest) {
          guest = await db.user.create({
            data: {
              email: "guest@muzer.live",
              name: "Guest Fan",
              provider: "Credentials",
            },
          });
        }
        userId = guest.id;
        isGuest = true;
      }
    }

    try {
      await db.upvote.create({
        data: {
          userId,
          streamId: data.streamId,
        },
      });
    } catch (createErr: any) {
      // If already upvoted, unique constraint triggers (P2002 in Prisma)
      if (createErr?.code === "P2002") {
        return NextResponse.json({ message: "Already upvoted", status: "exists" });
      }
      throw createErr;
    }

    const res = NextResponse.json({
      message: "Upvoted successfully",
    });

    if (isGuest && userId) {
      res.cookies.set("muzer_voter_id", userId, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return res;
  } catch (e: any) {
    console.error("Error while upvoting:", e);
    return NextResponse.json(
      {
        message: e?.message || "Error while upvoting",
      },
      {
        status: 400,
      }
    );
  }
}
