import db from "@/app/lib/db";
import { authOptions } from "@/app/lib/auth-options";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DownvoteSchema = z.object({
  streamId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const data = DownvoteSchema.parse(await req.json());
    const session = await getServerSession(authOptions);

    let userId = (session?.user as any)?.id;

    if (!userId && session?.user?.email) {
      const dbUser = await db.user.findUnique({
        where: { email: session.user.email },
      });
      userId = dbUser?.id;
    }

    if (!userId) {
      userId = req.cookies.get("muzer_voter_id")?.value;
    }

    if (!userId) {
      const guest = await db.user.findFirst({
        where: { email: "guest@muzer.live" },
      });
      userId = guest?.id;
    }

    if (!userId) {
      return NextResponse.json({ message: "No vote found to remove" });
    }

    await db.upvote.deleteMany({
      where: {
        userId,
        streamId: data.streamId,
      },
    });

    return NextResponse.json({
      message: "Downvoted successfully",
    });
  } catch (e: any) {
    console.error("Error while downvoting:", e);
    return NextResponse.json(
      {
        message: e?.message || "Error while downvoting",
      },
      {
        status: 400,
      }
    );
  }
}
