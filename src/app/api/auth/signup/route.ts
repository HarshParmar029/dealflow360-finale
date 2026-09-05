import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([Role.SALES_REP, Role.CUSTOMER]).default(Role.SALES_REP),
});

export async function POST(req: Request) {
  try {
    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid signup details", details: parsed.error.flatten() }, { status: 400 });

    const { name, email, password, role } = parsed.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash, role } });

    return NextResponse.json({ message: "Account created successfully", user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
