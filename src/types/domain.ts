import type {
  AttendanceMethod,
  AttendanceStatus,
  EstimateStatus,
  FuelType,
  InvoiceStatus,
  JobCardStatus,
  PaymentMode,
  PermissionId,
  ServiceCategory,
  SystemRole,
  VehicleType,
} from './enums';

export type VehicleFocus = 'two_wheeler' | 'four_wheeler' | 'both';

export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export interface Organization {
  id: UUID;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  currency: string;
  timezone: string;
  vehicleFocus: VehicleFocus;
  isActive: boolean;
}

export interface Branch {
  id: UUID;
  organizationId: UUID;
  code: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  gstin?: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
}

export interface UserRoleAssignment {
  id: UUID;
  userId: UUID;
  organizationId: UUID;
  branchId?: UUID | null;
  roleId: SystemRole;
  isActive: boolean;
}

export interface SessionContext {
  userId: UUID;
  organizationId: UUID;
  branchId?: UUID | null;
  roles: SystemRole[];
  permissions: PermissionId[];
}

export interface Customer {
  id: UUID;
  organizationId: UUID;
  branchId?: UUID | null;
  name: string;
  mobile: string;
  alternateMobile?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  notes?: string | null;
  outstandingDue: number;
  totalRevenue: number;
}

export interface Vehicle {
  id: UUID;
  organizationId: UUID;
  customerId: UUID;
  registrationNumber: string;
  vehicleType: VehicleType;
  brand?: string | null;
  model?: string | null;
  variant?: string | null;
  fuelType?: FuelType | null;
  color?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  manufactureYear?: number | null;
  odometerReading?: number | null;
  registrationDate?: ISODate | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiry?: ISODate | null;
  warrantyExpiry?: ISODate | null;
}

export interface JobCard {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  jobNumber: string;
  vehicleId: UUID;
  customerId: UUID;
  advisorId?: UUID | null;
  technicianId?: UUID | null;
  status: JobCardStatus;
  complaints?: string | null;
  odometerIn?: number | null;
  estimatedCost: number;
  estimatedDeliveryAt?: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface JobComplaint {
  id: UUID;
  jobCardId: UUID;
  description: string;
  severity: 'low' | 'medium' | 'high';
  isResolved: boolean;
}

export interface ServiceCatalogItem {
  id: UUID;
  organizationId: UUID;
  code: string;
  name: string;
  category: ServiceCategory;
  laborCost: number;
  estimatedMinutes: number;
  gstPercent: number;
}

export interface Estimate {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  jobCardId: UUID;
  estimateNumber: string;
  status: EstimateStatus;
  subtotal: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface EstimateLine {
  id: UUID;
  estimateId: UUID;
  lineType: 'labor' | 'part' | 'package' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  lineTotal: number;
}

export interface Invoice {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  jobCardId?: UUID | null;
  customerId: UUID;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: ISODate;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
}

export interface Payment {
  id: UUID;
  invoiceId: UUID;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  paidAt: ISODateTime;
}

export interface Part {
  id: UUID;
  organizationId: UUID;
  sku: string;
  partNumber?: string | null;
  name: string;
  brand?: string | null;
  costPrice: number;
  sellingPrice: number;
  gstPercent: number;
  reorderLevel: number;
  barcode?: string | null;
}

export interface BranchStock {
  id: UUID;
  branchId: UUID;
  partId: UUID;
  quantityOnHand: number;
  quantityReserved: number;
}

export interface Employee {
  id: UUID;
  organizationId: UUID;
  branchId: UUID;
  userId?: UUID | null;
  employeeCode: string;
  fullName: string;
  department?: string | null;
  designation?: string | null;
  mobile?: string | null;
  email?: string | null;
  joiningDate?: ISODate | null;
  pan?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  basicSalary: number;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: UUID;
  employeeId: UUID;
  branchId: UUID;
  attendanceDate: ISODate;
  status: AttendanceStatus;
  method: AttendanceMethod;
  checkInAt?: ISODateTime | null;
  checkOutAt?: ISODateTime | null;
  overtimeMinutes: number;
}

export interface DocumentAsset {
  id: UUID;
  organizationId: UUID;
  entityType: string;
  entityId: UUID;
  documentType: string;
  fileName: string;
  storagePath: string;
  mimeType?: string | null;
}
