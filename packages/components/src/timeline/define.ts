import { define } from '@kerno/core';
import { KTimeline, KTimelineItem } from './timeline.js';

define('k-timeline', KTimeline);
define('k-timeline-item', KTimelineItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-timeline': KTimeline;
    'k-timeline-item': KTimelineItem;
  }
}
