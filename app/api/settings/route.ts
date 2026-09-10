import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';
const input = z.object({ timezone: z.string().min(1), activeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), activeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional() });
export async function GET() { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json(await prisma.user.findUniqueOrThrow({ where: { email: session.user.email }, select: { timezone: true, activeStart: true, activeEnd: true } })); }
export async function PATCH(request: Request) { try { const session = await auth(); if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const data = input.parse(await request.json()); const user = await prisma.user.update({ where: { email: session.user.email }, data, select: { timezone: true, activeStart: true, activeEnd: true } }); return NextResponse.json(user); } catch { return NextResponse.json({ error: 'Invalid settings.' }, { status: 400 }); } }
