import { env } from '../config/env';
import { isSupabaseConfigured } from '../lib/supabase';
import { localCustomerRepository } from './local/customerRepository';
import { createLocalEstimate, localEstimateRepository } from './local/estimateRepository';
import {
  listInvoicesByJob as listLocalInvoicesByJob,
  localInvoiceRepository,
} from './local/invoiceRepository';
import {
  listJobStatusHistory as listLocalJobStatusHistory,
  localJobCardRepository,
} from './local/jobCardRepository';
import {
  adjustStock as adjustLocalStock,
  countReorderAlerts as countLocalReorderAlerts,
  createPart as createLocalPart,
  ensureInventorySeed as ensureLocalInventorySeed,
  listPartsWithStock as listLocalPartsWithStock,
  listRecentMovements as listLocalRecentMovements,
  type CreatePartInput,
  type PartStockRow,
} from './local/inventoryRepository';
import { localVehicleRepository } from './local/vehicleRepository';
import { supabaseCustomerRepository } from './supabase/customerRepository';
import {
  createSupabaseEstimate,
  supabaseEstimateRepository,
} from './supabase/estimateRepository';
import {
  listSupabaseInvoicesByJob,
  supabaseInvoiceRepository,
} from './supabase/invoiceRepository';
import {
  listSupabaseJobStatusHistory,
  supabaseJobCardRepository,
} from './supabase/jobCardRepository';
import {
  adjustSupabaseStock,
  countSupabaseReorderAlerts,
  createSupabasePart,
  ensureSupabaseInventorySeed,
  listSupabasePartsWithStock,
  listSupabaseRecentMovements,
} from './supabase/inventoryRepository';
import {
  createSupabaseEmployee,
  ensureSupabaseDemoEmployees,
  listSupabaseAttendance,
  listSupabaseEmployees,
  markSupabaseAttendance,
  supabaseAttendanceSummary,
} from './supabase/hrRepository';
import { supabaseVehicleRepository } from './supabase/vehicleRepository';
import type { CreateEstimateInput } from './local/estimateRepository';
import type { CreateEmployeeInput } from './local/hrRepository';
import {
  attendanceSummary as localAttendanceSummary,
  createEmployee as createLocalEmployee,
  ensureDemoEmployees,
  listAttendance as listLocalAttendance,
  listEmployees as listLocalEmployees,
  markAttendance as markLocalAttendance,
} from './local/hrRepository';
import type {
  CustomerRepository,
  EstimateRepository,
  InvoiceRepository,
  JobCardRepository,
  VehicleRepository,
} from './types';
import type { AttendanceMethod, AttendanceStatus } from '../types';
export type DataMode = 'local' | 'supabase';
export type { CreatePartInput, PartStockRow, CreateEstimateInput };

export function getDataMode(): DataMode {
  const forced = env('EXPO_PUBLIC_DATA_MODE', '').toLowerCase();
  if (forced === 'local') return 'local';
  if (isSupabaseConfigured()) return 'supabase';
  return 'local';
}

export function getCustomerRepository(): CustomerRepository {
  return getDataMode() === 'supabase' ? supabaseCustomerRepository : localCustomerRepository;
}

export function getVehicleRepository(): VehicleRepository {
  return getDataMode() === 'supabase' ? supabaseVehicleRepository : localVehicleRepository;
}

export function getJobCardRepository(): JobCardRepository {
  return getDataMode() === 'supabase' ? supabaseJobCardRepository : localJobCardRepository;
}

export function getEstimateRepository(): EstimateRepository {
  return getDataMode() === 'supabase' ? supabaseEstimateRepository : localEstimateRepository;
}

export function getInvoiceRepository(): InvoiceRepository {
  return getDataMode() === 'supabase' ? supabaseInvoiceRepository : localInvoiceRepository;
}

export async function createEstimate(input: CreateEstimateInput) {
  return getDataMode() === 'supabase'
    ? createSupabaseEstimate(input)
    : createLocalEstimate(input);
}

export async function listJobStatusHistory(jobCardId: string) {
  return getDataMode() === 'supabase'
    ? listSupabaseJobStatusHistory(jobCardId)
    : listLocalJobStatusHistory(jobCardId);
}

export async function listInvoicesByJob(jobCardId: string) {
  return getDataMode() === 'supabase'
    ? listSupabaseInvoicesByJob(jobCardId)
    : listLocalInvoicesByJob(jobCardId);
}

export async function ensureInventorySeed(organizationId: string, branchId: string) {
  return getDataMode() === 'supabase'
    ? ensureSupabaseInventorySeed(organizationId, branchId)
    : ensureLocalInventorySeed(organizationId, branchId);
}

export async function listPartsWithStock(params: {
  organizationId: string;
  branchId: string;
  search?: string;
}): Promise<PartStockRow[]> {
  return getDataMode() === 'supabase'
    ? listSupabasePartsWithStock(params)
    : listLocalPartsWithStock(params);
}

export async function countReorderAlerts(organizationId: string, branchId: string) {
  return getDataMode() === 'supabase'
    ? countSupabaseReorderAlerts(organizationId, branchId)
    : countLocalReorderAlerts(organizationId, branchId);
}

export async function createPart(input: CreatePartInput) {
  return getDataMode() === 'supabase' ? createSupabasePart(input) : createLocalPart(input);
}

export async function adjustStock(input: {
  organizationId: string;
  branchId: string;
  partId: string;
  movementType: 'stock_in' | 'stock_out' | 'adjustment';
  quantity: number;
  notes?: string;
  createdBy?: string;
}) {
  return getDataMode() === 'supabase' ? adjustSupabaseStock(input) : adjustLocalStock(input);
}

export async function listRecentMovements(branchId: string, limit = 20) {
  return getDataMode() === 'supabase'
    ? listSupabaseRecentMovements(branchId, limit)
    : listLocalRecentMovements(branchId, limit);
}

export async function ensureEmployeesSeed(organizationId: string, branchId: string) {
  return getDataMode() === 'supabase'
    ? ensureSupabaseDemoEmployees(organizationId, branchId)
    : ensureDemoEmployees(organizationId, branchId);
}

export async function listEmployees(params: {
  organizationId: string;
  branchId?: string | null;
  search?: string;
}) {
  return getDataMode() === 'supabase'
    ? listSupabaseEmployees(params)
    : listLocalEmployees(params);
}

export async function createEmployee(input: CreateEmployeeInput) {
  return getDataMode() === 'supabase'
    ? createSupabaseEmployee(input)
    : createLocalEmployee(input);
}

export async function listAttendance(params: { branchId: string; date?: string }) {
  return getDataMode() === 'supabase'
    ? listSupabaseAttendance(params)
    : listLocalAttendance(params);
}

export async function markAttendance(input: {
  organizationId: string;
  branchId: string;
  employeeId: string;
  status: AttendanceStatus;
  method?: AttendanceMethod;
  markedBy?: string;
}) {
  return getDataMode() === 'supabase'
    ? markSupabaseAttendance(input)
    : markLocalAttendance(input);
}

export async function attendanceSummary(branchId: string, date?: string) {
  return getDataMode() === 'supabase'
    ? supabaseAttendanceSummary(branchId, date)
    : localAttendanceSummary(branchId, date);
}

export { resetLocalDb } from './local/storage';
export { createLocalEstimate, getLocalEstimate } from './local/estimateRepository';
export type { CreateEmployeeInput };