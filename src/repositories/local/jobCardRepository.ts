import type { JobCard, JobCardStatus } from '../../types';
import type { CreateJobCardInput, JobCardRepository, ListParams } from '../types';
import { newId, todayStamp, withLocalDb } from './storage';

function statusMatch(
  status: JobCardStatus,
  filter?: JobCardStatus | JobCardStatus[],
): boolean {
  if (!filter) return true;
  return Array.isArray(filter) ? filter.includes(status) : filter === status;
}

export const localJobCardRepository: JobCardRepository = {
  async list(params: ListParams & { status?: JobCardStatus | JobCardStatus[] }) {
    return withLocalDb((db) =>
      db.jobCards
        .filter((j) => j.organizationId === params.organizationId)
        .filter((j) => !params.branchId || j.branchId === params.branchId)
        .filter((j) => statusMatch(j.status, params.status))
        .filter((j) => {
          if (!params.search?.trim()) return true;
          const q = params.search.trim().toLowerCase();
          return j.jobNumber.toLowerCase().includes(q) || (j.complaints?.toLowerCase().includes(q) ?? false);
        })
        .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50)),
    );
  },

  async getById(id) {
    return withLocalDb((db) => db.jobCards.find((j) => j.id === id) ?? null);
  },

  async create(input: CreateJobCardInput) {
    return withLocalDb((db) => {
      db.counters.job += 1;
      const now = new Date().toISOString();
      const job: JobCard = {
        id: newId(),
        organizationId: input.organizationId,
        branchId: input.branchId,
        jobNumber: `JC-${todayStamp()}-${String(db.counters.job).padStart(4, '0')}`,
        vehicleId: input.vehicleId,
        customerId: input.customerId,
        advisorId: input.advisorId ?? null,
        technicianId: null,
        status: 'open',
        complaints: input.complaints ?? null,
        odometerIn: input.odometerIn ?? null,
        estimatedCost: input.estimatedCost ?? 0,
        estimatedDeliveryAt: input.estimatedDeliveryAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.jobCards.unshift(job);
      db.statusHistory.unshift({
        id: newId(),
        jobCardId: job.id,
        fromStatus: null,
        toStatus: 'open',
        changedBy: input.createdBy ?? 'system',
        note: 'Job card created',
        createdAt: now,
      });
      return job;
    });
  },

  async update(id, patch) {
    return withLocalDb((db) => {
      const idx = db.jobCards.findIndex((j) => j.id === id);
      if (idx < 0) throw new Error('Job card not found');
      db.jobCards[idx] = {
        ...db.jobCards[idx],
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      };
      return db.jobCards[idx];
    });
  },

  async transition(id, toStatus, changedBy, note) {
    return withLocalDb((db) => {
      const idx = db.jobCards.findIndex((j) => j.id === id);
      if (idx < 0) throw new Error('Job card not found');
      const from = db.jobCards[idx].status;
      const now = new Date().toISOString();
      db.jobCards[idx] = {
        ...db.jobCards[idx],
        status: toStatus,
        updatedAt: now,
      };
      db.statusHistory.unshift({
        id: newId(),
        jobCardId: id,
        fromStatus: from,
        toStatus,
        changedBy,
        note,
        createdAt: now,
      });
      return db.jobCards[idx];
    });
  },
};

export async function listJobStatusHistory(jobCardId: string) {
  return withLocalDb((db) => db.statusHistory.filter((h) => h.jobCardId === jobCardId));
}
