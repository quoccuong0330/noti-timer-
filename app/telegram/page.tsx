import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import TelegramClient from './telegramClient';
export default async function TelegramPage() { const session = await auth(); if (!session) redirect('/login'); return <TelegramClient />; }
