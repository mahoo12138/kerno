import { define } from '@kerno/core';
import { KAvatar, KAvatarGroup } from './avatar.js';

define('k-avatar', KAvatar);
define('k-avatar-group', KAvatarGroup);

declare global {
  interface HTMLElementTagNameMap {
    'k-avatar': KAvatar;
    'k-avatar-group': KAvatarGroup;
  }
}
