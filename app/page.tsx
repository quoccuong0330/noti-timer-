import { auth } from '../auth';
import { redirect } from 'next/navigation';
import Dashboard from './dashboard';
export default async function Page() { const session = await auth(); if (!session) redirect('/login'); return <Dashboard userName={session.user?.name ?? session.user?.email ?? 'there'} />; }
