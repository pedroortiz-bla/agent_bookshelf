import { get, run } from '../db/index.js';
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

export class CustomerRepository implements IRepository<Customer, CreateCustomerInput, UpdateCustomerInput> {
  create(input: CreateCustomerInput): Customer {
    const name = normalizeName(input.name ?? '');
    const email = normalizeEmail(input.email ?? '');

    if (get('SELECT id FROM customers WHERE email = ?', [email])) {
      throw new Error(`A customer with email ${email} already exists`);
    }

    const result = run(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, input.phone ?? null]
    );
    return get('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]) as unknown as Customer;
  }

  findById(_id: number): Customer | undefined {
    throw new Error('Not implemented yet');
  }

  findAll(): Customer[] {
    throw new Error('Not implemented yet');
  }

  update(_id: number, _input: UpdateCustomerInput): Customer | undefined {
    throw new Error('Not implemented yet');
  }

  delete(_id: number): boolean {
    throw new Error('Not implemented yet');
  }
}
