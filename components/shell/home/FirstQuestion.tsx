'use client';
import type { ReactElement } from 'react';
import { ArrowUp } from 'lucide-react';

/** The first-question card on the empty desk (mockup C·empty). */
export function FirstQuestion({ value, onChange, onSubmit, busy, modelLabel, note }: {
  value: string;
  onChange(v: string): void;
  onSubmit(): void;
  busy: boolean;
  modelLabel: string | null;
  note: boolean;
}): ReactElement {
  const can = value.trim() !== '' && !busy;
  return (
    <div className="firstq">
      <div className="chd">
        <i className="mdot" aria-hidden="true" />
        <span className="mtag"><u>Q1</u> · {modelLabel ?? 'Pick a model after you add a key'}</span>
      </div>
      <div className="box">
        <textarea
          className="ta"
          rows={1}
          aria-label="What are you trying to figure out?"
          placeholder="What are you trying to figure out?"
          value={value}
          maxLength={4000}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); }
          }}
        />
        <button type="button" className="send" aria-label="Ask" disabled={!can} onClick={onSubmit}><ArrowUp size={16} strokeWidth={2} /></button>
      </div>
      {note && <p className="fnote" role="status">Add a key to get an answer. Your question is kept.</p>}
    </div>
  );
}
