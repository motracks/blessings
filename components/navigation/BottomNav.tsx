'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sprout, ListChecks, ClipboardList, BookOpen } from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Home', icon: Sprout },
  { href: '/tasks', label: 'Selfcare', icon: ListChecks },
  { href: '/checkin', label: 'Check-in', icon: ClipboardList },
  { href: '/rewind', label: 'Rewind', icon: BookOpen },
  // Settings is temporarily hidden from the nav bar — route still exists at
  // /settings, just not linked here for now.
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-10 flex items-center justify-around border-t border-border bg-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 px-1 py-3 transition-all duration-300"
          >
            <Icon
              size={22}
              strokeWidth={1.75}
              className={isActive ? 'text-accent-text' : 'text-text-muted'}
            />
            <span
              className={`whitespace-nowrap text-[11px] ${isActive ? 'text-accent-text' : 'text-text-muted'}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
