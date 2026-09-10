import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';
const input = z.object({ name: z.string().min(1).max(80), timezone: z.string().min(1).default('UTC') });
async function getUser() { const session = await auth(); if (!session?.user?.email) return null; return prisma.user.findUniqueOrThrow({ where: { email: session.user.email } }); }
export async function GET() { const user = await getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json(await prisma.profile.findMany({ where: { userId: user.id }, include: { telegramConnection: true }, orderBy: { createdAt: 'asc' } })); }
export async function POST(request: Request) { try { const user = await getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); if (await prisma.profile.count({ where: { userId: user.id } }) >= 3) return NextResponse.json({ error: 'Mỗi tài khoản chỉ được tối đa 3 profile.' }, { status: 400 }); const data = input.parse(await request.json()); return NextResponse.json(await prisma.profile.create({ data: { ...data, userId: user.id } }), { status: 201 }); } catch { return NextResponse.json({ error: 'Profile không hợp lệ.' }, { status: 400 }); } }
