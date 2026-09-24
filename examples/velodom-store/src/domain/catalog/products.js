/**
 * ----------------------------------------
 * Module: Storefront Product Fixtures
 * ----------------------------------------
 *
 * Provides deterministic public catalog records for the reference consumer.
 * Prices and stock are mock backend facts; no real inventory is represented.
 * ----------------------------------------
 */

export const STORE_CURRENCY = "USD";

export const products = Object.freeze([
  createProduct({
    id: "aurora-lamp",
    name: "Aurora desk lamp",
    category: "workspace",
    categoryLabel: "Workspace",
    summary: "A dimmable task light with a small footprint.",
    description: "Three warm-to-cool light modes and a weighted base make the Aurora lamp a calm companion for focused work.",
    accent: "#6d5dfc",
    priceCents: 7800,
    featuredRank: 1,
    variants: [
      { id: "midnight", label: "Midnight", adjustmentCents: 0, stock: 6 },
      { id: "sand", label: "Sand", adjustmentCents: 400, stock: 4 }
    ]
  }),
  createProduct({
    id: "canvas-pack",
    name: "Canvas day pack",
    category: "carry",
    categoryLabel: "Carry",
    summary: "An adaptable 18 L pack for short daily trips.",
    description: "The Canvas pack has a padded sleeve, repairable hardware, and just enough organization for a workday or city walk.",
    accent: "#0e9f6e",
    priceCents: 9400,
    featuredRank: 2,
    variants: [
      { id: "pine", label: "Pine", adjustmentCents: 0, stock: 8 },
      { id: "clay", label: "Clay", adjustmentCents: 0, stock: 0 }
    ]
  }),
  createProduct({
    id: "focus-timer",
    name: "Focus dial timer",
    category: "workspace",
    categoryLabel: "Workspace",
    summary: "A quiet visual timer with no account or screen.",
    description: "Turn the dial to set a focus block. A high-contrast face and gentle tone keep the timer usable at a glance.",
    accent: "#f97316",
    priceCents: 3600,
    featuredRank: 3,
    variants: [
      { id: "orange", label: "Signal orange", adjustmentCents: 0, stock: 12 },
      { id: "blue", label: "Ocean blue", adjustmentCents: 0, stock: 9 }
    ]
  }),
  createProduct({
    id: "linen-notebook",
    name: "Linen project book",
    category: "stationery",
    categoryLabel: "Stationery",
    summary: "Numbered dot-grid pages with a lay-flat spine.",
    description: "A durable project notebook with recycled paper, two index spreads, and removable archive labels.",
    accent: "#db2777",
    priceCents: 2400,
    featuredRank: 4,
    variants: [
      { id: "dot-grid", label: "Dot grid", adjustmentCents: 0, stock: 18 },
      { id: "plain", label: "Plain", adjustmentCents: 0, stock: 11 }
    ]
  }),
  createProduct({
    id: "travel-mug",
    name: "Drift travel mug",
    category: "outdoors",
    categoryLabel: "Outdoors",
    summary: "A leak-resistant 420 ml insulated mug.",
    description: "The Drift mug opens with one hand and keeps drinks warm without adding a bulky handle to your bag.",
    accent: "#0891b2",
    priceCents: 3200,
    featuredRank: 5,
    variants: [
      { id: "steel", label: "Brushed steel", adjustmentCents: 300, stock: 7 },
      { id: "ink", label: "Ink", adjustmentCents: 0, stock: 13 }
    ]
  }),
  createProduct({
    id: "cable-kit",
    name: "Everyday cable kit",
    category: "carry",
    categoryLabel: "Carry",
    summary: "Three labeled pouches for small technical essentials.",
    description: "Keep adapters and cables visible in lightweight recycled-mesh pouches that nest into the Canvas pack.",
    accent: "#2563eb",
    priceCents: 2800,
    featuredRank: 6,
    variants: [
      { id: "set-of-three", label: "Set of three", adjustmentCents: 0, stock: 16 }
    ]
  }),
  createProduct({
    id: "field-blanket",
    name: "Field picnic blanket",
    category: "outdoors",
    categoryLabel: "Outdoors",
    summary: "A water-resistant blanket that folds into its own strap.",
    description: "A soft woven surface and coated base make this blanket ready for parks, beaches, and impromptu outdoor work.",
    accent: "#65a30d",
    priceCents: 6800,
    featuredRank: 7,
    variants: [
      { id: "meadow", label: "Meadow", adjustmentCents: 0, stock: 5 },
      { id: "sunset", label: "Sunset", adjustmentCents: 500, stock: 3 }
    ]
  }),
  createProduct({
    id: "marker-set",
    name: "Archive marker set",
    category: "stationery",
    categoryLabel: "Stationery",
    summary: "Six archival markers with replaceable tips.",
    description: "A compact set for diagrams, notes, and labels. Each marker has a tactile cap pattern for quick identification.",
    accent: "#7c3aed",
    priceCents: 1900,
    featuredRank: 8,
    variants: [
      { id: "fine", label: "Fine tip", adjustmentCents: 0, stock: 20 },
      { id: "brush", label: "Brush tip", adjustmentCents: 600, stock: 10 }
    ]
  })
]);

function createProduct(product) {
  return Object.freeze({
    ...product,
    variants: Object.freeze(product.variants.map(variant => Object.freeze(variant)))
  });
}
