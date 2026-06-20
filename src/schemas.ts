import { z } from "zod";

/**
 * Flat, richly-described shape for calculator inputs. Mode-specific fields are
 * optional here; the Profitlee API remains the strict validation authority.
 *
 * Units: US uses inches and pounds; DE/JP use cm and kg. All rates are 0-1 decimals.
 */
export const calcInputShape = {
  platform: z.enum(["amazon", "tiktok_shop"]).default("amazon").describe("Sales platform. Default: amazon."),
  region: z.enum(["us", "de", "jp"]).describe("Marketplace. US uses inches+pounds; DE/JP use cm+kg."),
  mode: z
    .enum(["fba", "fbm", "fbt", "self_fulfilled"])
    .describe("Fulfillment mode. amazon: fba or fbm. tiktok_shop: fbt or self_fulfilled."),

  L: z.number().positive().describe("Length. US: inches; DE/JP: cm."),
  W: z.number().positive().describe("Width. US: inches; DE/JP: cm."),
  H: z.number().positive().describe("Height. US: inches; DE/JP: cm."),
  weight: z.number().positive().describe("Unit weight. US: pounds; DE/JP: kg."),

  fob: z.number().nonnegative().describe("Unit manufacturing / FOB cost in the marketplace currency."),
  headShip: z.number().nonnegative().describe("Inbound freight cost allocated per unit."),
  duty: z.number().nonnegative().describe("Import duty per unit."),

  price: z.number().min(0.01).describe("Selling price per unit (gross; VAT-inclusive for DE/JP)."),
  ppcAcos: z.number().min(0).max(1).describe("Advertising ACoS as a 0-1 decimal (0.15 = 15%)."),
  adSalesShare: z.number().min(0).max(1).optional().describe("Ad-attributed share of sales, 0-1. Omit to default to 1."),
  returnRate: z.number().min(0).max(1).describe("Return rate as a 0-1 decimal (0.05 = 5%)."),
  unsellableReturnRate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Unsellable share of returned units, 0-1. Omit to default to 1."),
  monthlyVolume: z.number().int().nonnegative().describe("Units sold per month."),

  referralPct: z.number().min(0).max(1).describe("Referral/commission fee as a 0-1 decimal (0.15 = 15%). Preferred."),
  referralCategory: z
    .string()
    .nullish()
    .describe("Advanced: a category slug that overrides referralPct. Leave unset and use referralPct."),
  isApparel: z.boolean().describe("Whether the product is apparel (affects some fees)."),

  inboundOption: z.enum(["optimized", "partial", "single"]).optional().describe("Amazon FBA only: inbound placement option."),
  storageMonths: z.number().positive().optional().describe("Amazon FBA only: number of months in storage."),
  storageSeason: z.enum(["janSep", "octDec"]).optional().describe("Amazon FBA only: storage season (octDec is the Q4 peak)."),
  outboundShipPerUnit: z.number().nonnegative().optional().describe("FBM or TikTok self_fulfilled: outbound shipping per unit."),
  pickPackPerUnit: z.number().nonnegative().optional().describe("FBM or TikTok self_fulfilled: pick & pack per unit."),
  monthly3plStorage: z.number().nonnegative().optional().describe("FBM or TikTok self_fulfilled: total monthly 3PL storage."),
  storageMonthsPastFree: z
    .number()
    .nonnegative()
    .optional()
    .describe("TikTok fbt only: months stored past the 60-day free window (0 if shipped before it ends)."),
} as const;

/** Object form for runtime parsing of calculator inputs. */
export const calcInputObject = z.object(calcInputShape);
export type CalcInput = z.infer<typeof calcInputObject>;
