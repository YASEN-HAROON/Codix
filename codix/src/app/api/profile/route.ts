import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getUserById } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const profile = await getUserById(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [projectCount, taskCount, completed] = await Promise.all([
    prisma.projectMember.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id, completed: true } }),
  ]);

  return NextResponse.json({
    profile: {
      ...profile,
      stats: {
        projects: projectCount,
        tasks: taskCount,
        hours: Math.round(completed * 1.8),
      },
    },
  });
}

export async function PATCH(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  try {
    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // If email changes, ensure uniqueness
    if (data.email && data.email !== user.email) {
      const taken = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (taken) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    const updateData: any = { ...data };
    if (data.fullName) {
      updateData.avatarLetter =
        data.fullName.trim().charAt(0).toUpperCase() || "U";
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        phone: true,
        bio: true,
        location: true,
        timezone: true,
        avatarLetter: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  await prisma.user.delete({ where: { id: user.id } });
  const res = NextResponse.json({ ok: true });
  // Clear cookie
  res.cookies.set("codix_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
