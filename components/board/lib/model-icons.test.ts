import { MODELS, modelInfo, type ModelKey } from './catalog';
import { MODEL_ICON_PATHS, modelMarkHtml, modelMarkSvg } from './model-icons';

const keys = Object.keys(MODELS) as ModelKey[];

describe('model icons', () => {
  it('every MODELS key has an icon with real path data', () => {
    for (const k of keys) {
      expect(MODEL_ICON_PATHS[k]?.length, k).toBeGreaterThan(0);
      for (const d of MODEL_ICON_PATHS[k]) expect(d, k).toMatch(/^M[\d.\-]/);
    }
  });

  it('the mark is tinted through currentColor, named, and carries the model colour', () => {
    const m = modelInfo(MODELS.gpt.engineId);
    const svg = modelMarkHtml(m);
    expect(svg).toContain('<svg');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('aria-label="GPT-5 mini"');
    expect(svg).not.toContain('<title>');   // the name is already text beside the mark; a <title> would double it in textContent and tooltips
    expect(svg).toContain(`--c:${MODELS.gpt.color}`);
    expect(svg).not.toContain('mdot');
  });

  it('an engine id the catalog does not know keeps the dot', () => {
    const html = modelMarkHtml(modelInfo('z-ai/glm-5.2'));
    expect(html).toContain('class="mdot"');
    expect(html).not.toContain('<svg');
    expect(modelMarkSvg(null, 'x', '#000')).toBeNull();
  });

  it('escapes the name', () => {
    expect(modelMarkSvg('gpt', '"><script>', '#000')).not.toContain('<script>');
  });
});
