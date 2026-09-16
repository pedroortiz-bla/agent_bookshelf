import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, closeDb, all } from '../src/db/index.js';

beforeEach(async () => {
  await initDb('/tmp/test-bookshelf.db');
});

afterEach(() => {
  closeDb();
  const fs = require('fs');
  try {
    fs.unlinkSync('/tmp/test-bookshelf.db');
  } catch (e) {
    // ignore
  }
});

describe('Database', () => {
  it('initializes with seed data', () => {
    const users = all('SELECT COUNT(*) as count FROM users');
    expect(users[0].count).toBe(3);
  });

  it('seeds 50 books', () => {
    const books = all('SELECT COUNT(*) as count FROM books');
    expect(books[0].count).toBe(50);
  });

  it('creates shelves for each user', () => {
    const shelves = all('SELECT COUNT(*) as count FROM shelves');
    expect(shelves[0].count).toBe(9);
  });

  it('seeds sample reviews', () => {
    const reviews = all('SELECT COUNT(*) as count FROM reviews');
    expect(reviews[0].count).toBeGreaterThan(0);
  });
});
