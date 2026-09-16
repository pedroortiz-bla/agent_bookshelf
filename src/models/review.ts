import { all, get, run } from '../db/index.js';

export interface Review {
  id: number;
  user_id: number;
  book_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface ReviewWithDetails extends Review {
  username: string;
  display_name: string;
  book_title: string;
  book_author: string;
}

export function getReviewsByBookId(bookId: number): ReviewWithDetails[] {
  return all(`
    SELECT r.*, u.username, u.display_name, b.title as book_title, b.author as book_author
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN books b ON r.book_id = b.id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
  `, [bookId]) as unknown as ReviewWithDetails[];
}

export function getReviewsByUserId(userId: number): ReviewWithDetails[] {
  return all(`
    SELECT r.*, u.username, u.display_name, b.title as book_title, b.author as book_author
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN books b ON r.book_id = b.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `, [userId]) as unknown as ReviewWithDetails[];
}

export function getReviewById(id: number): ReviewWithDetails | undefined {
  return get(`
    SELECT r.*, u.username, u.display_name, b.title as book_title, b.author as book_author
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN books b ON r.book_id = b.id
    WHERE r.id = ?
  `, [id]) as unknown as ReviewWithDetails | undefined;
}

export function getReviewByUserAndBook(userId: number, bookId: number): Review | undefined {
  return get(
    'SELECT * FROM reviews WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  ) as unknown as Review | undefined;
}

export function createReview(userId: number, bookId: number, rating: number, reviewText?: string): Review {
  const result = run(
    'INSERT INTO reviews (user_id, book_id, rating, review_text) VALUES (?, ?, ?, ?)',
    [userId, bookId, rating, reviewText || null]
  );
  return getReviewById(result.lastInsertRowid)!;
}

export function updateReview(id: number, data: { rating?: number; reviewText?: string }): Review | undefined {
  const existing = getReviewById(id);
  if (!existing) return undefined;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.rating !== undefined) {
    updates.push('rating = ?');
    values.push(data.rating);
  }
  if (data.reviewText !== undefined) {
    updates.push('review_text = ?');
    values.push(data.reviewText);
  }

  if (updates.length === 0) return existing;

  values.push(id);
  run(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, values);
  return getReviewById(id);
}

export function deleteReview(id: number): boolean {
  const result = run('DELETE FROM reviews WHERE id = ?', [id]);
  return result.changes > 0;
}

export function getAverageRating(bookId: number): number | null {
  const result = get(
    'SELECT AVG(rating) as avg_rating FROM reviews WHERE book_id = ?',
    [bookId]
  );
  return result?.avg_rating as number | null;
}
