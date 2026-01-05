/**
 * Canonical internal fields for POS data mapping
 */
export type CanonicalField =
  | "week_start"
  | "week_end"
  | "item_name"
  | "category"
  | "quantity_sold"
  | "net_sales"
  | "gross_sales"
  | "discounts"
  | "refunds"
  | "voids"
  | "location"
  | "item_id"
  | "variation_name";

export interface FieldDefinition {
  field: CanonicalField;
  required: boolean;
  synonyms: string[];
}

/**
 * Field definitions with synonym sets for auto-suggest mapping
 */
export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    field: "item_name",
    required: true,
    synonyms: [
      "menu item",
      "item",
      "item name",
      "name",
      "product",
      "description",
      "product name",
      "menu item name",
    ],
  },
  {
    field: "category",
    required: false,
    synonyms: [
      "category",
      "menu group",
      "menu section",
      "group",
      "section",
      "menu category",
      "item category",
      "product category",
    ],
  },
  {
    field: "quantity_sold",
    required: true,
    synonyms: [
      "qty",
      "quantity",
      "quantity sold",
      "count",
      "units",
      "items sold",
      "qty sold",
      "sold",
      "units sold",
      "total qty",
      "total quantity",
    ],
  },
  {
    field: "net_sales",
    required: true,
    synonyms: [
      "net sales",
      "net",
      "sales net",
      "net revenue",
      "total net sales",
      "net amount",
      "net total",
      "sales after discounts",
    ],
  },
  {
    field: "gross_sales",
    required: false,
    synonyms: [
      "gross sales",
      "gross",
      "sales gross",
      "gross revenue",
      "total gross sales",
      "gross amount",
      "sales before discounts",
    ],
  },
  {
    field: "discounts",
    required: false,
    synonyms: [
      "discount",
      "discounts",
      "promotions",
      "promo",
      "comp",
      "comps",
      "discount amount",
      "total discounts",
    ],
  },
  {
    field: "refunds",
    required: false,
    synonyms: [
      "refund",
      "refunds",
      "returns",
      "return amount",
      "refunded",
      "refund amount",
      "total refunds",
    ],
  },
  {
    field: "voids",
    required: false,
    synonyms: [
      "void",
      "voids",
      "void amount",
      "voided",
      "total voids",
      "void count",
    ],
  },
  {
    field: "location",
    required: false,
    synonyms: [
      "location",
      "store",
      "restaurant",
      "site",
      "location name",
      "store name",
      "outlet",
    ],
  },
  {
    field: "week_start",
    required: false,
    synonyms: [
      "week start",
      "start date",
      "from",
      "date from",
      "from date",
      "period start",
      "week beginning",
    ],
  },
  {
    field: "week_end",
    required: false,
    synonyms: [
      "week end",
      "end date",
      "to",
      "date to",
      "to date",
      "period end",
      "week ending",
    ],
  },
  {
    field: "item_id",
    required: false,
    synonyms: [
      "item id",
      "id",
      "product id",
      "sku",
      "item code",
      "product code",
      "plu",
      "menu item id",
    ],
  },
  {
    field: "variation_name",
    required: false,
    synonyms: [
      "variation",
      "item variation",
      "variant",
      "variation name",
      "modifier",
      "size",
    ],
  },
];

/**
 * POS preset configurations that bias mapping suggestions
 */
export type POSPreset = "toast" | "square" | "generic";

export interface PresetConfig {
  name: string;
  biasTerms: string[];
  priorityFields?: CanonicalField[];
}

export const POS_PRESETS: Record<POSPreset, PresetConfig> = {
  toast: {
    name: "Toast",
    biasTerms: [
      "menu item",
      "menu group",
      "qty",
      "void",
      "comp",
      "net amount",
    ],
    priorityFields: ["item_name", "category", "quantity_sold", "net_sales"],
  },
  square: {
    name: "Square",
    biasTerms: [
      "gross sales",
      "discounts",
      "net sales",
      "item variation",
      "product",
    ],
    priorityFields: ["item_name", "quantity_sold", "gross_sales", "net_sales"],
  },
  generic: {
    name: "Generic",
    biasTerms: [],
    priorityFields: ["item_name", "category", "quantity_sold", "net_sales"],
  },
};

/**
 * Get field definition by canonical field name
 */
export function getFieldDefinition(
  field: CanonicalField
): FieldDefinition | undefined {
  return FIELD_DEFINITIONS.find((f) => f.field === field);
}

/**
 * Get all required fields
 */
export function getRequiredFields(): CanonicalField[] {
  return FIELD_DEFINITIONS.filter((f) => f.required).map((f) => f.field);
}

/**
 * Get all optional fields
 */
export function getOptionalFields(): CanonicalField[] {
  return FIELD_DEFINITIONS.filter((f) => !f.required).map((f) => f.field);
}
