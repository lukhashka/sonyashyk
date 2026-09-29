import type { uk } from './uk';

export const en: typeof uk = {
  common: {
    appName: 'Sonyashyk',
    nav: { more: 'More', menu: 'Menu', collapse: 'Collapse menu', main: 'Main navigation' },
    greeting: {
      morning: 'Good morning, {{name}} 🌸',
      day: 'Good afternoon, {{name}} ☀️',
      evening: 'Good evening, {{name}} 🌙',
      night: 'Remember to rest, {{name}} ✨',
    },
    defaultName: 'sunshine',
    loading: 'Loading…',
    error: {
      title: 'Oops, something went wrong',
      text: 'Try refreshing the page.',
      retry: 'Try again',
    },
    auth: {
      notConfigured: 'Supabase setup required',
      notConfiguredHint: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
      title: 'Sign in to Sonyashyk 🌻',
      subtitle: 'This space is private. Sign in with your email.',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      invalid: 'Could not sign in. Check your email and password.',
      required: 'Please fill this in',
      mfaTitle: 'Verification code',
      mfaHint: 'Enter the 6-digit code from your authenticator app.',
      mfaCode: 'Code',
      mfaInvalid: 'Wrong code. Please try again.',
      mfaSubmit: 'Verify',
      mfaCancel: 'Sign out',
    },
    daily: {
      xp: '{{count}} XP',
      minutes: '{{count}} min',
      go: 'Start',
      markDone: 'Done',
      done: 'Done',
      error: 'Could not update the task. Please try again.',
      dayComplete: 'Day complete!',
      dayCompleteHint: 'You did great. Bonus XP added and your streak is updated 🔥',
    },
    empty: { title: 'Nothing here yet' },
  },
};
