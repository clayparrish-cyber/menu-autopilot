import {
  CanonicalField,
  FIELD_DEFINITIONS,
  POSPreset,
  POS_PRESETS,
  getRequiredFields,
} from "./headerSynonyms";
import { normalizeHeader, calculateSimilarity } from "./normalizeHeader";

export interface MappingSuggestion {
  field: CanonicalField;
  headerIndex: number;
  headerName: string;
  confidence: number;
  required: boolean;
}

export interface MappingResult {
  suggestions: Map<CanonicalField, MappingSuggestion>;
  unmappedHeaders: string[];
  unmappedRequiredFields: CanonicalField[];
  warnings: string[];
}

/**
 * Suggests column mappings for CSV headers
 *
 * @param headers - Array of CSV header strings
 * @param preset - POS system preset for biased suggestions
 * @returns MappingResult with suggestions and warnings
 */
export function suggestMapping(
  headers: string[],
  preset: POSPreset = "generic"
): MappingResult {
  const presetConfig = POS_PRESETS[preset];
  const suggestions = new Map<CanonicalField, MappingSuggestion>();
  const usedHeaders = new Set<number>();
  const warnings: string[] = [];

  // Normalize all headers once
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));

  // Score each header against each field
  const scores: Array<{
    field: CanonicalField;
    headerIndex: number;
    score: number;
    required: boolean;
  }> = [];

  for (const fieldDef of FIELD_DEFINITIONS) {
    for (let i = 0; i < headers.length; i++) {
      const normalized = normalizedHeaders[i];
      let maxScore = 0;

      // Check against all synonyms
      for (const synonym of fieldDef.synonyms) {
        const score = calculateSimilarity(normalized, synonym);
        maxScore = Math.max(maxScore, score);
      }

      // Apply preset bias
      if (maxScore > 0 && presetConfig.biasTerms.length > 0) {
        for (const biasTerm of presetConfig.biasTerms) {
          if (normalized.includes(biasTerm) || biasTerm.includes(normalized)) {
            maxScore = Math.min(1, maxScore * 1.1);
            break;
          }
        }
      }

      if (maxScore > 0.3) {
        scores.push({
          field: fieldDef.field,
          headerIndex: i,
          score: maxScore,
          required: fieldDef.required,
        });
      }
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Assign best matches, avoiding duplicates
  for (const entry of scores) {
    if (suggestions.has(entry.field) || usedHeaders.has(entry.headerIndex)) {
      continue;
    }

    suggestions.set(entry.field, {
      field: entry.field,
      headerIndex: entry.headerIndex,
      headerName: headers[entry.headerIndex],
      confidence: entry.score,
      required: entry.required,
    });

    usedHeaders.add(entry.headerIndex);
  }

  // Find unmapped headers
  const unmappedHeaders: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (!usedHeaders.has(i)) {
      unmappedHeaders.push(headers[i]);
    }
  }

  // Find unmapped required fields
  const requiredFields = getRequiredFields();
  const unmappedRequiredFields = requiredFields.filter(
    (f) => !suggestions.has(f)
  );

  // Generate warnings
  if (unmappedRequiredFields.length > 0) {
    warnings.push(
      `Missing required fields: ${unmappedRequiredFields.join(", ")}`
    );
  }

  // Warn about low confidence mappings for required fields
  for (const field of requiredFields) {
    const suggestion = suggestions.get(field);
    if (suggestion && suggestion.confidence < 0.7) {
      warnings.push(
        `Low confidence mapping for ${field}: "${suggestion.headerName}" (${Math.round(suggestion.confidence * 100)}%)`
      );
    }
  }

  return {
    suggestions,
    unmappedHeaders,
    unmappedRequiredFields,
    warnings,
  };
}

/**
 * Validates a user's confirmed mapping
 */
export interface ConfirmedMapping {
  [headerName: string]: CanonicalField | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  mapping: Map<CanonicalField, string>;
}

export function validateMapping(
  headers: string[],
  mapping: ConfirmedMapping
): ValidationResult {
  const errors: string[] = [];
  const fieldToHeader = new Map<CanonicalField, string>();

  // Check all required fields are mapped
  const requiredFields = getRequiredFields();
  for (const field of requiredFields) {
    let found = false;
    for (const [header, mappedField] of Object.entries(mapping)) {
      if (mappedField === field) {
        if (!headers.includes(header)) {
          errors.push(`Header "${header}" not found in CSV`);
        } else {
          fieldToHeader.set(field, header);
          found = true;
        }
        break;
      }
    }
    if (!found) {
      errors.push(`Required field "${field}" is not mapped`);
    }
  }

  // Check for duplicate mappings
  const usedFields = new Set<CanonicalField>();
  for (const [header, field] of Object.entries(mapping)) {
    if (field === null) continue;
    if (usedFields.has(field)) {
      errors.push(`Field "${field}" is mapped to multiple columns`);
    }
    usedFields.add(field);
    if (!fieldToHeader.has(field)) {
      fieldToHeader.set(field, header);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    mapping: fieldToHeader,
  };
}

/**
 * Sanity check for mapped data preview
 */
export interface PreviewRow {
  item_name: string;
  quantity_sold: number;
  net_sales: number;
  avg_price: number;
}

export interface SanityCheckResult {
  valid: boolean;
  warnings: string[];
  rows: PreviewRow[];
}

export function sanityCheckPreview(
  rows: PreviewRow[],
  options: { minAvgPrice?: number; maxAvgPrice?: number } = {}
): SanityCheckResult {
  const { minAvgPrice = 1, maxAvgPrice = 250 } = options;
  const warnings: string[] = [];

  let hasNegativeQty = false;
  let hasNegativeSales = false;
  let hasNonsensicalPrice = false;

  for (const row of rows) {
    if (row.quantity_sold < 0) {
      hasNegativeQty = true;
    }
    if (row.net_sales < 0) {
      hasNegativeSales = true;
    }
    if (
      row.quantity_sold > 0 &&
      (row.avg_price < minAvgPrice || row.avg_price > maxAvgPrice)
    ) {
      hasNonsensicalPrice = true;
    }
  }

  if (hasNegativeQty) {
    warnings.push(
      "Some rows have negative quantities. These may be refunds/adjustments and will be handled specially."
    );
  }

  if (hasNegativeSales) {
    warnings.push(
      "Some rows have negative sales. These may be refunds/adjustments and will be handled specially."
    );
  }

  if (hasNonsensicalPrice) {
    warnings.push(
      `Some items have unusual average prices (< $${minAvgPrice} or > $${maxAvgPrice}). ` +
        "This might indicate the wrong sales column was selected (e.g., tax-inclusive vs net)."
    );
  }

  return {
    valid: !hasNonsensicalPrice,
    warnings,
    rows,
  };
}

/**
 * Create preview rows from raw data using mapping
 */
export function createPreviewRows(
  rawRows: Record<string, string>[],
  mapping: Map<CanonicalField, string>,
  limit: number = 5
): PreviewRow[] {
  const itemNameHeader = mapping.get("item_name");
  const qtyHeader = mapping.get("quantity_sold");
  const salesHeader = mapping.get("net_sales");

  if (!itemNameHeader || !qtyHeader || !salesHeader) {
    return [];
  }

  const previewRows: PreviewRow[] = [];

  for (let i = 0; i < Math.min(limit, rawRows.length); i++) {
    const row = rawRows[i];
    const quantity = parseFloat(row[qtyHeader]) || 0;
    const sales = parseFloat(row[salesHeader]) || 0;
    const avgPrice = quantity !== 0 ? sales / quantity : 0;

    previewRows.push({
      item_name: row[itemNameHeader] || "",
      quantity_sold: quantity,
      net_sales: sales,
      avg_price: avgPrice,
    });
  }

  return previewRows;
}
