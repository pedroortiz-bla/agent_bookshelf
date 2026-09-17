import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync } from 'fs';
import { initDb, closeDb } from '../../src/db/index.js';
import { CustomerRepository } from '../../src/repositories/customer.repository.js';

const TEST_DB_PATH = '/tmp/test-customer-repository.db';

let repo: CustomerRepository;

beforeEach(async () => {
  await initDb(TEST_DB_PATH);
  repo = new CustomerRepository();
});

afterEach(() => {
  closeDb();
  try {
    unlinkSync(TEST_DB_PATH);
  } catch (e) {
    // ignore
  }
});

describe('CustomerRepository', () => {
  describe('create', () => {
    it('persists a customer and returns it with a generated id', () => {
      const customer = repo.create({ name: 'Ada Lovelace', email: 'ada@example.com' });

      expect(customer.id).toBeGreaterThan(0);
      expect(customer.name).toBe('Ada Lovelace');
      expect(customer.email).toBe('ada@example.com');
      expect(customer.created_at).toBeTruthy();
    });

    it('stores phone as null when it is not supplied', () => {
      const customer = repo.create({ name: 'Grace Hopper', email: 'grace@example.com' });

      expect(customer.phone).toBeNull();
    });

    it('rejects a customer with a blank name', () => {
      expect(() => repo.create({ name: '   ', email: 'blank@example.com' })).toThrow(/name is required/i);
    });

    it('rejects a customer with an invalid email', () => {
      expect(() => repo.create({ name: 'Alan Turing', email: 'not-an-email' })).toThrow(/valid email/i);
    });

    it('rejects a duplicate email', () => {
      repo.create({ name: 'Ada Lovelace', email: 'ada@example.com' });

      expect(() => repo.create({ name: 'Ada Byron', email: 'ada@example.com' })).toThrow(/already exists/i);
    });
  });
});
