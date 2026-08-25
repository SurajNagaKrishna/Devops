import { describe, expect, it, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../backend/server.js';
import jwt from 'jsonwebtoken';

function createAdminCookie() {
    const token = jwt.sign(
        { emp_id: 101, email: 'admin@taskflow.com', role: 'Admin' },
        process.env.JWT_SECRET_KEY || 'test_secret',
        { expiresIn: '1h' }
    );
    return `token=${token}`;
}

describe('Integration Tests - Auth & Registration Flow', () => {
    beforeEach(() => {
        global.__DB_MOCK__ = null;
        process.env.JWT_SECRET_KEY = 'test_secret';
    });

    it('rejects registration attempt without Admin cookie', async () => {
        const res = await supertest(app)
            .post('/register')
            .send({ Fname: 'John', lname: 'Doe', email: 'john@test.com', password: 'password123', role: 'Employee', phone: '9876543210' });

        expect(res.status).toBe(401);
        expect(res.body.msg).toBe('Not Authorized');
    });

    it('returns 409 Conflict when registering duplicate email', async () => {
        const adminCookie = createAdminCookie();
        const err = new Error('duplicate key value violates unique constraint');
        err.code = '23505';
        global.__DB_MOCK__ = () => Promise.reject(err);

        const res = await supertest(app)
            .post('/register')
            .set('Cookie', [adminCookie])
            .send({ Fname: 'Jane', lname: 'Doe', email: 'jane@test.com', password: 'password123', role: 'Employee', phone: '9876543210' });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already exists/i);
    });

    it('returns 400 Bad Request when login body is missing fields', async () => {
        const res = await supertest(app)
            .post('/login')
            .send({ email: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });

    it('returns 401 Unauthorized for nonexistent user login', async () => {
        global.__DB_MOCK__ = () => Promise.resolve({ rowCount: 0, rows: [] });

        const res = await supertest(app)
            .post('/login')
            .send({ email: 'nonexistent@test.com', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid credentials/i);
    });
});
