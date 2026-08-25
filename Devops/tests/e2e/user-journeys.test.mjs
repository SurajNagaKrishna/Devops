import { describe, expect, it, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../../backend/server.js';
import bcrypt from 'bcrypt';

describe('End-to-End User Journeys', () => {
    beforeEach(() => {
        global.__DB_MOCK__ = null;
        process.env.JWT_SECRET_KEY = 'test_secret';
    });

    it('completes full employee authentication and task retrieval journey', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        global.__DB_MOCK__ = (q) => {
            if (q.includes('TaskFlowUsers WHERE email=$1')) {
                return Promise.resolve({
                    rowCount: 1,
                    rows: [{ emp_id: 501, email: 'emp@taskflow.com', password: hashedPassword, role: 'Employee' }]
                });
            }
            if (q.includes('Tasks t')) {
                return Promise.resolve({
                    rowCount: 1,
                    rows: [{ task_id: 1, title: 'Deploy CI Pipeline', status: 'In Progress' }]
                });
            }
            return Promise.resolve({ rowCount: 0, rows: [] });
        };

        // Step 1: Login
        const loginRes = await supertest(app)
            .post('/login')
            .send({ email: 'emp@taskflow.com', password: 'password123' });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.role).toBe('Employee');
        const authCookie = loginRes.headers['set-cookie'];
        expect(authCookie).toBeDefined();

        // Step 2: Access Employee Tasks
        const tasksRes = await supertest(app)
            .get('/employee/tasks')
            .set('Cookie', authCookie);

        expect(tasksRes.status).toBe(200);
        expect(tasksRes.body.tasks).toHaveLength(1);
        expect(tasksRes.body.tasks[0].title).toBe('Deploy CI Pipeline');

        // Step 3: Logout
        const logoutRes = await supertest(app)
            .post('/logout')
            .set('Cookie', authCookie);

        expect(logoutRes.status).toBe(200);
    });
});
