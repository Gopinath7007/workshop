/** India GST helpers (CGST/SGST split for intra-state; IGST for inter-state). */

export type GstBreakdown = {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateGst(params: {
  taxableAmount: number;
  gstPercent: number;
  interState?: boolean;
}): GstBreakdown {
  const taxable = roundMoney(params.taxableAmount);
  const tax = roundMoney((taxable * params.gstPercent) / 100);

  if (params.interState) {
    return {
      taxable,
      cgst: 0,
      sgst: 0,
      igst: tax,
      total: roundMoney(taxable + tax),
    };
  }

  const half = roundMoney(tax / 2);
  return {
    taxable,
    cgst: half,
    sgst: roundMoney(tax - half),
    igst: 0,
    total: roundMoney(taxable + tax),
  };
}
