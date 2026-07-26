import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { projectUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

async function ensureMember(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;
  const { id } = await params;

  const member = await ensureMember(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarLetter: true },
          },
        },
      },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;
  const { id } = await params;

  const member = await ensureMember(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = projectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("Update project error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
