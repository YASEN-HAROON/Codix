import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, getUserById } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Aggregate counts for profile / dashboard
  const [projectCount, taskCount, completedTasks, hoursApprox] =
    await Promise.all([
      prisma.projectMember.count({ where: { userId: user.id } }),
      prisma.task.count({ where: { userId: user.id } }),
      prisma.task.count({ where: { userId: user.id, completed: true } }),
      // Fake hours for demo – replace with real time tracking later
      prisma.task.count({ where: { userId: user.id, completed: true } }).then(
        (n) => Math.round(n * 1.8)
      ),
    ]);

  return NextResponse.json({
    user: {
      ...user,
      stats: {
        projects: projectCount,
        tasks: taskCount,
        tasksDone: completedTasks,
        hours: hoursApprox,
      },
    },
  });
}
