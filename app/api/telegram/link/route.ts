import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';
export async function GET(request: Request) { const session = await auth(); const userId = (session?.user as { id?: string } | undefined)?.id; const profileId = new URL(request.url).searchParams.get('profileId'); if (!userId || !profileId || !process.env.TELEGRAM_BOT_USERNAME) return NextResponse.json({ error: 'Telegram is not configured.' }, { status: 503 }); const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } }); if (!profile) return NextResponse.json({ error: 'Profile không tồn tại.' }, { status: 404 }); return NextResponse.json({ url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${profile.id}` }); }
