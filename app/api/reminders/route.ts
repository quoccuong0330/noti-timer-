import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../auth';
import { generateReminderVariants } from '../../../lib/openRouter';
import { prisma } from '../../../lib/prisma';
import { nextRun } from '../../../lib/schedule';

const input = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(['interval', 'fixed']),
  intervalMinutes: z.number().int().positive().optional(),
  fixedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  profileId: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: session.user.email } });
  const profileId = new URL(request.url).searchParams.get('profileId');
  return NextResponse.json(await prisma.reminder.findMany({ where: { userId: user.id, ...(profileId ? { profileId } : {}) }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = input.parse(await request.json());
    const user = await prisma.user.findUniqueOrThrow({ where: { email: session.user.email } });
    const profile = data.profileId ? await prisma.profile.findFirstOrThrow({ where: { id: data.profileId, userId: user.id } }) : null;
    const timeZone = profile?.timezone ?? user.timezone;
    const runAt = nextRun(new Date(), data.mode, data.intervalMinutes, data.fixedTime, timeZone, data.daysOfWeek);
    let messageVariants: string[] = [];
    try {
      messageVariants = await generateReminderVariants(data.title, profile?.name ?? user.name ?? 'bạn');
    } catch (error) {
      console.error('OpenRouter generation failed', error);
    }
    const reminder = await prisma.reminder.create({ data: { ...data, daysOfWeek: data.daysOfWeek.join(','), messageVariants: messageVariants.length ? JSON.stringify(messageVariants) : null, userId: user.id, nextRunAt: runAt } });
    if (runAt) await prisma.reminderJob.create({ data: { reminderId: reminder.id, userId: user.id, runAt } });
    return NextResponse.json(reminder, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid reminder.' }, { status: 400 });
  }
}
