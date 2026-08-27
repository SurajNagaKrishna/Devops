const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
} : process.env.DB_HOST ? {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
} : null;

const realPool = poolConfig ? new Pool(poolConfig) : null;

if (realPool) {
    realPool.on('error', (err) => {
        console.error('Unexpected error on idle database client:', err);
    });
}

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