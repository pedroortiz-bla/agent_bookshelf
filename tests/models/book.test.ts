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

  describe('updateBook', () => {
    it('updates only the provided fields', () => {
      const updated = Book.updateBook(1, { title: 'New Title' });
      expect(updated?.title).toBe('New Title');
      expect(updated?.author).toBe('Andrew Hunt and David Thomas');
    });

    it('returns undefined for a non-existent id', () => {
      expect(Book.updateBook(999, { title: 'Nope' })).toBeUndefined();
    });

    it('returns the unchanged book when no fields are provided', () => {
      const before = Book.getBookById(1);
      expect(Book.updateBook(1, {})).toEqual(before);
    });

    it('can set a nullable field to null', () => {
      const updated = Book.updateBook(1, { isbn: null });
      expect(updated?.isbn).toBeNull();
    });

    it('throws when updating to a duplicate ISBN', () => {
      const other = Book.getBookById(2)!;
      expect(() => Book.updateBook(1, { isbn: other.isbn })).toThrow();
    });
  });

  describe('deleteBook', () => {
    it('deletes an existing book and returns true', () => {
      expect(Book.deleteBook(1)).toBe(true);
      expect(Book.getBookById(1)).toBeUndefined();
      expect(Book.getAllBooks()).toHaveLength(49);
    });

    it('returns false for a non-existent id', () => {
      expect(Book.deleteBook(999)).toBe(false);
      expect(Book.getAllBooks()).toHaveLength(50);
    });
  });

  describe('searchBooks', () => {
    it('matches on title', () => {
      const results = Book.searchBooks('Dune');
      expect(results.map(b => b.title)).toContain('Dune');
    });

    it('matches on author', () => {
      const results = Book.searchBooks('Andy Weir');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(b => b.author.includes('Andy Weir'))).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(Book.searchBooks('dune')).toEqual(Book.searchBooks('DUNE'));
    });

    it('returns results ordered by title', () => {
      const titles = Book.searchBooks('Andy Weir').map(b => b.title);
      expect(titles).toEqual([...titles].sort());
    });

    it('returns an empty array when nothing matches', () => {
      expect(Book.searchBooks('zzz-no-such-book')).toEqual([]);
    });

    it('treats an empty query as match-all', () => {
      expect(Book.searchBooks('')).toHaveLength(50);
    });
  });

  describe('createBook edge cases', () => {
    it('throws on a duplicate ISBN', () => {
      const existing = Book.getBookById(1)!;
      expect(() =>
        Book.createBook({
          title: 'Dup', author: 'Dup', isbn: existing.isbn,
          cover_url: null, description: null, published_year: null
        })
      ).toThrow();
    });

    it('throws when title is missing', () => {
      expect(() =>
        Book.createBook({
          title: null as unknown as string, author: 'A', isbn: null,
          cover_url: null, description: null, published_year: null
        })
      ).toThrow();
    });
  });
});
