import { buildExport, changePasswordSchema } from './account';
import { AVATAR_MAX_BYTES, validateAvatarFile } from './avatarStorage';

describe('changePasswordSchema', () => {
  const ok = { current: 'old-password-1', next: 'brand-new-pass', confirm: 'brand-new-pass' };

  it('accepts a valid change', () => {
    expect(changePasswordSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects passwords shorter than 10 characters', () => {
    expect(changePasswordSchema.safeParse({ ...ok, next: 'short', confirm: 'short' }).success).toBe(
      false,
    );
  });

  it('rejects a mismatching confirmation', () => {
    const r = changePasswordSchema.safeParse({ ...ok, confirm: 'something-else' });
    expect(r.success).toBe(false);
  });

  it('rejects reusing the current password', () => {
    const r = changePasswordSchema.safeParse({
      current: 'same-password-1',
      next: 'same-password-1',
      confirm: 'same-password-1',
    });
    expect(r.success).toBe(false);
  });
});

describe('buildExport', () => {
  it('bundles the account and profile with a timestamp', () => {
    const out = buildExport(
      { id: 'u1', email: 'a@b.c', created_at: '2026-01-01' },
      { display_name: 'Соня' },
      new Date('2026-09-29T10:00:00Z'),
    );
    expect(out).toEqual({
      exported_at: '2026-09-29T10:00:00.000Z',
      account: { id: 'u1', email: 'a@b.c', created_at: '2026-01-01' },
      profile: { display_name: 'Соня' },
    });
  });
});

describe('validateAvatarFile', () => {
  it('accepts small png/jpeg/webp', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/webp', size: 1000 })).toBeNull();
  });

  it('rejects other types and oversize files', () => {
    expect(validateAvatarFile({ type: 'image/svg+xml', size: 1000 })).toBe('type');
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toBe('size');
  });
});
