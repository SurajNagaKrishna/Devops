import { describe, expect, it, vi } from 'vitest';
import withTransaction from '../../backend/transaction.js';

describe('Unit Tests - DB Transaction Wrapper', () => {
    it('executes BEGIN, action, and COMMIT on success', async () => {
        const client = {
            query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
            release: vi.fn(),
        };
        const customPool = { connect: vi.fn().mockResolvedValue(client) };

        const result = await withTransaction(async (c) => {
            await c.query('SELECT 1');
            return 'SUCCESS';
        }, customPool);

        expect(result).toBe('SUCCESS');
        expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
        expect(client.query).toHaveBeenNthCalledWith(2, 'SELECT 1');
        expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('executes ROLLBACK and releases client on failure', async () => {
        const client = {
            query: vi.fn().mockImplementation((q) => {
                if (q === 'BEGIN') return Promise.resolve({});
                if (q === 'FAIL') return Promise.reject(new Error('Simulated Query Failure'));
                if (q === 'ROLLBACK') return Promise.resolve({});
            }),
            release: vi.fn(),
        };
        const customPool = { connect: vi.fn().mockResolvedValue(client) };

        await expect(
            withTransaction(async (c) => {
                await c.query('FAIL');
            }, customPool)
        ).rejects.toThrow('Simulated Query Failure');

        expect(client.query).toHaveBeenCalledWith('ROLLBACK');
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
