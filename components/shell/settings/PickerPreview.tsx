import type { ReactElement } from 'react';
import { Lock, Shield } from 'lucide-react';
import type { KeyStatusMap } from '../keys/status-types';
import { pickerPreview } from '../keys/providers';

/** The side panel: what the board's model picker will show with the keys saved so far, and how keys are kept. */
export function PickerPreview({ statuses }: { statuses: KeyStatusMap | null }): ReactElement {
  const { ready, locked } = pickerPreview(statuses);
  return (
    <aside className="kside" aria-label="What the model picker will show">
      <h4>What the model picker will show</h4>
      <div className="pickp">
        {ready.length > 0 && (
          <>
            <div className="grp">Ready</div>
            {ready.map((r) => (
              <div key={r.key} className={`pr${r.isDefault ? ' on' : ''}`} data-model-row={r.key} data-state="ready">
                <i className="mdot" style={{ background: r.color }} />{r.label}
                {r.isDefault && <span className="r">Default</span>}
              </div>
            ))}
          </>
        )}
        {locked.length > 0 && (
          <>
            <div className="grp">Needs a key</div>
            {locked.map((l) => (
              <div key={l.key} className="pr lock" data-model-row={l.key} data-state="locked">
                <i className="mdot" style={{ background: l.color }} />{l.label}
                <span className="r"><Lock size={11} strokeWidth={2} />{l.reason === 'fix-key' ? 'Fix key' : l.providerName}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="priv">
        <Shield size={17} strokeWidth={2} />
        <span><b>How keys are kept:</b> encrypted on our server and never sent back to your browser after you save them. Requests go from our server straight to the provider.</span>
      </div>
    </aside>
  );
}
