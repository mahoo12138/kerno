import { afterEach, describe, expect, it } from 'vitest';
import './define.js';
import { deriveInitials, type KAvatar, type KAvatarGroup } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-avatar> & <k-avatar-group>', () => {
  it('derives initials cleanly for Latin, multi-word, and CJK names', () => {
    expect(deriveInitials('Ada Lovelace')).toBe('AL');
    expect(deriveInitials('Grace Murray Hopper')).toBe('GH');
    expect(deriveInitials('kerno')).toBe('K');
    expect(deriveInitials('张三')).toBe('张');
    expect(deriveInitials('')).toBe('');
  });

  it('falls back to derived initials on image error and renders built-in user icon when empty', async () => {
    document.body.innerHTML = `
      <k-avatar id="a" alt="Ada Lovelace" status="online"></k-avatar>
      <k-avatar id="b"></k-avatar>
    `;
    const a = document.getElementById('a') as KAvatar;
    const b = document.getElementById('b') as KAvatar;
    await Promise.all([a.updateComplete, b.updateComplete]);

    expect(a.shadowRoot!.querySelector('.fallback-content')!.textContent).toBe('AL');
    expect(a.shadowRoot!.querySelector('.status')!.getAttribute('aria-label')).toBe('online');
    expect(a.shadowRoot!.querySelector('.base')!.getAttribute('role')).toBe('img');

    expect(b.shadowRoot!.querySelector('.fallback-content svg')).not.toBeNull();

    // Simulate failed image src fallback
    a.src = 'data:image/png;base64,invalid';
    await a.updateComplete;
    const img = a.shadowRoot!.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    await a.updateComplete;
    expect(img.hidden).toBe(true);
    expect(a.shadowRoot!.querySelector<HTMLElement>('.fallback')!.hidden).toBe(false);
    expect(a.shadowRoot!.querySelector('.fallback-content')!.textContent).toBe('AL');
  });

  it('activates ShapeOutlineController for chamfer/scallop/notch shapes', async () => {
    document.body.innerHTML = '<k-avatar shape="chamfer" initials="KN"></k-avatar>';
    const el = document.querySelector('k-avatar') as KAvatar;
    await el.updateComplete;
    const frame = el.shadowRoot!.querySelector<HTMLElement>('.frame')!;
    expect(frame.style.clipPath).toContain('path(');
    expect(frame.querySelector('.shape-stroke')).not.toBeNull();

    el.shape = 'circle';
    await el.updateComplete;
    expect(frame.style.clipPath).toBe('');
    expect(frame.querySelector('.shape-stroke')).toBeNull();
  });

  it('collapses excess avatars behind a +N overflow counter in <k-avatar-group>', async () => {
    document.body.innerHTML = `
      <k-avatar-group max="3">
        <k-avatar initials="A"></k-avatar>
        <k-avatar initials="B"></k-avatar>
        <k-avatar initials="C"></k-avatar>
        <k-avatar initials="D"></k-avatar>
        <k-avatar initials="E"></k-avatar>
      </k-avatar-group>
    `;
    const group = document.querySelector('k-avatar-group') as KAvatarGroup;
    await group.updateComplete;

    const avatars = [...group.querySelectorAll('k-avatar')];
    expect(avatars[2]!.hasAttribute('data-k-avatar-overflow')).toBe(false);
    expect(avatars[3]!.hasAttribute('data-k-avatar-overflow')).toBe(true);
    expect(avatars[4]!.hasAttribute('data-k-avatar-overflow')).toBe(true);

    const overflow = group.shadowRoot!.querySelector<HTMLElement>('.overflow')!;
    expect(overflow.hidden).toBe(false);
    expect(overflow.textContent).toBe('+2');

    group.max = 0;
    await group.updateComplete;
    expect(avatars.every((a) => !a.hasAttribute('data-k-avatar-overflow'))).toBe(true);
    expect(overflow.hidden).toBe(true);
  });
});
