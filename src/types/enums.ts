/** System roles — mirrors `public.roles` seed. */
export type SystemRole =
  | 'super_admin'
  | 'owner'
  | 'branch_manager'
  | 'service_advisor'
  | 'technician'
  | 'accountant'
  | 'store_manager'
  | 'hr_manager'
  | 'receptionist'
  | 'customer';

export type PermissionId =
  | 'dashboard.view'
  | 'customers.create'
  | 'customers.read'
  | 'customers.update'
  | 'customers.delete'
  | 'vehicles.create'
  | 'vehicles.read'
  | 'vehicles.update'
  | 'vehicles.scan'
  | 'job_cards.create'
  | 'job_cards.read'
  | 'job_cards.update'
  | 'job_cards.transition'
  | 'job_cards.assign'
  | 'estimates.manage'
  | 'estimates.approve'
  | 'inventory.manage'
  | 'inventory.read'
  | 'billing.manage'
  | 'billing.read'
  | 'employees.manage'
  | 'employees.read'
  | 'attendance.manage'
  | 'attendance.self'
  | 'payroll.manage'
  | 'payroll.read'
  | 'reports.view'
  | 'reports.export'
  | 'documents.manage'
  | 'notifications.manage'
  | 'branches.manage'
  | 'rbac.manage'
  | 'settings.manage';

export type JobCardStatus =
  | 'open'
  | 'inspection'
  | 'waiting_approval'
  | 'in_progress'
  | 'parts_pending'
  | 'qc'
  | 'ready_delivery'
  | 'delivered'
  | 'closed'
  | 'cancelled';

export type EstimateStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted';

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'void'
  | 'refunded';

export type PaymentMode =
  | 'cash'
  | 'upi'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | 'other';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'on_leave'
  | 'holiday';

export type AttendanceMethod = 'manual' | 'qr' | 'gps' | 'biometric';

export type ServiceCategory =
  | 'general_service'
  | 'periodic_service'
  | 'accident_repair'
  | 'painting'
  | 'denting'
  | 'wheel_alignment'
  | 'washing'
  | 'custom';

export type FuelType = 'petrol' | 'diesel' | 'cng' | 'ev' | 'hybrid' | 'other';

export type VehicleType = 'car' | 'suv' | 'bike' | 'scooter' | 'commercial' | 'other';
