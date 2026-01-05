import { describe, it, expect } from "vitest";
import { normalizeHeader } from "../normalizeHeader";
import {
  suggestMapping,
  sanityCheckPreview,
  createPreviewRows,
} from "../suggestMapping";

describe("normalizeHeader", () => {
  it("should lowercase and trim", () => {
    expect(normalizeHeader("  Net Sales  ")).toBe("net sales");
  });

  it("should remove currency symbols", () => {
    expect(normalizeHeader("Net Sales ($)")).toBe("net sales");
    expect(normalizeHeader("Amount €")).toBe("amount");
    expect(normalizeHeader("£ Revenue")).toBe("revenue");
  });

  it("should replace punctuation with space", () => {
    expect(normalizeHeader("item-name")).toBe("item name");
    expect(normalizeHeader("qty_sold")).toBe("qty sold");
    expect(normalizeHeader("sales/revenue")).toBe("sales revenue");
  });

  it("should collapse multiple spaces", () => {
    expect(normalizeHeader("net   sales   amount")).toBe("net sales amount");
  });

  it("should handle complex headers", () => {
    expect(normalizeHeader("Menu Item (Name)")).toBe("menu item name");
    expect(normalizeHeader("QTY. SOLD")).toBe("qty sold");
    expect(normalizeHeader("Net-Sales_$")).toBe("net sales");
  });
});

describe("suggestMapping - Toast-like headers", () => {
  it("should correctly map Toast export headers", () => {
    const toastHeaders = [
      "Menu Item",
      "Menu Group",
      "Qty",
      "Gross Sales",
      "Discounts",
      "Net Sales",
      "Void Qty",
      "Void Amount",
    ];

    const result = suggestMapping(toastHeaders, "toast");

    expect(result.suggestions.get("item_name")?.headerName).toBe("Menu Item");
    expect(result.suggestions.get("category")?.headerName).toBe("Menu Group");
    expect(result.suggestions.get("quantity_sold")?.headerName).toBe("Qty");
    expect(result.suggestions.get("net_sales")?.headerName).toBe("Net Sales");
    expect(result.suggestions.get("gross_sales")?.headerName).toBe(
      "Gross Sales"
    );
    expect(result.suggestions.get("discounts")?.headerName).toBe("Discounts");
    expect(result.unmappedRequiredFields.length).toBe(0);
  });

  it("should have high confidence for Toast patterns", () => {
    const headers = ["Menu Item", "Qty", "Net Sales"];
    const result = suggestMapping(headers, "toast");

    const itemSuggestion = result.suggestions.get("item_name");
    const qtySuggestion = result.suggestions.get("quantity_sold");
    const salesSuggestion = result.suggestions.get("net_sales");

    expect(itemSuggestion?.confidence).toBeGreaterThan(0.7);
    expect(qtySuggestion?.confidence).toBeGreaterThan(0.7);
    expect(salesSuggestion?.confidence).toBeGreaterThan(0.7);
  });
});

describe("suggestMapping - Square-like headers", () => {
  it("should correctly map Square export headers", () => {
    const squareHeaders = [
      "Item",
      "Item Variation",
      "Category",
      "Qty Sold",
      "Gross Sales",
      "Discounts",
      "Net Sales",
      "Refunds",
    ];

    const result = suggestMapping(squareHeaders, "square");

    expect(result.suggestions.get("item_name")?.headerName).toBe("Item");
    expect(result.suggestions.get("variation_name")?.headerName).toBe(
      "Item Variation"
    );
    expect(result.suggestions.get("category")?.headerName).toBe("Category");
    expect(result.suggestions.get("quantity_sold")?.headerName).toBe("Qty Sold");
    expect(result.suggestions.get("net_sales")?.headerName).toBe("Net Sales");
    expect(result.suggestions.get("gross_sales")?.headerName).toBe(
      "Gross Sales"
    );
    expect(result.suggestions.get("refunds")?.headerName).toBe("Refunds");
    expect(result.unmappedRequiredFields.length).toBe(0);
  });

  it("should handle Square-specific terminology", () => {
    const headers = ["Product", "Units Sold", "Net Sales"];
    const result = suggestMapping(headers, "square");

    expect(result.suggestions.get("item_name")?.headerName).toBe("Product");
    expect(result.suggestions.get("quantity_sold")?.headerName).toBe(
      "Units Sold"
    );
  });
});

describe("suggestMapping - ambiguous headers", () => {
  it("should warn about missing required fields", () => {
    const headers = ["Item Name", "Category"];
    const result = suggestMapping(headers);

    expect(result.unmappedRequiredFields).toContain("quantity_sold");
    expect(result.unmappedRequiredFields).toContain("net_sales");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should handle ambiguous sales column", () => {
    const headers = ["Item", "Qty", "Sales", "Amount"];
    const result = suggestMapping(headers);

    // Should still find item and qty
    expect(result.suggestions.get("item_name")).toBeDefined();
    expect(result.suggestions.get("quantity_sold")).toBeDefined();
  });
});

describe("sanityCheckPreview", () => {
  it("should pass for reasonable prices", () => {
    const rows = [
      { item_name: "Burger", quantity_sold: 10, net_sales: 150, avg_price: 15 },
      { item_name: "Fries", quantity_sold: 20, net_sales: 100, avg_price: 5 },
    ];

    const result = sanityCheckPreview(rows);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it("should warn about nonsensical prices", () => {
    const rows = [
      {
        item_name: "Burger",
        quantity_sold: 10,
        net_sales: 5,
        avg_price: 0.5, // Too low
      },
      {
        item_name: "Expensive Item",
        quantity_sold: 1,
        net_sales: 500,
        avg_price: 500, // Too high
      },
    ];

    const result = sanityCheckPreview(rows);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes("unusual average prices"))).toBe(
      true
    );
  });

  it("should warn about negative quantities", () => {
    const rows = [
      {
        item_name: "Refunded Item",
        quantity_sold: -2,
        net_sales: -30,
        avg_price: 15,
      },
    ];

    const result = sanityCheckPreview(rows);
    expect(result.warnings.some((w) => w.includes("negative quantities"))).toBe(
      true
    );
  });

  it("should warn about negative sales", () => {
    const rows = [
      {
        item_name: "Discounted Item",
        quantity_sold: 5,
        net_sales: -10,
        avg_price: -2,
      },
    ];

    const result = sanityCheckPreview(rows);
    expect(result.warnings.some((w) => w.includes("negative sales"))).toBe(true);
  });
});

describe("createPreviewRows", () => {
  it("should create preview rows from raw data", () => {
    const rawRows = [
      { Item: "Burger", Qty: "10", "Net Sales": "150.00" },
      { Item: "Fries", Qty: "20", "Net Sales": "100.00" },
    ];

    const mapping = new Map<
      "item_name" | "quantity_sold" | "net_sales",
      string
    >([
      ["item_name", "Item"],
      ["quantity_sold", "Qty"],
      ["net_sales", "Net Sales"],
    ]);

    const result = createPreviewRows(rawRows, mapping);

    expect(result.length).toBe(2);
    expect(result[0].item_name).toBe("Burger");
    expect(result[0].quantity_sold).toBe(10);
    expect(result[0].net_sales).toBe(150);
    expect(result[0].avg_price).toBe(15);
  });

  it("should limit preview rows", () => {
    const rawRows = Array(10)
      .fill(null)
      .map((_, i) => ({
        Item: `Item ${i}`,
        Qty: "10",
        "Net Sales": "100",
      }));

    const mapping = new Map<
      "item_name" | "quantity_sold" | "net_sales",
      string
    >([
      ["item_name", "Item"],
      ["quantity_sold", "Qty"],
      ["net_sales", "Net Sales"],
    ]);

    const result = createPreviewRows(rawRows, mapping, 5);
    expect(result.length).toBe(5);
  });
});
