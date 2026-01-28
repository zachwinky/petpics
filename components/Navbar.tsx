'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    creditsBalance?: number;
    isAdmin?: boolean;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-base md:text-2xl font-bold text-indigo-600">Petpics</span>
          </Link>

          {/* Right side - Auth & Credits */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {user ? (
              <>
                {/* Credits Display */}
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1.5 md:py-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <div className="text-lg md:text-2xl">💎</div>
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-gray-600 hidden md:block">Credits</span>
                    <span className="text-sm md:text-base font-bold text-indigo-600">
                      {user.creditsBalance ?? 0}
                    </span>
                  </div>
                </Link>

                {/* User Menu */}
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Link
                    href="/dashboard"
                    className="text-xs md:text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    Dashboard
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden md:block text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-sm font-medium text-gray-900">
                        {user.name || 'User'}
                      </span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="px-2 md:px-3 py-1.5 text-xs md:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
