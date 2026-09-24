import type {
  AttendanceRecord,
  BranchStock,
  Customer,
  Employee,
  Estimate,
  EstimateLine,
  Invoice,
  JobCard,
  JobCardStatus,
  Part,
  Payment,
  Vehicle,
} from '../../types';

export type LocalEstimate = Estimate & { lines: EstimateLine[] };

export type StockMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'job_consumption'
  | 'return';

export type LocalStockMovement = {
  id: string;
  organizationId: string;
  branchId: string;
  partId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export type LocalDb = {
  customers: Customer[];
  vehicles: Vehicle[];
  jobCards: JobCard[];
  statusHistory: Array<{
    id: string;
    jobCardId: string;
    fromStatus: JobCardStatus | null;
    toStatus: JobCardStatus;
    changedBy: string;
    note?: string;
    createdAt: string;
  }>;
  estimates: LocalEstimate[];
  invoices: Invoice[];
  payments: Payment[];
  parts: Part[];
  branchStock: BranchStock[];
  stockMovements: LocalStockMovement[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  counters: {
    job: number;
    estimate: number;
    invoice: number;
    part: number;
    employee: number;
  };
  seededDemoInventory: boolean;
  seededDemoEmployees: boolean;
};

export function emptyLocalDb(): LocalDb {
  return {
    customers: [],
    vehicles: [],
    jobCards: [],
    statusHistory: [],
    estimates: [],
    invoices: [],
    payments: [],
    parts: [],
    branchStock: [],
    stockMovements: [],
    employees: [],
    attendance: [],
    counters: { job: 0, estimate: 0, invoice: 0, part: 0, employee: 0 },
    seededDemoInventory: false,
    seededDemoEmployees: false,
  };
}

export function hydrateLocalDb(raw: Partial<LocalDb> | null | undefined): LocalDb {
  const base = emptyLocalDb();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    counters: { ...base.counters, ...(raw.counters ?? {}) },
    customers: raw.customers ?? [],
    vehicles: raw.vehicles ?? [],
    jobCards: raw.jobCards ?? [],
    statusHistory: raw.statusHistory ?? [],
    estimates: raw.estimates ?? [],
    invoices: raw.invoices ?? [],
    payments: raw.payments ?? [],
    parts: raw.parts ?? [],
    branchStock: raw.branchStock ?? [],
    stockMovements: raw.stockMovements ?? [],
    employees: raw.employees ?? [],
    attendance: raw.attendance ?? [],
    seededDemoInventory: Boolean(raw.seededDemoInventory),
    seededDemoEmployees: Boolean(raw.seededDemoEmployees),
  };
}
