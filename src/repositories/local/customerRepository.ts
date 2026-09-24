import type { Customer } from '../../types';
import type { CustomerRepository, ListParams } from '../types';
import { newId, withLocalDb } from './storage';

function matchesSearch(c: Customer, search?: string): boolean {
  if (!search?.trim()) return true;
  const q = search.trim().toLowerCase();
  return (
    c.name.toLowerCase().includes(q) ||
    c.mobile.includes(q) ||
    (c.email?.toLowerCase().includes(q) ?? false)
  );
}

export const localCustomerRepository: CustomerRepository = {
  async list(params) {
    return withLocalDb((db) =>
      db.customers
        .filter((c) => c.organizationId === params.organizationId)
        .filter((c) => !params.branchId || !c.branchId || c.branchId === params.branchId)
        .filter((c) => matchesSearch(c, params.search))
        .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50)),
    );
  },

  async getById(id) {
    return withLocalDb((db) => db.customers.find((c) => c.id === id) ?? null);
  },

  async findByMobile(organizationId, mobile) {
    const normalized = mobile.replace(/\D/g, '');
    return withLocalDb(
      (db) =>
        db.customers.find(
          (c) => c.organizationId === organizationId && c.mobile.replace(/\D/g, '') === normalized,
        ) ?? null,
    );
  },

  async create(input) {
    return withLocalDb((db) => {
      const customer: Customer = {
        ...input,
        id: newId(),
        outstandingDue: 0,
        totalRevenue: 0,
      };
      db.customers.unshift(customer);
      return customer;
    });
  },

  async update(id, patch) {
    return withLocalDb((db) => {
      const idx = db.customers.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Customer not found');
      db.customers[idx] = { ...db.customers[idx], ...patch, id };
      return db.customers[idx];
    });
  },
};
