import './globals.css';
import './schedule.css';
import './weekdays.css';
import ProfileManager from './profileManager';
import './profiles.css';
import './profile-manager.css';
import './telegram.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Pulse — Gentle reminders', description: 'Tiny nudges for the things that keep your day moving.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}<ProfileManager /></body></html>; }
