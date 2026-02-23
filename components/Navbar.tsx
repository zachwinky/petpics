'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    creditsBalance?: number;
    isAdmin?: boolean;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { itemCount } = useCart();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-lg md:text-2xl">🐾</span>
            <span className="text-base md:text-2xl font-bold text-coral-600">Petpics</span>
          </Link>

          {/* Right side - Auth & Navigation */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {user ? (
              <>
                {/* Dashboard link */}
                <Link
                  href="/dashboard"
                  className="text-xs md:text-sm font-medium text-gray-700 hover:text-coral-600 transition-colors"
                >
                  Dashboard
                </Link>

                {/* Cart icon */}
                <Link
                  href="/print/cart"
                  className="relative p-1.5 md:p-2 text-gray-600 hover:text-coral-600 transition-colors"
                  title="Cart"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-coral-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
                      {itemCount}
                    </span>
                  )}
                </Link>

                {/* User Menu */}
                <div className="flex items-center space-x-2 md:space-x-3">
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
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 transition-colors"
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
