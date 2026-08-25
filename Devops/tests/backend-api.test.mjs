import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mockRequire = require('mock-require');

process.env.JWT_SECRET_KEY = 'backend-test-secret';

const users = [
  { emp_id: 1, email: 'admin@test.local', password: 'admin-hash', role: 'Admin' },
  { emp_id: 2, email: 'manager-a@test.local', password: 'manager-a-hash', role: 'Team Manager' },
  { emp_id: 3, email: 'manager-b@test.local', password: 'manager-b-hash', role: 'Team Manager' },
  { emp_id: 4, email: 'employee-a@test.local', password: 'employee-a-hash', role: 'Employee' },
  { emp_id: 5, email: 'employee-b@test.local', password: 'employee-b-hash', role: 'Employee' },
  { emp_id: 6, email: 'manager-c@test.local', password: 'manager-c-hash', role: 'Team Manager' },
  { emp_id: 7, email: 'manager-d@test.local', password: 'manager-d-hash', role: 'Team Manager' },
];

const teams = [
  { team_id: 10, team_name: 'Team A', manager_id: 2 },
  { team_id: 20, team_name: 'Team B', manager_id: 3 },
];
const members = [[10, 2], [10, 4], [20, 3], [20, 5]];
const tasks = [
  { task_id: 100, team_id: 10, assigned_by: 2, assigned_to: 4, title: 'A task', status: 'Pending' },
  { task_id: 200, team_id: 20, assigned_by: 3, assigned_to: 5, title: 'B task', status: 'Pending' },
];
const subtasks = [
  { subtask_id: 1000, task_id: 100, title: 'A subtask', status: 'Pending' },
  { subtask_id: 2000, task_id: 200, title: 'B subtask', status: 'Pending' },
];

const state = { failClientOn: null };

function result(rows = []) {
  return { rows, rowCount: rows.length };
}

function roleUser(id) {
  return users.find(user => user.emp_id === id);
}

function sameId(value, expected) {
  return Number(value) === Number(expected);
}

function query(sql, params = []) {
  const text = sql.replace(/\s+/g, ' ').trim();
  if (text.startsWith('SELECT * FROM TaskFlowUsers WHERE email=')) {
    const user = users.find(item => item.email === params[0]);
    return Promise.resolve(result(user ? [{ ...user }] : []));
  }
  if (text.includes('FROM Teams WHERE manager_id')) {
    return Promise.resolve(result(teams.filter(team => team.manager_id === params[0])));
  }
  if (text.includes('SELECT manager_id FROM Teams WHERE team_id')) {
    const team = teams.find(item => sameId(item.team_id, params[0]));
    return Promise.resolve(result(team ? [{ manager_id: team.manager_id }] : []));
  }
  if (text.includes('FROM TeamMembers tm') && text.includes("u.role = 'Employee'")) {
    const found = members.some(([teamId, empId]) => teamId === params[0] && empId === params[1] && roleUser(empId)?.role === 'Employee');
    return Promise.resolve(result(found ? [{ emp_id: params[1] }] : []));
  }
  if (text.includes('SELECT COUNT(*) AS total')) {
    if (text.includes('FROM TeamMembers')) return Promise.resolve(result([{ total: '2' }]));
    if (text.includes('status =')) return Promise.resolve(result([{ total: '0' }]));
    return Promise.resolve(result([{ total: String(tasks.length) }]));
  }
  if (text.startsWith('SELECT * FROM Teams') || text.startsWith('SELECT * FROM Tasks') || text.startsWith('SELECT t.* FROM Tasks')) {
    const task = tasks.find(item => sameId(item.task_id, params[0]) && sameId(item.assigned_by, params[1]) && sameId(teams.find(team => team.team_id === item.team_id)?.manager_id, params[1]));
    return Promise.resolve(result(task ? [{ ...task }] : []));
  }
  if (text.startsWith('SELECT 1 FROM TeamMembers')) {
    const found = members.some(([teamId, empId]) => teamId === params[0] && empId === params[1]);
    return Promise.resolve(result(found ? [{ '?column?': 1 }] : []));
  }
  if (text.startsWith('SELECT 1 FROM Tasks')) {
    const task = tasks.find(item => sameId(item.task_id, params[0]) && sameId(item.assigned_by, params[1]) && sameId(teams.find(team => team.team_id === item.team_id)?.manager_id, params[1]));
    return Promise.resolve(result(task ? [{ '?column?': 1 }] : []));
  }
  if (text.startsWith('SELECT * FROM TaskFlowUsers') || text.startsWith('SELECT emp_id FROM TaskFlowUsers')) {
    return Promise.resolve(result(users.filter(user => user.emp_id === params[0] && user.role === 'Team Manager')));
  }
  if (text.startsWith('SELECT * FROM Teams')) return Promise.resolve(result([]));
  if (text.startsWith('SELECT * FROM TeamInvitations')) return Promise.resolve(result([]));
  if (text.startsWith('SELECT * FROM OTP')) return Promise.resolve(result([]));
  if (text.includes('FROM Tasks t') && text.includes('WHERE t.task_id')) return Promise.resolve(result([]));
  if (text.startsWith('UPDATE Tasks')) {
    const task = tasks.find(item => sameId(item.task_id, params[6]) && sameId(item.assigned_by, params[7]));
    if (task) Object.assign(task, { assigned_to: params[0], title: params[1], status: params[5] });
    return Promise.resolve(result(task ? [task] : []));
  }
  if (text.startsWith('DELETE FROM Tasks')) {
    const index = tasks.findIndex(item => sameId(item.task_id, params[0]) && sameId(item.assigned_by, params[1]));
    if (index >= 0) tasks.splice(index, 1);
    return Promise.resolve(result(index >= 0 ? [{}] : []));
  }
  if (text.startsWith('INSERT INTO Tasks')) {
    tasks.push({ task_id: 300, team_id: params[0], assigned_by: params[1], assigned_to: params[2], title: params[3], status: 'Pending' });
    return Promise.resolve(result([tasks.at(-1)]));
  }
  if (text.startsWith('INSERT INTO Teams')) {
    teams.push({ team_id: 30, team_name: params[0], manager_id: Number(params[1]) });
    return Promise.resolve(result([teams.at(-1)]));
  }
  if (text.startsWith('INSERT INTO SubTasks')) {
    subtasks.push({ subtask_id: 3000, task_id: params[0], title: params[1], status: 'Pending' });
    return Promise.resolve(result([subtasks.at(-1)]));
  }
  if (text.startsWith('DELETE FROM TeamMembers')) {
    const index = members.findIndex(([teamId, empId]) => sameId(teamId, params[0]) && sameId(empId, params[1]));
    if (index >= 0) members.splice(index, 1);
    return Promise.resolve(result(index >= 0 ? [{}] : []));
  }
  if (text.includes('UPDATE Teams SET manager_id')) {
    const team = teams.find(item => item.team_id === params[1]);
    if (team) team.manager_id = Number(params[0]);
    return Promise.resolve(result(team ? [team] : []));
  }
  if (text.startsWith('INSERT INTO TeamMembers')) {
    if (!members.some(([teamId, empId]) => sameId(teamId, params[0]) && sameId(empId, params[1]))) members.push([Number(params[0]), Number(params[1])]);
    return Promise.resolve(result([{}]));
  }
  if (text.startsWith('UPDATE SubTasks')) {
    const subtask = subtasks.find(item => sameId(item.subtask_id, params[2]) && tasks.find(task => sameId(task.task_id, item.task_id) && sameId(task.assigned_by, params[3]) && sameId(teams.find(team => team.team_id === task.team_id)?.manager_id, params[3])));
    if (subtask) Object.assign(subtask, { title: params[0], status: params[1] });
    return Promise.resolve(result(subtask ? [subtask] : []));
  }
  if (text.startsWith('DELETE FROM SubTasks')) {
    const index = subtasks.findIndex(item => sameId(item.subtask_id, params[0]) && tasks.find(task => sameId(task.task_id, item.task_id) && sameId(task.assigned_by, params[1])));
    if (index >= 0) subtasks.splice(index, 1);
    return Promise.resolve(result(index >= 0 ? [{}] : []));
  }
  if (text.startsWith('SELECT t.team_id')) return Promise.resolve(result(teams));
  if (text.startsWith('SELECT t.task_id')) return Promise.resolve(result(tasks));
  return Promise.resolve(result([]));
}

const db = {
  query,
  connect: vi.fn(async () => {
    const teamSnapshot = teams.map(team => ({ ...team }));
    const memberSnapshot = members.map(member => [...member]);
    return {
    query: vi.fn(async (sql, params) => {
      if (state.failClientOn && sql.includes(state.failClientOn)) throw new Error('forced transaction failure');
      if (sql === 'ROLLBACK') {
        teams.splice(0, teams.length, ...teamSnapshot);
        members.splice(0, members.length, ...memberSnapshot);
        return result();
      }
      if (sql === 'BEGIN' || sql === 'COMMIT') return result();
      if (sql.includes('UPDATE Teams SET manager_id')) {
        const team = teams.find(item => sameId(item.team_id, params[1]));
        if (team) team.manager_id = Number(params[0]);
        return result(team ? [team] : []);
      }
      return query(sql, params);
    }),
    release: vi.fn(),
    };
  }),
};

mockRequire('../backend/db', db);

const { app } = require('../backend/server.js');

function tokenFor(userId, role) {
  return jwt.sign({ emp_id: userId, email: roleUser(userId).email, role }, process.env.JWT_SECRET_KEY);
}

function authRequest(method, path, userId, role) {
  return request(app)[method](path).set('Cookie', `token=${tokenFor(userId, role)}`);
}

describe('backend authentication and role authorization', () => {
  beforeAll(async () => {
    users.forEach(user => { user.password = bcrypt.hashSync(user.email, 4); });
  });

  it('accepts valid login and rejects invalid or unknown credentials', async () => {
    const valid = await request(app).post('/login').send({ email: users[0].email, password: users[0].email });
    expect(valid.status).toBe(200);
    expect(valid.headers['set-cookie'][0]).toContain('token=');
    expect((await request(app).post('/login').send({ email: users[0].email, password: 'wrong' })).status).toBe(401);
    expect((await request(app).post('/login').send({ email: 'missing@test.local', password: 'wrong' })).status).toBe(401);
  });

  it('rejects missing and invalid authentication', async () => {
    expect((await request(app).get('/getteams')).status).toBe(401);
    const expired = jwt.sign({ emp_id: 1, role: 'Admin' }, process.env.JWT_SECRET_KEY, { expiresIn: -1 });
    expect((await request(app).get('/getteams').set('Cookie', `token=${expired}`)).status).toBe(401);
  });

  it('clears authentication on logout', async () => {
    const response = await request(app).get('/logout');
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toMatch(/token=;/);
  });

  it('enforces admin, manager, and employee role boundaries', async () => {
    expect((await authRequest('get', '/getteams', 1, 'Admin')).status).toBe(200);
    expect((await authRequest('get', '/teammanager/dashboard', 2, 'Team Manager')).status).toBe(200);
    expect((await authRequest('get', '/employee/tasks', 4, 'Employee')).status).toBe(200);
    expect((await authRequest('get', '/teammanager/dashboard', 4, 'Employee')).status).toBe(403);
    expect((await authRequest('get', '/getteams', 4, 'Employee')).status).toBe(403);
    expect((await authRequest('get', '/getteams', 2, 'Team Manager')).status).toBe(403);
  });
});

describe('manager task and subtask ownership', () => {
  it('allows Manager A to manage own tasks and subtasks', async () => {
    expect((await authRequest('get', '/teammanager/tasksdashboard', 2, 'Team Manager')).status).toBe(200);
    expect((await authRequest('post', '/teammanager/createtasks', 2, 'Team Manager').send({ assigned_to: 4, title: 'New A task' })).status).toBe(201);
    expect((await authRequest('post', '/teammanager/addsubtask/100', 2, 'Team Manager').send({ title: 'New subtask' })).status).toBe(201);
    expect((await authRequest('put', '/teammanager/subtask/1000', 2, 'Team Manager').send({ title: 'Updated', status: 'Completed' })).status).toBe(200);
    expect((await authRequest('delete', '/teammanager/subtask/1000', 2, 'Team Manager')).status).toBe(200);
  });

  it('blocks Manager A from Manager B tasks, subtasks, and employees', async () => {
    expect((await authRequest('put', '/teammanager/task/200', 2, 'Team Manager').send({ assigned_to: 4, title: 'Nope', status: 'Pending' })).status).toBe(404);
    expect((await authRequest('delete', '/teammanager/task/200', 2, 'Team Manager')).status).toBe(404);
    expect((await authRequest('put', '/teammanager/task/100', 2, 'Team Manager').send({ assigned_to: 5, title: 'Nope', status: 'Pending' })).status).toBe(400);
    expect((await authRequest('post', '/teammanager/createtasks', 2, 'Team Manager').send({ assigned_to: 5, title: 'Nope' })).status).toBe(400);
    expect((await authRequest('post', '/teammanager/addsubtask/200', 2, 'Team Manager').send({ title: 'Nope' })).status).toBe(404);
    expect((await authRequest('put', '/teammanager/subtask/2000', 2, 'Team Manager').send({ title: 'Nope', status: 'Completed' })).status).toBe(404);
    expect((await authRequest('delete', '/teammanager/subtask/2000', 2, 'Team Manager')).status).toBe(404);
  });
});

describe('team manager consistency and transactions', () => {
  it('uses a checked-out client for team creation and manager changes', async () => {
    const response = await authRequest('put', '/getteams/teams/10/manager', 1, 'Admin').send({ manager_id: 6 });
    expect(response.status).toBe(200);
    expect(db.connect).toHaveBeenCalled();
    expect(teams.find(team => team.team_id === 10).manager_id).toBe(6);
    expect(members).not.toContainEqual([10, 2]);
    expect(members).toContainEqual([10, 6]);
    state.failClientOn = null;
  });

  it('rolls back a team operation when a later client query fails', async () => {
    state.failClientOn = 'INSERT INTO TeamMembers';
    const response = await authRequest('post', '/getteams/createTeam', 1, 'Admin').send({ team_name: 'Broken', manager_id: 7 });
    expect(response.status).toBe(500);
    expect(teams.some(team => team.team_name === 'Broken')).toBe(false);
    state.failClientOn = null;
  });
});