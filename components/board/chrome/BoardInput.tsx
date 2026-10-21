'use client';
/** Window-level input for adding things: drag and drop, paste, N / Q / Enter, double-click and right-click on the board. */
import { useEffect } from 'react';
import { useBoard } from '../context';
import { typing } from '../lib/util';
import { overlayOpen } from '../store';

const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
const hasLink = (e: DragEvent): boolean => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('text/uri-list');
const isUrl = (s: string): boolean => /^https?:\/\//i.test(s);

/** The first http(s) URL a drag carries (a link dragged from a browser or the address bar). */
function droppedUrl(dt: DataTransfer): string | null {
  const list = dt.getData('text/uri-list').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
  if (list && isUrl(list)) return list;
  const text = dt.getData('text/plain').trim();
  return isUrl(text) ? text : null;
}

/** Renders nothing; installs the listeners. */
export function BoardInput(): null {
  const { store, engine } = useBoard();

  useEffect(() => {
    if (!engine) return;
    const ui = () => store.getSnapshot().ui;
    // A sheet, viewer, focus view, confirm or compare sheet owns the pointer; the Add menu and link pop do not block.
    const covered = () => { const u = ui(); return !!(u.dialog || u.viewer || u.focus || u.confirm || u.compare); };
    const { viewport } = engine.ctx;

    let depth = 0;
    const hide = () => { depth = 0; store.setDropping(false); };
    const onEnter = (e: DragEvent) => { if (hasFiles(e) || hasLink(e)) { depth++; if (!covered()) store.setDropping(true); } };
    const onLeave = (e: DragEvent) => { if (!hasFiles(e) && !hasLink(e)) return; depth = Math.max(0, depth - 1); if (!depth) store.setDropping(false); };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e) && !hasLink(e)) return;
      if (typing(e.target) && !hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (!dt || (!hasFiles(e) && !hasLink(e))) return;
      if (typing(e.target) && !hasFiles(e)) return;   // a link dragged into a field stays there
      e.preventDefault();
      hide();
      if (covered()) return;
      const [x, y] = engine.ctx.s2w(e.clientX, e.clientY), deskId = engine.deskAt(x, y);
      const files = Array.from(dt.files ?? []);
      if (files.length) { engine.addFiles(files, [x, y], deskId); return; }
      const url = droppedUrl(dt);
      if (url) engine.addLink(url, deskId, [x, y]);
    };

    const onPaste = (e: ClipboardEvent) => {
      if (typing(e.target) || overlayOpen(ui())) return;
      const text = (e.clipboardData?.getData('text') ?? '').trim();
      if (!text) return;
      e.preventDefault();
      const deskId = engine.selectedDesk();
      if (isUrl(text) && engine.addLink(text, deskId, null)) return;
      engine.addPastedNote(text, deskId);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key === 'Escape' || typing(e.target) || overlayOpen(ui())) return;
      if (e.target instanceof Element && e.target.closest('[data-pb="boardmenu"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === 'Enter') {
        const id = ui().selected, c = id ? store.graph().cards.get(id) : undefined;
        if (!c || (e.target instanceof HTMLElement && e.target.closest('button, a, summary'))) return;
        if (c.kind === 'chat') { e.preventDefault(); store.openFocus(c.id); }
        else if (c.status === 'ready' || c.status === 'soon') {
          e.preventDefault();
          store.openViewer(c.id, null, engine.ctx.nodes.get(c.id)?.el.getBoundingClientRect() ?? null);
        }
      } else if (k === 'n' && !e.repeat) {
        e.preventDefault();
        const [x, y] = engine.ctx.s2w(innerWidth / 2, innerHeight / 2);
        engine.spawnNote(...engine.freeSpot(x - 106, y - 30, 212, 90));
      } else if (k === 'q' && !e.repeat) {
        e.preventDefault();
        store.openDialog({ mode: 'root' });
      }
    };

    // Pointer capture retargets a card's double-click to the viewport, so engine.downOnCard() says where the press began.
    const onDbl = (e: MouseEvent) => {
      if (engine.downOnCard() || overlayOpen(ui())) return;
      if (document.elementFromPoint(e.clientX, e.clientY)?.closest('.card')) return;
      const [x, y] = engine.ctx.s2w(e.clientX, e.clientY);
      engine.spawnNote(x - 106, y - 30);
    };
    const onContext = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      const card = t?.closest<HTMLElement>('.card[data-id]');
      if (card) {
        // The browser's own menu stays for text (copy, paste, spell check) and links; elsewhere on a card the card's menu opens.
        if (t!.closest('textarea, input, [contenteditable], a[href]') || covered()) return;
        e.preventDefault();
        store.openCardMenu(e.clientX, e.clientY, card.dataset.id!);
        return;
      }
      if (covered()) return;
      e.preventDefault();
      store.openMenu({ x: e.clientX, y: e.clientY, at: engine.ctx.s2w(e.clientX, e.clientY), fromAdd: false });
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    viewport.addEventListener('dblclick', onDbl);
    viewport.addEventListener('contextmenu', onContext);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKey);
      viewport.removeEventListener('dblclick', onDbl);
      viewport.removeEventListener('contextmenu', onContext);
      store.setDropping(false);
    };
  }, [store, engine]);

  return null;
}
