'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useCart } from '@/lib/cart-context';
import Link from 'next/link';

interface DashboardNavbarProps {
  user: {
    name: string | null;
    email: string;
    isAdmin: boolean;
  } | null;
}

export default function DashboardNavbar({ user }: DashboardNavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { itemCount } = useCart();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const scrollToNewOrder = () => {
    document.getElementById('new-order')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="dash-nav">
      <Link href="/" className="dash-nav-logo">
        <span style={{ fontSize: '1.1rem' }}>🦈</span> petpics
      </Link>
      <div className="dash-nav-right">
        <button className="dash-nav-cta" onClick={scrollToNewOrder}>
          New Order
        </button>

        {/* Cart */}
        <Link href="/print/cart" className="dash-nav-cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {itemCount > 0 && (
            <span className="dash-nav-cart-badge">{itemCount}</span>
          )}
        </Link>

        {/* User menu */}
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="dash-nav-user"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="dash-nav-user-avatar">{initials}</div>
            </button>

            {dropdownOpen && (
              <div className="dash-nav-dropdown">
                <div style={{ padding: '10px 16px', fontSize: '0.78rem', color: 'var(--lp-soft-brown)' }}>
                  {user.name || user.email}
                </div>
                <div className="dash-nav-dropdown-divider" />
                <Link href="/dashboard" onClick={() => setDropdownOpen(false)}>Dashboard</Link>
                {user.isAdmin && (
                  <Link href="/admin" onClick={() => setDropdownOpen(false)}>Admin</Link>
                )}
                <div className="dash-nav-dropdown-divider" />
                <button onClick={() => signOut({ callbackUrl: '/' })}>Sign Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
