import { ProductCategory, CustomerTier } from "@prisma/client";

interface LineInput {
  category: ProductCategory;
  discountPct: number;
  lineTotal: number;
}

interface RiskResult {
  blendedRiskScore: number;
  needsManagerApproval: boolean;
  needsFinanceApproval: boolean;
  reasons: string[];
}

// Category limits (seed se match karte hain)
const CATEGORY_LIMITS: Record<ProductCategory, number> = {
  HARDWARE: 15,
  SERVICE: 10,
  SUBSCRIPTION: 12,
};

// Customer tier base allowance (extra buffer)
const TIER_BUFFER: Record<CustomerTier, number> = {
  BRONZE: 0,
  SILVER: 2,
  GOLD: 5,
};

export function calculateBlendedRiskScore(
  lines: LineInput[],
  customerTier: CustomerTier
): RiskResult {
  if (lines.length === 0) {
    return {
      blendedRiskScore: 0,
      needsManagerApproval: false,
      needsFinanceApproval: false,
      reasons: [],
    };
  }

  let totalOverLimit = 0;
  let totalValue = 0;
  const reasons: string[] = [];

  for (const line of lines) {
    const allowed = CATEGORY_LIMITS[line.category] + TIER_BUFFER[customerTier];
    const over = Math.max(0, line.discountPct - allowed);

    if (over > 0) {
      reasons.push(
        `${line.category} line ${line.discountPct}% (allowed ${allowed}%) → +${over.toFixed(1)} pts over`
      );
    }

    // Weighted by line value
    totalOverLimit += over * line.lineTotal;
    totalValue += line.lineTotal;
  }

  const blendedRiskScore =
    totalValue > 0 ? Number((totalOverLimit / totalValue).toFixed(2)) : 0;

  // Thresholds (judges ko clear dikhega)
  const needsManagerApproval = blendedRiskScore > 0;
  const needsFinanceApproval = blendedRiskScore >= 8; // high risk

  return {
    blendedRiskScore,
    needsManagerApproval,
    needsFinanceApproval,
    reasons,
  };
}
