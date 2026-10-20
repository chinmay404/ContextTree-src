import { ApiError, type EngineApi, type Id } from './api/types';

/**
 * Wraps an api so the route learns when the FIRST getBoard of `boardId` fails (404 / 503 / 401 become a page state).
 * Once any load of that board has succeeded, later getBoard failures (the store polls every 2 s while a source
 * is processing) are left to the store's own retry and toast; they never unmount a working board.
 */
export function guardFirstLoad(base: EngineApi, boardId: Id, onFail: (err: ApiError) => void): EngineApi {
  let loaded = false;
  return new Proxy(base, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof v !== 'function') return v;
      if (k !== 'getBoard') return v.bind(t);
      return async (id: Id) => {
        try {
          const b = await t.getBoard(id);
          if (id === boardId) loaded = true;
          return b;
        } catch (e) {
          if (!loaded && e instanceof ApiError && id === boardId) onFail(e);
          throw e;
        }
      };
    },
  });
}
