import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';
import { nextRun } from '../../../../lib/schedule';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUniqueOrThrow({ where: { email: session.user.email } });
  const data = await request.json() as { active?: boolean };
  const reminder = await prisma.reminder.findFirst({ where: { id, userId: user.id }, include: { profile: true } });
  if (!reminder) return NextResponse.json({ error: 'Reminder không tồn tại.' }, { status: 404 });
  const active = Boolean(data.active);
  if (!active) {
    await prisma.reminder.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ active: false });
  }
  const timeZone = reminder.profile?.timezone ?? user.timezone;
  const daysOfWeek = reminder.daysOfWeek.split(',').map(Number);
  const runAt = nextRun(new Date(), reminder.mode, reminder.intervalMinutes, reminder.fixedTime, timeZone, daysOfWeek);
  await prisma.$transaction([
    prisma.reminder.update({ where: { id }, data: { active: true, nextRunAt: runAt } }),
    prisma.reminderJob.deleteMany({ where: { reminderId: id, status: { in: ['pending', 'failed'] } } }),
    ...(runAt ? [prisma.reminderJob.create({ data: { reminderId: id, userId: user.id, runAt } })] : []),
  ]);
  return NextResponse.json({ active: true, nextRunAt: runAt });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUniqueOrThrow({ where: { email: session.user.email } });
  await prisma.reminder.deleteMany({ where: { id, userId: user.id } });
  return new NextResponse(null, { status: 204 });
}
