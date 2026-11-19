export type Axis = 'vertical' | 'horizontal';

export const AXES: readonly Axis[] = ['vertical', 'horizontal'] as const;

export type Placement = 'left' | 'right' | 'above' | 'below';

export type AxisVisibility = 'auto' | 'always' | 'hidden';

export type TrackClickMode = 'page' | 'jump';

export type TouchMode = 'indicator' | 'bar';

export type IndicatorMode = 'auto' | 'near' | 'pinned';

export type MarkerAlign = 'center' | 'start';

export type ScrollbarVariant = 'fluent' | 'classic' | 'minimal';

export type HidePart = 'thumb' | 'button' | 'track' | 'corner' | 'marker' | 'card';

export interface ScrollMarker {
  id: string;
  label: string;
  axis?: Axis;
  position?: number;
  element?: Element;
  data?: unknown;
}

export type ScrollMarkerInput =
  | ScrollMarker
  | (Omit<ScrollMarker, 'id' | 'label'> & {
      id?: string;
      label?: string;
      element: Element;
    });

export interface MarkerEventDetail {
  marker: ScrollMarker;
  markers: ScrollMarker[];
}
