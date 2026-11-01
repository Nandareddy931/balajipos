// src/types/invoice.ts
import type { Product } from "../services/productService";

export interface ParsedInvoiceItem {
    product: string;
    hsn: string;
    batch?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    packSize?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
}

export interface ParsedInvoice {
    supplier: string;
    invoiceNumber: string;
    invoiceDate: string;
    supplierGstin: string;
    customer: string;
    customerGstin: string;
    items: ParsedInvoiceItem[];
    taxableValue: number;
    cgst: number;
    sgst: number;
    rounding: number;
    total: number;
}

export interface ProductMatchResult {
    invoiceItem: ParsedInvoiceItem;
    matchedProduct: Product | null;
    confidence: "high" | "medium" | "none";
    isNewProduct: boolean;
}