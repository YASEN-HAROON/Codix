import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  createToken,
  setAuthCookie,
} from "@/lib/auth";
import { signupSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { fullName, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const avatarLetter = fullName.trim().charAt(0).toUpperCase() || "U";

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        displayName: fullName.split(" ")[0],
        avatarLetter,
        settings: {
          emailNotifications: true,
          pushNotifications: true,
          weeklySummary: false,
          marketingEmails: false,
          theme: "Dark",
          density: "Comfortable",
          reduceMotion: false,
          twoFactor: false,
          showOnlineStatus: true,
          publicProfile: true,
        },
      },
    });

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
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
