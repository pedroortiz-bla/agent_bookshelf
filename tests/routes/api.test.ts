import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';
import { initDb, closeDb } from '../../src/db/index.js';

beforeEach(async () => {
  await initDb('/tmp/test-api.db');
});

afterEach(() => {
  closeDb();
  const fs = require('fs');
  try {
    fs.unlinkSync('/tmp/test-api.db');
  } catch (e) {
    // ignore
  }
});

describe('API Routes', () => {
  describe('GET /api/books', () => {
    it('returns all books', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(50);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('author');
    });
  });

  describe('GET /api/books/:id', () => {
    it('returns a book by id', async () => {
      const res = await request(app).get('/api/books/1');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('The Pragmatic Programmer');
    });

    it('returns 404 for non-existent book', async () => {
      const res = await request(app).get('/api/books/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/reviews', () => {
    it('creates a new review', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          userId: 1,
          bookId: 5,
          rating: 5,
          reviewText: 'Amazing book!'
        });

      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(5);
      expect(res.body.review_text).toBe('Amazing book!');
    });

    it('prevents duplicate reviews', async () => {
      // Alice already reviewed book 1 in seed data
      const res = await request(app)
        .post('/api/reviews')
        .send({
          userId: 1,
          bookId: 1,
          rating: 4,
          reviewText: 'Trying to review again'
        });

      expect(res.status).toBe(409);
    });

    it('validates rating range', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          userId: 1,
          bookId: 5,
          rating: 6,
          reviewText: 'Invalid rating'
        });

      expect(res.status).toBe(400);
    });
  });

  // TODO: Add tests for other API endpoints
  // TODO: Add tests for error handling
  // TODO: Add tests for edge cases
});
