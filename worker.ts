import { generateReminderMessage } from './lib/openRouter';
import { prisma } from './lib/prisma';
import { inActiveHours, nextRun } from './lib/schedule';

async function sendTelegram(chatId: string, reminderId: string, title: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: `⏰ ${message || title}`, reply_markup: { inline_keyboard: [[{ text: 'Done', callback_data: `done:${reminderId}` }, { text: 'Snooze 15m', callback_data: `snooze:${reminderId}` }, { text: 'Pause', callback_data: `pause:${reminderId}` }]] } }),
  });
  if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
}

async function restoreMissingJobs() {
  const reminders = await prisma.reminder.findMany({ where: { active: true, nextRunAt: { not: null } }, include: { profile: true, user: true, jobs: { where: { status: { in: ['pending', 'processing'] } } } } });
  for (const reminder of reminders) {
    if (reminder.jobs.length) continue;
    const timeZone = reminder.profile?.timezone ?? reminder.user.timezone;
    const runAt = nextRun(new Date(), reminder.mode, reminder.intervalMinutes, reminder.fixedTime, timeZone, reminder.daysOfWeek.split(',').map(Number));
    if (!runAt) continue;
    await prisma.$transaction([prisma.reminder.update({ where: { id: reminder.id }, data: { nextRunAt: runAt } }), prisma.reminderJob.create({ data: { reminderId: reminder.id, userId: reminder.userId, runAt } })]);
  }
}

async function processJobs() {
  await restoreMissingJobs();
  const jobs = await prisma.reminderJob.findMany({ where: { status: 'pending', runAt: { lte: new Date() } }, include: { reminder: { include: { profile: { include: { telegramConnection: true } } } }, user: true }, take: 25 });
  for (const job of jobs) {
    const claimed = await prisma.reminderJob.updateMany({ where: { id: job.id, status: 'pending' }, data: { status: 'processing', lockedAt: new Date(), attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    const target = job.reminder.profile;
    const timeZone = target?.timezone ?? job.user.timezone;
    try {
      if (!job.reminder.active) throw new Error('Reminder is paused');
      if (!target?.telegramConnection) throw new Error('Telegram profile is not connected');
      if (!inActiveHours(new Date(), target.activeStart, target.activeEnd, timeZone)) throw new Error('Outside active hours');
      const message = await generateReminderMessage(job.reminder.title, target.name);
      await sendTelegram(target.telegramConnection.chatId, job.reminder.id, job.reminder.title, message);
      await prisma.deliveryLog.create({ data: { reminderId: job.reminderId, userId: job.userId, jobId: job.id, channel: 'telegram', status: 'sent' } });
      const days = job.reminder.daysOfWeek.split(',').map(Number);
      const runAt = nextRun(new Date(), job.reminder.mode, job.reminder.intervalMinutes, job.reminder.fixedTime, timeZone, days);
      await prisma.$transaction([prisma.reminderJob.update({ where: { id: job.id }, data: { status: 'sent' } }), ...(runAt ? [prisma.reminder.update({ where: { id: job.reminderId }, data: { nextRunAt: runAt } }), prisma.reminderJob.create({ data: { reminderId: job.reminderId, userId: job.userId, runAt } })] : [])]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      await prisma.deliveryLog.create({ data: { reminderId: job.reminderId, userId: job.userId, jobId: job.id, channel: 'telegram', status: 'failed', error: reason } });
      if (reason === 'Outside active hours') await prisma.reminderJob.update({ where: { id: job.id }, data: { status: 'pending', runAt: new Date(Date.now() + 5 * 60000), attempts: 0, lockedAt: null } });
      else await prisma.reminderJob.update({ where: { id: job.id }, data: { status: job.attempts >= 3 ? 'failed' : 'pending', lockedAt: null } });
    }
  }
}

async function main() {
  const delay = Number(process.env.WORKER_POLL_MS ?? 15000);
  while (true) { try { await processJobs(); } catch (error) { console.error('Worker poll failed', error); } await new Promise((resolve) => setTimeout(resolve, delay)); }
}

main().catch((error) => { console.error(error); process.exit(1); });
