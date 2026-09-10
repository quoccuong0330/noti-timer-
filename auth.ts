import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './lib/prisma';
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.userId = user.id; return token; },
    session({ session, token }) { if (session.user && token.userId) session.user.id = String(token.userId); return session; }
  },
  providers: [Credentials({ credentials: { email: {}, password: {} }, async authorize(credentials) {
    const email = String(credentials?.email ?? '').toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(String(credentials?.password ?? ''), user.passwordHash))) return null;
    return { id: user.id, email: user.email, name: user.name };
  } })]
});
