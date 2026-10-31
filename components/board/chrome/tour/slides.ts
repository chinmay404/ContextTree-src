import type { SceneKey } from './TourScenes';

/** One slide per word a new user needs. Order is the order of the tour. */
export interface Slide { scene: SceneKey; icon: string; term: string; title: string; body: string }

export const SLIDES: readonly Slide[] = [
  { scene: 'chat', icon: 'message-circle', term: 'Chat',
    title: 'Every question gets its own card',
    body: 'Press Add, or just hit Q, to ask something. The answer lives on the board where you can see it.' },
  { scene: 'source', icon: 'file-text', term: 'Source',
    title: 'Bring in what you already know',
    body: 'Drop files, paste links or write notes. PDFs, docs, web pages and YouTube videos all become sources.' },
  { scene: 'desk', icon: 'square-dashed', term: 'Desk',
    title: 'A desk is what a chat reads',
    body: 'Drag a source onto a chat’s desk and that chat reads it when it answers.' },
  { scene: 'string', icon: 'spline', term: 'String',
    title: 'Share one source with any chat',
    body: 'Pull a string from a source’s handle into another chat. Both chats read it, and nothing is copied.' },
  { scene: 'branch', icon: 'git-fork', term: 'Branch',
    title: 'Branch off to try another path',
    body: 'Pull from a chat’s right handle into empty board. The branch starts from a summary and reads the desk above.' },
  { scene: 'pile', icon: 'layers', term: 'Pile',
    title: 'Stack sources into a pile',
    body: 'Drop one source on another to make a pile. Scroll over it to flip through what’s inside.' },
  { scene: 'draw', icon: 'pencil', term: 'Draw',
    title: 'Mark up the board',
    body: 'Press D or the pen beside Add to circle, point and highlight. A mark on a card moves with it, and the AI doesn’t read your drawings.' },
  { scene: 'note', icon: 'sticky-note', term: 'Note page',
    title: 'Type or write on a note',
    body: 'Open a note and tap the pen to write on the same page. Your palm leaves no marks on a tablet. The AI reads what you type.' },
];
