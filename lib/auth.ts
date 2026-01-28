import NextAuth, { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserByGoogleId, createUser } from './db';

// Log environment for debugging
console.log('Auth config loading:', {
  hasAuthSecret: !!process.env.AUTH_SECRET,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  authUrl: process.env.AUTH_URL,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
  hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
});

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email as string);
        if (!user || !user.password_hash) {
          return null;
        }

        // Check if email is verified for non-Google users
        if (!user.email_verified && !user.google_id) {
          throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Always allow sign-in, handle user creation in JWT callback
      if (account?.provider === 'google') {
        try {
          const googleId = account.providerAccountId;
          let dbUser = await getUserByGoogleId(googleId);

          if (!dbUser) {
            // Check if user exists by email
            const existingUser = await getUserByEmail(user.email!);

            if (!existingUser) {
              // Create new user with email already verified (Google accounts)
              dbUser = await createUser(
                user.email!,
                user.name || undefined,
                undefined,
                googleId
              );
              const { verifyUserEmail } = await import('./db');
              await verifyUserEmail(dbUser.id);
            } else {
              dbUser = existingUser;
            }
          }

          // Store database user ID in the user object for JWT callback
          user.id = dbUser.id.toString();
        } catch (error) {
          console.error('Error in signIn callback:', error);
          // Still allow sign-in even if DB operations fail
          // We'll handle this in the session/JWT callbacks
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      } else {
        console.error('Session callback: token.sub is missing', { token, session });
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }

      // If token.sub is missing but we have an account, try to recover
      if (!token.sub && account?.provider === 'google' && token.email) {
        try {
          const googleId = account.providerAccountId;
          let dbUser = await getUserByGoogleId(googleId);

          if (!dbUser) {
            dbUser = await getUserByEmail(token.email as string);
          }

          if (dbUser) {
            token.sub = dbUser.id.toString();
            console.log('JWT callback: Recovered user ID', { userId: dbUser.id, email: token.email });
          } else {
            console.error('JWT callback: Could not find user', { email: token.email, googleId });
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl });

      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // Parse the URL
      const urlObj = new URL(url, baseUrl);
      const baseUrlObj = new URL(baseUrl);

      // Allow redirects to same origin or any akoolai.com subdomain
      if (
        urlObj.origin === baseUrlObj.origin ||
        urlObj.hostname.endsWith('akoolai.com')
      ) {
        return url;
      }

      return baseUrl + '/dashboard';
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
