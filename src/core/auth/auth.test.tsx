import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { profileSchema } from './profile';

vi.mock('@/core/api/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }));

const authState = { session: null as unknown, loading: false };
vi.mock('./AuthProvider', () => ({ useAuth: () => authState }));

const { RequireAuth } = await import('./RequireAuth');

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/secret" element={<p>secret</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects anonymous users to /login', () => {
    authState.session = null;
    renderGuarded();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders content for a signed-in user', () => {
    authState.session = { user: { id: 'u1' } };
    renderGuarded();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});

describe('profileSchema', () => {
  const ok = {
    display_name: 'Соня',
    bio: '',
    avatar_emoji: '🌻',
    timezone: 'Europe/Kyiv',
    day_rollover_hour: 4,
    locale: 'uk' as const,
    theme: 'light' as const,
    daily_goal_xp: 50,
  };

  it('accepts valid data and rejects out-of-range values', () => {
    expect(profileSchema.safeParse(ok).success).toBe(true);
    expect(profileSchema.safeParse({ ...ok, day_rollover_hour: 24 }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, locale: 'fr' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, display_name: 'x'.repeat(61) }).success).toBe(false);
  });
});
