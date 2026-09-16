import { all, get, run } from '../db/index.js';

export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

export function getAllUsers(): User[] {
  return all('SELECT * FROM users ORDER BY display_name') as unknown as User[];
}

export function getUserById(id: number): User | undefined {
  return get('SELECT * FROM users WHERE id = ?', [id]) as unknown as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  return get('SELECT * FROM users WHERE username = ?', [username]) as unknown as User | undefined;
}

export function createUser(username: string, displayName: string): User {
  const result = run('INSERT INTO users (username, display_name) VALUES (?, ?)', [username, displayName]);
  return getUserById(result.lastInsertRowid)!;
}

export function updateUser(id: number, data: { username?: string; displayName?: string }): User | undefined {
  const existing = getUserById(id);
  if (!existing) return undefined;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.username !== undefined) {
    updates.push('username = ?');
    values.push(data.username);
  }
  if (data.displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(data.displayName);
  }

  if (updates.length === 0) return existing;

  values.push(id);
  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  return getUserById(id);
}

export function deleteUser(id: number): boolean {
  const result = run('DELETE FROM users WHERE id = ?', [id]);
  return result.changes > 0;
}
