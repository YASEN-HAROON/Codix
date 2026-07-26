import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { settingsUpdateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { settings: true },
  });

  return NextResponse.json({
    settings: (dbUser?.settings as Record<string, unknown>) || {},
  });
}

export async function PATCH(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  try {
    const body = await req.json();
    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { settings: true },
    });

    const merged = {
      ...((current?.settings as object) || {}),
      ...parsed.data,
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { settings: merged },
    });

    return NextResponse.json({ settings: merged });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
