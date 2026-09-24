import type {
  Branch,
  Customer,
  Estimate,
  Invoice,
  JobCard,
  JobCardStatus,
  Organization,
  Payment,
  SessionContext,
  Vehicle,
} from '../types';

export interface ListParams {
  organizationId: string;
  branchId?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface OrganizationRepository {
  getById(id: string): Promise<Organization | null>;
  listForUser(userId: string): Promise<Organization[]>;
}

export interface BranchRepository {
  listByOrganization(organizationId: string): Promise<Branch[]>;
  getById(id: string): Promise<Branch | null>;
}

export interface RbacRepository {
  getSessionContext(
    userId: string,
    organizationId: string,
    branchId?: string | null,
  ): Promise<SessionContext>;
}

export interface CustomerRepository {
  list(params: ListParams): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  findByMobile(organizationId: string, mobile: string): Promise<Customer | null>;
  create(input: Omit<Customer, 'id' | 'outstandingDue' | 'totalRevenue'>): Promise<Customer>;
  update(id: string, patch: Partial<Customer>): Promise<Customer>;
}

export interface VehicleRepository {
  list(params: ListParams & { customerId?: string }): Promise<Vehicle[]>;
  getById(id: string): Promise<Vehicle | null>;
  findByRegistration(organizationId: string, registrationNumber: string): Promise<Vehicle | null>;
  create(input: Omit<Vehicle, 'id'>): Promise<Vehicle>;
  update(id: string, patch: Partial<Vehicle>): Promise<Vehicle>;
}

export interface CreateJobCardInput {
  organizationId: string;
  branchId: string;
  vehicleId: string;
  customerId: string;
  advisorId?: string | null;
  complaints?: string | null;
  odometerIn?: number | null;
  estimatedCost?: number;
  estimatedDeliveryAt?: string | null;
  createdBy?: string | null;
}

export interface JobCardRepository {
  list(
    params: ListParams & { status?: JobCardStatus | JobCardStatus[] },
  ): Promise<JobCard[]>;
  getById(id: string): Promise<JobCard | null>;
  create(input: CreateJobCardInput): Promise<JobCard>;
  update(id: string, patch: Partial<JobCard>): Promise<JobCard>;
  transition(
    id: string,
    toStatus: JobCardStatus,
    changedBy: string,
    note?: string,
  ): Promise<JobCard>;
}

export interface EstimateRepository {
  list(params: ListParams & { status?: Estimate['status'] | Estimate['status'][] }): Promise<Estimate[]>;
  listByJobCard(jobCardId: string): Promise<Estimate[]>;
  getById(id: string): Promise<Estimate | null>;
  create(input: Omit<Estimate, 'id'> & { lines: unknown[] }): Promise<Estimate>;
  updateStatus(id: string, status: Estimate['status']): Promise<Estimate>;
}

export interface InvoiceRepository {
  list(params: ListParams & { status?: InvoiceStatusFilter }): Promise<Invoice[]>;
  getById(id: string): Promise<Invoice | null>;
  createFromJobCard(jobCardId: string, createdBy: string): Promise<Invoice>;
  recordPayment(
    invoiceId: string,
    payment: Omit<Payment, 'id' | 'invoiceId'>,
  ): Promise<{ invoice: Invoice; payment: Payment }>;
}

type InvoiceStatusFilter = Invoice['status'] | Invoice['status'][];
