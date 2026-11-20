import { define } from '@kerno/core';
import { KCommand, KCommandGroup, KCommandItem } from './command.js';

define('k-command', KCommand);
define('k-command-group', KCommandGroup);
define('k-command-item', KCommandItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-command': KCommand;
    'k-command-group': KCommandGroup;
    'k-command-item': KCommandItem;
  }
}
