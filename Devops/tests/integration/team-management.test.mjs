import { describe, expect, it, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../backend/server.js';
import jwt from 'jsonwebtoken';

function createRoleCookie(role = 'Team Manager', emp_id = 201) {
    const token = jwt.sign(
        { emp_id, email: `${role.toLowerCase().replace(/\s+/g, '')}@taskflow.com`, role },
        process.env.JWT_SECRET_KEY || 'test_secret',
        { expiresIn: '1h' }
    );
    return `token=${token}`;
}

describe('Integration Tests - Team Management', () => {
    beforeEach(() => {
        global.__DB_MOCK__ = null;
        process.env.JWT_SECRET_KEY = 'test_secret';
    });

    it('denies team manager route access to regular Employee role', async () => {
        const empCookie = createRoleCookie('Employee', 301);

        const res = await supertest(app)
            .get('/teammanager/viewteam')
            .set('Cookie', [empCookie]);

        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('Permission Denied');
    });

    it('returns team list for authorized Team Manager', async () => {
        const mgrCookie = createRoleCookie('Team Manager', 201);
        global.__DB_MOCK__ = (q) => {
            if (q.includes('FROM Teams')) {
                return Promise.resolve({
                    rowCount: 1,
                    rows: [{ team_id: 10, emp_id: 301, firstname: 'Alice', lastname: 'Smith' }]
                });
            }
            return Promise.resolve({ rowCount: 0, rows: [] });
        };

        const res = await supertest(app)
            .get('/teammanager/viewteam')
            .set('Cookie', [mgrCookie]);

        expect(res.status).toBe(200);
        expect(res.body.team).toHaveLength(1);
        expect(res.body.team[0].firstname).toBe('Alice');
    });
});
