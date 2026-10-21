import { MODELS } from './catalog';
import { keyErrorView } from './key-errors';

const gpt = { name: MODELS.gpt.name };

describe('keyErrorView', () => {
  it('missing_key names the provider and the model, and offers Add key', () => {
    expect(keyErrorView({ code: 'missing_key', provider: 'openai' }, gpt, true)).toEqual({
      text: 'Add your OpenAI key to get an answer from GPT-5 mini.', action: 'addkey', button: 'Add key', provider: 'openai',
    });
  });
  it('key_rejected says the provider turned the key down and offers Fix key', () => {
    expect(keyErrorView({ code: 'key_rejected', provider: 'google' }, { name: 'Gemini 3 Flash' }, true)).toMatchObject({
      text: 'Google turned this key down.', action: 'fixkey', button: 'Fix key', provider: 'google',
    });
  });
  it('unsupported_model has no button, key_store_unavailable has the retry copy and no button', () => {
    expect(keyErrorView({ code: 'unsupported_model' }, gpt, true)).toEqual({ text: "This model isn't available any more. Branch to pick another.", action: null });
    expect(keyErrorView({ code: 'key_store_unavailable', provider: 'openai' }, gpt, true))
      .toEqual({ text: "Your keys can't be read right now. Try again in a minute.", action: null });
  });
  it('without a way to open the keys sheet the button is hidden', () => {
    expect(keyErrorView({ code: 'missing_key', provider: 'openai' }, gpt, false)!.action).toBeNull();
  });
  it('no code, or no provider on a key code, gives null so the plain message shows', () => {
    expect(keyErrorView({}, gpt, true)).toBeNull();
    expect(keyErrorView({ code: 'missing_key' }, gpt, true)).toBeNull();
  });
});
