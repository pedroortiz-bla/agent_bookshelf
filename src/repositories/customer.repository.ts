import { all, get, run } from '../db/index.js';
import type { IRepository } from './repository.js';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('Customer name is required');
  return name;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error('A valid email is required');
  return email;
}

/**
 * Data access for the `customers` table. All SQL for customers lives here so
 * routes and services never talk to the database directly.
 */
export class CustomerRepository implements IRepository<Customer, CreateCustomerInput, UpdateCustomerInput> {
  create(input: CreateCustomerInput): Customer {
    const name = normalizeName(input.name ?? '');
    const email = normalizeEmail(input.email ?? '');
    this.assertEmailIsFree(email);

    const result = run(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, input.phone ?? null]
    );
    return this.findById(result.lastInsertRowid)!;
  }

  findById(id: number): Customer | undefined {
    return get('SELECT * FROM customers WHERE id = ?', [id]) as unknown as Customer | undefined;
  }

  findAll(): Customer[] {
    return all('SELECT * FROM customers ORDER BY name') as unknown as Customer[];
  }

  update(id: number, input: UpdateCustomerInput): Customer | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(normalizeName(input.name));
    }

    if (input.email !== undefined) {
      const email = normalizeEmail(input.email);
      this.assertEmailIsFree(email, id);
      updates.push('email = ?');
      values.push(email);
    }

    if (input.phone !== undefined) {
      updates.push('phone = ?');
      values.push(input.phone);
    }

    if (updates.length === 0) return existing;

    values.push(id);
    run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    return run('DELETE FROM customers WHERE id = ?', [id]).changes > 0;
  }

  /** Throws when `email` is taken by a customer other than `exceptId`. */
  private assertEmailIsFree(email: string, exceptId?: number): void {
    const owner = get('SELECT id FROM customers WHERE email = ?', [email]) as { id: number } | undefined;
    if (owner && owner.id !== exceptId) {
      throw new Error(`A customer with email ${email} already exists`);
    }
  }
}
