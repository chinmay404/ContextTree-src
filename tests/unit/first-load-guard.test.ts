import { describe, it, expect, vi } from 'vitest';
import { guardFirstLoad } from '../../components/board/first-load-guard';
import { MockEngineApi, SEED_BOARD_ID } from '../../components/board/api/mock/mock-engine-api';
import { ApiError } from '../../components/board/api/types';

describe('guardFirstLoad', () => {
  it('reports a 503 on the first load', async () => {
    const mock = new MockEngineApi(); const onFail = vi.fn();
    mock.failNext('getBoard', new ApiError(503, 'engine_unavailable'));
    await expect(guardFirstLoad(mock, SEED_BOARD_ID, onFail).getBoard(SEED_BOARD_ID)).rejects.toThrow();
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail.mock.calls[0][0].status).toBe(503);
  });
  it('reports a 404 on the first load', async () => {
    const onFail = vi.fn();
    await expect(guardFirstLoad(new MockEngineApi(), 'nope', onFail).getBoard('nope')).rejects.toThrow();
    expect(onFail.mock.calls[0][0].status).toBe(404);
  });
  it('does not report a 503 after the board has loaded (poll failure)', async () => {
    const mock = new MockEngineApi(); const onFail = vi.fn();
    const api = guardFirstLoad(mock, SEED_BOARD_ID, onFail);
    await api.getBoard(SEED_BOARD_ID);
    mock.failNext('getBoard', new ApiError(503, 'engine_unavailable'));
    await expect(api.getBoard(SEED_BOARD_ID)).rejects.toThrow();
    expect(onFail).not.toHaveBeenCalled();
  });
  it('passes other methods through bound to the api', async () => {
    const api = guardFirstLoad(new MockEngineApi(), SEED_BOARD_ID, () => {});
    expect((await api.listBoards()).length).toBeGreaterThan(0);
  });
});
