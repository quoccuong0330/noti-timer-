import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
const input = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(80).optional() });
export async function POST(request: Request) { try { const parsed = input.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: 'Use a valid email and a password of at least 8 characters.' }, { status: 400 }); const { email, password, name } = parsed.data; const user = await prisma.user.create({ data: { email: email.toLowerCase(), name, passwordHash: await hash(password, 12) }, select: { id: true, email: true } }); return NextResponse.json(user, { status: 201 }); } catch (error) { if (error instanceof Error && error.message.includes('Unique constraint')) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 }); return NextResponse.json({ error: 'Could not create account.' }, { status: 500 }); } }
