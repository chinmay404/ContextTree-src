import { esc } from '../lib/format';
import {
  Play, AudioLines, FileText, FilePenLine, StickyNote, Globe, Sheet, Image, Layers, MessageCircle,
  GitFork, Plus, Minus, Maximize, Link, Maximize2, ChevronsDownUp, ChevronsUpDown, Ungroup, X, TriangleAlert,
  Unlink, GitBranch, ArrowUp, SlidersHorizontal, ChevronDown, ArrowLeft, Copy, Upload, Ellipsis, GlobeLock,
  Trash2, RotateCcw, SquareDashed, Spline, ArrowRight, BookOpen, CornerLeftUp, Mouse, Sparkles,
  Bold, Italic, Heading, List, ListOrdered, Code,
} from 'lucide';

/** Prototype's lucide-static names mapped to lucide@0.460.0 canonical export keys (more-horizontal is Ellipsis). */
const NODES = {
  'play': Play, 'audio-lines': AudioLines, 'file-text': FileText, 'file-pen-line': FilePenLine,
  'sticky-note': StickyNote, 'globe': Globe, 'sheet': Sheet, 'image': Image, 'layers': Layers,
  'message-circle': MessageCircle, 'git-fork': GitFork, 'plus': Plus, 'minus': Minus, 'maximize': Maximize,
  'link': Link, 'maximize-2': Maximize2, 'chevrons-down-up': ChevronsDownUp, 'chevrons-up-down': ChevronsUpDown,
  'ungroup': Ungroup, 'x': X, 'triangle-alert': TriangleAlert, 'unlink': Unlink, 'git-branch': GitBranch,
  'arrow-up': ArrowUp, 'sliders-horizontal': SlidersHorizontal, 'chevron-down': ChevronDown,
  'arrow-left': ArrowLeft, 'copy': Copy, 'upload': Upload, 'more-horizontal': Ellipsis, 'globe-lock': GlobeLock,
  'trash-2': Trash2, 'rotate-ccw': RotateCcw,
  // welcome tour
  'square-dashed': SquareDashed, 'spline': Spline, 'arrow-right': ArrowRight, 'book-open': BookOpen,
  'corner-left-up': CornerLeftUp, 'mouse': Mouse, 'sparkles': Sparkles,
  // note formatting bar
  'bold': Bold, 'italic': Italic, 'heading': Heading, 'list': List, 'list-ordered': ListOrdered, 'code': Code,
} as const;

export const ICON_NAMES: string[] = Object.keys(NODES);

const cache = new Map<string, string>();

type IconNode = [tag: string, attrs: Record<string, string | number>, children?: IconNode[]];

/** lucide's createElement builds DOM nodes; serializing the node tree to a string keeps icon() safe on the server. */
function serialize([tag, attrs, children = []]: IconNode): string {
  const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  return `<${tag}${a}>${children.map(serialize).join('')}</${tag}>`;
}

/** Serialized <svg> for a name (cached). Throws on a name the board doesn't use. */
export function iconSvg(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const node = (NODES as Record<string, unknown>)[name];
  if (!node) throw new Error(`Unknown icon: ${name}`);
  const svg = serialize(node as IconNode);
  cache.set(name, svg);
  return svg;
}

/** `<span class="i" style="--c:…;--s:…px"><svg/></span>`; colour and size are optional. */

export function icon(name: string, color?: string, size?: number): string {
  const style = `${color ? `--c:${esc(color)};` : ''}${size ? `--s:${size}px;` : ''}`;
  return `<span class="i"${style ? ` style="${style}"` : ''}>${iconSvg(name)}</span>`;
}
