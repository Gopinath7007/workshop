import { ARCHITECTURE } from '../src/config/architecture';
import {
  filterMakesForFocus,
  filterModelsForFocus,
} from '../src/data/indianVehicleCatalog';
import { canTransition, getAvailableTransitions } from '../src/modules/job-cards/workflow';
import { can, permissionsForRoles } from '../src/modules/rbac/permissions';
import { calculateGst } from '../src/utils/gst';
import { normalizeIndianRegistration } from '../src/providers/ocr';

describe('SaaS tenancy', () => {
  it('is configured as multi-org product', () => {
    expect(ARCHITECTURE.tenancy).toBe('multi_org_saas');
    expect(ARCHITECTURE.backend).toBe('supabase');
  });
});

describe('Indian vehicle catalog', () => {
  it('filters 2W vs 4W makes', () => {
    const two = filterMakesForFocus('two_wheeler');
    const four = filterMakesForFocus('four_wheeler');
    expect(two.some((m) => m.name === 'Hero')).toBe(true);
    expect(two.some((m) => m.name === 'Maruti Suzuki')).toBe(false);
    expect(four.some((m) => m.name === 'Maruti Suzuki')).toBe(true);
    expect(four.some((m) => m.name === 'Hero')).toBe(false);
  });

  it('lists models for a make under focus', () => {
    const models = filterModelsForFocus('four_wheeler', 'Hyundai');
    expect(models.map((m) => m.name)).toEqual(expect.arrayContaining(['Creta', 'Venue']));
    expect(filterModelsForFocus('two_wheeler', 'Hyundai')).toHaveLength(0);
  });
});

describe('RBAC', () => {
  it('gives technicians limited permissions', () => {
    const perms = permissionsForRoles(['technician']);
    expect(can(perms, 'job_cards.read')).toBe(true);
    expect(can(perms, 'billing.manage')).toBe(false);
  });

  it('merges permissions across roles', () => {
    const perms = permissionsForRoles(['technician', 'receptionist']);
    expect(can(perms, 'job_cards.create')).toBe(true);
    expect(can(perms, 'vehicles.scan')).toBe(true);
  });
});

describe('job card workflow', () => {
  it('allows open → inspection for advisors', () => {
    const perms = permissionsForRoles(['service_advisor']);
    expect(canTransition('open', 'inspection', perms)).toBe(true);
    expect(getAvailableTransitions('open', perms).map((t) => t.to)).toEqual(
      expect.arrayContaining(['inspection', 'cancelled']),
    );
  });

  it('blocks delivered → closed without billing permission', () => {
    const perms = permissionsForRoles(['technician']);
    expect(canTransition('delivered', 'closed', perms)).toBe(false);
  });
});

describe('India helpers', () => {
  it('normalizes registration numbers', () => {
    expect(normalizeIndianRegistration('mh-12-ab-1234')).toBe('MH12AB1234');
    expect(normalizeIndianRegistration('invalid')).toBeNull();
  });

  it('splits CGST/SGST for intra-state GST', () => {
    const result = calculateGst({ taxableAmount: 1000, gstPercent: 18 });
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.total).toBe(1180);
  });
});
