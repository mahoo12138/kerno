const ElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

const WAVE_MS = 50;

export interface BoundaryMember extends HTMLElement {
  boundaryInfo(): { vertical: boolean; bands: number };
}

export interface WavePlace {
  offset: number;
  across: number;
}

interface Wave {
  start: number;
  members: BoundaryMember[];
  places: Map<BoundaryMember, WavePlace> | null;
}

/**
 * Start screen boundary (`<k-tile-bound>`) that couples the desktop band
 * entrance animations of all `<k-tile-group>` elements inside it so their
 * bands cascade 35ms apart across a shared vertical midpoint.
 *
 * @tag k-tile-bound
 */
export class KTileBoundary extends ElementBase {
  readonly #members = new Map<BoundaryMember, Wave | null>();
  #latest: Wave | null = null;
  #listening = false;

  add(member: BoundaryMember): void {
    if (!this.#members.has(member)) this.#members.set(member, null);
    if (!this.#listening && typeof window !== 'undefined') {
      this.#listening = true;
      window.addEventListener('resize', this.#onResize);
    }
  }

  delete(member: BoundaryMember): void {
    this.leave(member);
    this.#members.delete(member);
    if (!this.#members.size && this.#listening) {
      this.#listening = false;
      window.removeEventListener('resize', this.#onResize);
    }
  }

  join(member: BoundaryMember, now: number): void {
    this.leave(member);
    let wave = this.#latest;
    if (!wave || !wave.members.length || now - wave.start > WAVE_MS) {
      wave = { start: now, members: [], places: null };
      this.#latest = wave;
    }
    wave.members.push(member);
    wave.places = null;
    this.#members.set(member, wave);
  }

  leave(member: BoundaryMember): void {
    const wave = this.#members.get(member);
    if (!wave) return;
    this.#members.set(member, null);
    const i = wave.members.indexOf(member);
    if (i >= 0) wave.members.splice(i, 1);
    wave.places = null;
  }

  changed(member: BoundaryMember): void {
    const wave = this.#members.get(member);
    if (wave) wave.places = null;
  }

  place(member: BoundaryMember): WavePlace | null {
    const wave = this.#members.get(member);
    if (!wave) return null;
    if (!wave.places) wave.places = measure(wave.members);
    return wave.places.get(member) || null;
  }

  #onResize = (): void => {
    this.#members.forEach((wave) => {
      if (wave) wave.places = null;
    });
  };
}

function measure(list: BoundaryMember[]): Map<BoundaryMember, WavePlace> {
  const members = list.slice().sort(documentOrder);
  const rects = members.map((m) => m.getBoundingClientRect());
  const infos = members.map((m) => m.boundaryInfo());
  const bands = infos.map((i) => i.bands);
  const offsets: Record<string, number[]> = {};
  const offsetsAlong = (vertical: boolean): number[] => {
    const key = vertical ? 'v' : 'h';
    if (!offsets[key]) {
      offsets[key] = bandOffsets(
        rects.map((r) => (vertical ? r.top : r.left)),
        bands,
      );
    }
    return offsets[key]!;
  };
  const places = new Map<BoundaryMember, WavePlace>();
  members.forEach((m, i) => {
    const vertical = infos[i]!.vertical;
    const r = rects[i]!;
    const middle = vertical
      ? spanMiddle(
          rects.map((q) => q.left),
          rects.map((q) => q.right),
        )
      : spanMiddle(
          rects.map((q) => q.top),
          rects.map((q) => q.bottom),
        );
    places.set(m, {
      offset: offsetsAlong(vertical)[i]!,
      across: middle - (vertical ? r.left : r.top),
    });
  });
  return places;
}

function documentOrder(a: Node, b: Node): number {
  const position = a.compareDocumentPosition(b);
  if (position & Node.DOCUMENT_POSITION_DISCONNECTED) return 0;
  return position & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : position & Node.DOCUMENT_POSITION_PRECEDING
      ? 1
      : 0;
}

export function bandOffsets(leads: number[], bands: number[]): number[] {
  const order = leads.map((_, i) => i);
  order.sort((a, b) => leads[a]! - leads[b]! || a - b);
  const out: number[] = new Array<number>(leads.length);
  let sum = 0;
  for (const i of order) {
    out[i] = sum;
    sum += bands[i]!;
  }
  return out;
}

export function spanMiddle(starts: number[], ends: number[]): number {
  return (Math.min(...starts) + Math.max(...ends)) / 2;
}

export function bandCount(extent: number, bandSize: number): number {
  return Math.ceil(extent / Math.max(1, bandSize));
}

export function closestBoundary(node: Node): KTileBoundary | null {
  for (
    let n: Node | null = node.parentNode || (node as ShadowRoot).host || null;
    n;
    n = n.parentNode || (n as ShadowRoot).host || null
  ) {
    if (n instanceof KTileBoundary) return n;
  }
  return null;
}
