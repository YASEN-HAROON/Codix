import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createToken,
  setAuthCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      displayName: user.displayName,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        displayName: user.displayName,
        avatarLetter: user.avatarLetter,
      },
    });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
