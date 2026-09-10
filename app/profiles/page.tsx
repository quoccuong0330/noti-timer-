import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import ProfilesClient from './profilesClient';
export default async function ProfilesPage() { const session = await auth(); if (!session) redirect('/login'); return <ProfilesClient userName={session.user?.name ?? session.user?.email ?? 'there'} />; }
