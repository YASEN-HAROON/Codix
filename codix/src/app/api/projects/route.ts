import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { projectCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const status = req.nextUrl.searchParams.get("status"); // IN_PROGRESS | COMPLETED | ON_HOLD | all

  const where: any = {
    members: { some: { userId: user.id } },
  };
  if (status && status !== "all") {
    where.status = status;
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      members: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarLetter: true },
          },
        },
      },
      _count: { select: { tasks: true } },
      tasks: {
        where: { completed: false },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const mapped = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    progress: p.progress,
    color: p.color,
    updatedAt: p.updatedAt,
    taskCount: p._count.tasks,
    tasksLeft: p.tasks.length,
    members: p.members.map((m) => ({
      id: m.user.id,
      name: m.user.displayName || m.user.avatarLetter,
      letter: m.user.avatarLetter || "?",
    })),
  }));

  return NextResponse.json({ projects: mapped });
}

export async function POST(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  try {
    const body = await req.json();
    const parsed = projectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? "#6366f1",
        status: data.status ?? "IN_PROGRESS",
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarLetter: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("Create project error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
