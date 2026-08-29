import type { Profile } from '@/lib/types';

export function isAdmin(profile: Pick<Profile, 'role'> | null | undefined): boolean {
  return profile?.role === 'admin';
}

export function canViewJournal(visibility: 'private' | 'shared'): boolean {
  return visibility === 'shared';
}
