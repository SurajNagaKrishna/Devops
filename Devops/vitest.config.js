const { defineConfig } = require('vitest/config');
const path = require('path');

module.exports = defineConfig({
  resolve: {
    alias: {
      '../db': path.resolve(__dirname, 'backend/db.js'),
      './db': path.resolve(__dirname, 'backend/db.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,mjs}'],
  },
});