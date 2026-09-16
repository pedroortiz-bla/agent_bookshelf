import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, closeDb } from '../../src/db/index.js';
import * as Book from '../../src/models/book.js';

beforeEach(async () => {
  await initDb('/tmp/test-book-model.db');
});

afterEach(() => {
  closeDb();
  const fs = require('fs');
  try {
    fs.unlinkSync('/tmp/test-book-model.db');
  } catch (e) {
    // ignore
  }
});

describe('Book Model', () => {
  describe('getAllBooks', () => {
    it('returns all books ordered by title', () => {
      const books = Book.getAllBooks();
      expect(books).toHaveLength(50);
      expect(books[0].title).toBe('1984');
    });
  });

  describe('getBookById', () => {
    it('returns a book by id', () => {
      const book = Book.getBookById(1);
      expect(book).toBeDefined();
      expect(book?.title).toBe('The Pragmatic Programmer');
      expect(book?.author).toBe('Andrew Hunt and David Thomas');
    });

    it('returns undefined for non-existent id', () => {
      const book = Book.getBookById(999);
      expect(book).toBeUndefined();
    });
  });

  describe('createBook', () => {
    it('creates a new book', () => {
      const book = Book.createBook({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-1234567890',
        cover_url: null,
        description: 'A test book',
        published_year: 2024
      });

      expect(book.id).toBeDefined();
      expect(book.title).toBe('Test Book');
      expect(book.author).toBe('Test Author');
    });
  });

  // TODO: Add tests for updateBook
  // TODO: Add tests for deleteBook
  // TODO: Add tests for searchBooks
  // TODO: Add edge cases (duplicate ISBN, missing required fields, etc.)
});
