import type {
  Customer,
  Estimate,
  Invoice,
  JobCard,
  JobCardStatus,
  Payment,
  Vehicle,
} from '../../types';

type DbCustomer = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  notes: string | null;
  outstanding_due: number;
  total_revenue: number;
};

type DbVehicle = {
  id: string;
  organization_id: string;
  customer_id: string;
  registration_number: string;
  vehicle_type: string;
  brand: string | null;
  model: string | null;
  variant: string | null;
  fuel_type: string | null;
  color: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  manufacture_year: number | null;
  odometer_reading: number | null;
  registration_date: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  warranty_expiry: string | null;
};

type DbJobCard = {
  id: string;
  organization_id: string;
  branch_id: string;
  job_number: string;
  vehicle_id: string;
  customer_id: string;
  advisor_id: string | null;
  technician_id: string | null;
  status: JobCardStatus;
  complaints: string | null;
  odometer_in: number | null;
  estimated_cost: number;
  estimated_delivery_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbEstimate = {
  id: string;
  organization_id: string;
  branch_id: string;
  job_card_id: string;
  estimate_number: string;
  status: Estimate['status'];
  subtotal: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
};

type DbInvoice = {
  id: string;
  organization_id: string;
  branch_id: string;
  job_card_id: string | null;
  customer_id: string;
  invoice_number: string;
  status: Invoice['status'];
  invoice_date: string;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
};

type DbPayment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_mode: Payment['paymentMode'];
  reference_number: string | null;
  paid_at: string;
};

export function mapCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    name: row.name,
    mobile: row.mobile,
    alternateMobile: row.alternate_mobile,
    email: row.email,
    addressLine1: row.address_line1,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    gstin: row.gstin,
    notes: row.notes,
    outstandingDue: Number(row.outstanding_due),
    totalRevenue: Number(row.total_revenue),
  };
}

export function mapVehicle(row: DbVehicle): Vehicle {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    registrationNumber: row.registration_number,
    vehicleType: row.vehicle_type as Vehicle['vehicleType'],
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    fuelType: row.fuel_type as Vehicle['fuelType'],
    color: row.color,
    chassisNumber: row.chassis_number,
    engineNumber: row.engine_number,
    manufactureYear: row.manufacture_year,
    odometerReading: row.odometer_reading,
    registrationDate: row.registration_date,
    insuranceProvider: row.insurance_provider,
    insurancePolicyNumber: row.insurance_policy_number,
    insuranceExpiry: row.insurance_expiry,
    warrantyExpiry: row.warranty_expiry,
  };
}

export function mapJobCard(row: DbJobCard): JobCard {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    jobNumber: row.job_number,
    vehicleId: row.vehicle_id,
    customerId: row.customer_id,
    advisorId: row.advisor_id,
    technicianId: row.technician_id,
    status: row.status,
    complaints: row.complaints,
    odometerIn: row.odometer_in,
    estimatedCost: Number(row.estimated_cost),
    estimatedDeliveryAt: row.estimated_delivery_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEstimate(row: DbEstimate): Estimate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    jobCardId: row.job_card_id,
    estimateNumber: row.estimate_number,
    status: row.status,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    cgstAmount: Number(row.cgst_amount),
    sgstAmount: Number(row.sgst_amount),
    igstAmount: Number(row.igst_amount),
    totalAmount: Number(row.total_amount),
  };
}

export function mapInvoice(row: DbInvoice): Invoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    jobCardId: row.job_card_id,
    customerId: row.customer_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    invoiceDate: row.invoice_date,
    subtotal: Number(row.subtotal),
    cgstAmount: Number(row.cgst_amount),
    sgstAmount: Number(row.sgst_amount),
    igstAmount: Number(row.igst_amount),
    totalAmount: Number(row.total_amount),
    amountPaid: Number(row.amount_paid),
    amountDue: Number(row.amount_due),
  };
}

export function mapPayment(row: DbPayment): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    referenceNumber: row.reference_number,
    paidAt: row.paid_at,
  };
}
