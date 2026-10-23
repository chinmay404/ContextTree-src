import type { ReactElement } from 'react';
import { fitLabel, mapGeometry } from './geometry';
import type { BoardPreview } from './preview-types';

// Theme tokens (components/shell/tokens.css), so a map follows light and dark without redrawing.
const DESK = 'var(--pb-desk)';
const HAIR = 'var(--hairline)';
const INK = 'var(--pb-ink)';
const FILL = 'var(--pb-fill)';
const CARD = 'var(--pb-card)';

/**
 * A board drawn zoomed out: desks, colour pebbles and strings from card positions (the board's below-42% look).
 * Pure SVG with React text nodes only. `size` is a hint for stroke and label scale (the SVG itself fills its box).
 */
export function PebbleMap(p: {
  preview?: BoardPreview;
  title: string;
  labels?: boolean;
  detail?: boolean;
  pad?: number;
  size?: [number, number];
  className?: string;
}): ReactElement {
  const { preview, title, labels = false, detail = true, pad, size = [280, 168], className } = p;
  const g = mapGeometry(preview, { pad, title });
  const [bx, by, bw, bh] = g.box;
  const k = Math.min(size[0] / bw, size[1] / bh);
  const sw = Math.max(7, 1.8 / k);

  return (
    <svg
      role="img"
      aria-label={`Map of ${title}`}
      viewBox={`${bx} ${by} ${bw} ${bh}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {g.desks.map((d) => (
        <rect key={`d-${d.chatId}`} x={d.x} y={d.y} width={d.w} height={d.h} rx={26} fill={DESK} stroke={HAIR} strokeWidth={Math.max(2, 1 / k)} />
      ))}
      {g.strings.map((s, i) => (
        <path key={`s-${i}`} d={s.d} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round" />
      ))}
      {g.pebbles.map((q) =>
        q.kind === 'chat' ? (
          <g key={q.id}>
            <rect x={q.x} y={q.y + 8} width={q.w} height={q.h} rx={18} fill="rgba(0,0,0,.07)" />
            <rect x={q.x} y={q.y} width={q.w} height={q.h} rx={18} fill={q.fill} />
            {detail && (
              <>
                <rect x={q.x + 22} y={q.y + 24} width={170} height={16} rx={8} fill={INK} opacity={0.85} />
                <rect x={q.x + 22} y={q.y + 58} width={q.w - 44} height={44} rx={14} fill={FILL} />
                {[0, 1, 2].map((i) => (
                  <rect key={i} x={q.x + 22} y={q.y + 120 + i * 26} width={i === 2 ? 150 : q.w - 44} height={12} rx={6} fill={FILL} />
                ))}
              </>
            )}
          </g>
        ) : (
          <g key={q.id}>
            <rect x={q.x} y={q.y} width={q.w} height={q.h} rx={18} fill={q.fill} />
            {detail && (
              <>
                <rect x={q.x + 14} y={q.y + 14} width={44} height={44} rx={10} fill={CARD} />
                <rect x={q.x + 70} y={q.y + 20} width={110} height={12} rx={6} fill={q.rim} />
                <rect x={q.x + 70} y={q.y + 42} width={80} height={10} rx={5} fill={q.rim} opacity={0.6} />
              </>
            )}
          </g>
        ),
      )}
      {labels &&
        g.desks.map((d) => {
          const fs = 11 / k, th = 22 / k;
          const maxPx = Math.max(d.w * k - 6, 72);
          const txt = fitLabel(d.label, maxPx - 22);
          const tw = (txt.length * 6.3 + 22) / k;
          return (
            <g key={`l-${d.chatId}`}>
              <rect x={d.x + 14} y={d.y - th / 2} width={tw} height={th} rx={th / 2} fill={CARD} />
              <text x={d.x + 14 + 10 / k} y={d.y + fs * 0.36} fontSize={fs} fontWeight={700} fill={INK} fontFamily="Inter, sans-serif">
                {txt}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
