import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { taskCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const todayOnly = req.nextUrl.searchParams.get("today") === "1";
  const projectId = req.nextUrl.searchParams.get("projectId");

  const where: any = { userId: user.id };
  if (projectId) where.projectId = projectId;
  // "today" is soft – we just return recent incomplete + some completed
  // Real date filtering can be added with dueDate later

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    take: todayOnly ? 20 : 100,
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  try {
    const body = await req.json();
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const task = await prisma.task.create({
      data: {
        title: data.title,
        tag: data.tag ?? null,
        projectId: data.projectId ?? null,
        completed: data.completed ?? false,
        userId: user.id,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
