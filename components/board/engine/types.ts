import type { Id, ProviderId } from '../api/types';
import type { BoardStore } from '../store';
import type { Box, Camera } from './camera';
import type { Layout, LayoutItem } from './geometry';
import type { Spring, SpringSystem } from './spring';

/** One card on the board: its layout springs plus the DOM element and per-view state (never persisted). */
export interface ViewNode extends LayoutItem { el: HTMLDivElement; s: Spring; o: Spring; front: number; open: boolean; fresh: boolean }

export interface DesksModule {
  sync(): void; frame(z: number): void; deskAt(x: number, y: number, except?: ViewNode | null): Id | null;
  setHot(chatId: Id | null): void; onCardDropped(n: ViewNode): void; onChatDropped(n: ViewNode): void;
  chatAt(clientX: number, clientY: number): Id | null;
  fade(related: Set<Id> | null): void; deskBox(chatId: Id): Box | null; dispose(): void;
}
export interface StringsModule {
  frame(): void; startString(n: ViewNode, kind: 'src' | 'chat', e: PointerEvent): void; isLive(): boolean;
  wireKeys(): string[]; selectedWire(): string | null; clearWire(): boolean; wirePillOn(key: string): boolean;
  wirePoint(key: string, frac: number): [number, number] | null; clickDisconnect(key: string): void;
  stringMid(key: string): { y: number; ty: number } | null; dispose(): void;
}
export interface PilesModule {
  hoverTarget(n: ViewNode, ev: PointerEvent): ViewNode | null; drop(n: ViewNode, target: ViewNode): void;
  onWheel(e: WheelEvent): boolean; cycle(id: Id, dir: 1 | -1): void; front(id: Id): number; unstack(id: Id): void; dispose(): void;
}
export interface PersistenceModule { frame(now: number): void; resetViewportBase(): void; markSynced(id: Id, x: number, y: number): void; isDirty(id: Id): boolean; dispose(): void }

export interface EngineContext {
  store: BoardStore; springs: SpringSystem; camera: Camera; rm: boolean;
  root: HTMLElement; viewport: HTMLDivElement; world: HTMLDivElement; tubes: SVGSVGElement; knobs: HTMLDivElement;
  nodes: Map<Id, ViewNode>; size(): 'S' | 'M'; layout(): Layout; nextZ(): number;
  render(id: Id): void; renderAll(): void; jiggle(id: Id, amt?: number): void; s2w(cx: number, cy: number): [number, number];
  track(e: PointerEvent, move: (ev: PointerEvent) => void, up: (ev: PointerEvent) => void): void;
  /** The shell's way to open the keys sheet (null: no shell, so key errors show no button). Set by the Board after mount. */
  openSettings: ((provider: ProviderId) => void) | null;
  modules: { desks: DesksModule; strings: StringsModule; piles: PilesModule; persistence: PersistenceModule };
}
