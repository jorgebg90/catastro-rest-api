import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    CadastreTimeoutError,
    CadastreUnavailableError,
    PropertyNotFoundError,
} from '../../../src/domain/errors/index.js';
import { err, ok } from '../../../src/domain/result.js';
import { withRetry } from '../../../src/infrastructure/soap/retry.js';

const opts = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, totalBudgetMs: 10_000, random: () => 0.5 };

describe('retry policy (US2-S3)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('US2-S3: retries transient failures with exponential delay then succeeds', async () => {
        const fn = vi
            .fn()
            .mockResolvedValueOnce(err(new CadastreUnavailableError('a')))
            .mockResolvedValueOnce(err(new CadastreTimeoutError('b')))
            .mockResolvedValueOnce(ok('done'));
        const p = withRetry(fn, opts);
        await vi.advanceTimersByTimeAsync(0);
        expect(fn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(75);
        expect(fn).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(150);
        expect(fn).toHaveBeenCalledTimes(3);
        expect(await p).toEqual(ok('done'));
    });

    it('US2-S3: returns the last error after exhausting attempts', async () => {
        const fn = vi.fn().mockResolvedValue(err(new CadastreUnavailableError('x')));
        const p = withRetry(fn, opts);
        await vi.runAllTimersAsync();
        const r = await p;
        expect(fn).toHaveBeenCalledTimes(3);
        expect(!r.ok && r.error).toBeInstanceOf(CadastreUnavailableError);
    });

    it('does not retry non-transient errors', async () => {
        const fn = vi.fn().mockResolvedValue(err(new PropertyNotFoundError('nf')));
        await withRetry(fn, opts);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('stops retrying when the total budget would be exceeded', async () => {
        const fn = vi.fn().mockResolvedValue(err(new CadastreUnavailableError('x')));
        const p = withRetry(fn, { ...opts, totalBudgetMs: 10 });
        await vi.runAllTimersAsync();
        await p;
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
