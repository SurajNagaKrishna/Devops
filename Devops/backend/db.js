const { Pool } = require('pg');
require('dotenv').config();

const realPool = process.env.DB_HOST ? new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
}) : null;

const db = {
    query(...args) {
        if (global.__DB_MOCK__) return global.__DB_MOCK__(...args);
        if (realPool) return realPool.query(...args);
        return Promise.resolve({ rows: [], rowCount: 0 });
    },
    connect(...args) {
        if (realPool) return realPool.connect(...args);
        return Promise.resolve({
            query: (...args) => {
                if (global.__DB_MOCK__) return global.__DB_MOCK__(...args);
                return Promise.resolve({ rows: [], rowCount: 0 });
            },
            release: () => {},
        });
    }
};

module.exports = db;