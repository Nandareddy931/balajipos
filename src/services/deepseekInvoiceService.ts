// src/services/deepseekInvoiceService.ts
import type { ParsedInvoice, ParsedInvoiceItem } from "../types/invoice";

// Points to your Cloudflare Worker (API key stays server-side)
// Replace this URL with your actual Worker URL after deploying
const PROXY_ENDPOINT =
    "https://balaji-invoice-proxy.ssivasankarreddy9.workers.dev/";

/**
 * Compress image to reduce token usage.
 */
const compressImage = async (file: File): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    return canvas.toDataURL("image/jpeg", 0.85);
};

const SYSTEM_PROMPT = `You are an invoice parser for an Indian pesticide and fertilizer shop.

Read the attached supplier invoice image and extract EVERY product line item.

Return ONLY a valid json object matching this EXACT schema:

{
  "supplierName": "string — supplier company name",
  "supplierGstin": "string — 15-char GSTIN or empty",
  "invoiceNumber": "string — invoice/bill number",
  "invoiceDate": "string — YYYY-MM-DD format",
  "items": [
    {
      "product": "string — product name exactly as printed",
      "hsn": "string — HSN/SAC code or empty",
      "batch": "string — batch number or empty",
      "expiryDate": "string — YYYY-MM-DD or empty",
      "packSize": "string — e.g. '1 LT', '500 ML', '40 kg' or empty",
      "quantity": number — quantity as a number,
      "unit": "string — e.g. 'bag', 'kg', 'L', 'ML', 'units' or empty",
      "rate": number — rate per unit (numeric, no ₹ symbol),
      "amount": number — line total (numeric, no ₹ symbol)
    }
  ]
}

RULES:
1. Extract ALL product rows, even if layout is complex.
2. Numbers: strip all commas and currency symbols. "21,428.70" → 21428.70
3. Dates: convert "5-Aug-26" → "2026-08-05", "15-11-2026" → "2026-11-15"
4. If a field is missing, use "" for strings and 0 for numbers.
5. Skip header rows, totals, tax summary, bank details, and footer text.
6. Return ONLY the json object — no markdown, no explanation.`;

/**
 * Main function — sends invoice image to the Worker proxy,
 * which forwards it to FastRouter with the API key.
 */
export const extractInvoiceWithDeepSeek = async (
    file: File
): Promise<ParsedInvoice> => {
    const dataUrl = await compressImage(file);
    const base64Data = dataUrl.split(",")[1];

    // Plain fetch — full control over headers, no SDK interference
    const response = await fetch(PROXY_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "fastrouter/free",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: SYSTEM_PROMPT },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Data}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 4000,
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        let errMsg = `API error (${response.status})`;
        try {
            const errJson = JSON.parse(errText);
            errMsg += `: ${errJson.error?.message || errText.slice(0, 200)}`;
        } catch {
            errMsg += `: ${errText.slice(0, 200)}`;
        }
        throw new Error(errMsg);
    }

    const json = await response.json();
    const rawText = json?.choices?.[0]?.message?.content ?? "";

    if (!rawText) {
        throw new Error("AI returned empty response. Try again.");
    }

    // Strip markdown fences if present
    let cleaned = rawText.trim();
    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // Fallback: find first { and last }
    if (!cleaned.startsWith("{")) {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
            cleaned = cleaned.slice(start, end + 1);
        }
    }

    let parsed: any;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        console.error("Failed to parse:", cleaned);
        throw new Error("AI response was not valid JSON. Try a clearer photo.");
    }

    if (!Array.isArray(parsed.items)) {
        throw new Error("AI could not extract items from this invoice.");
    }

    const items: ParsedInvoiceItem[] = parsed.items
        .map((raw: any) => ({
            product: String(raw.product ?? "").trim(),
            hsn: String(raw.hsn ?? "").trim(),
            batch: raw.batch ? String(raw.batch).trim() : undefined,
            manufacturingDate: undefined,
            expiryDate: raw.expiryDate ? String(raw.expiryDate).trim() : undefined,
            packSize: raw.packSize ? String(raw.packSize).trim() : undefined,
            quantity: Number(raw.quantity) || 0,
            unit: String(raw.unit ?? "").trim(),
            rate: Number(raw.rate) || 0,
            amount: Number(raw.amount) || 0,
        }))
        .filter(
            (item: ParsedInvoiceItem) =>
                item.product.length > 1 && item.quantity > 0
        );

    return {
        supplier: parsed.supplierName || "Unknown Supplier",
        supplierGstin: parsed.supplierGstin || "",
        invoiceNumber: parsed.invoiceNumber || "",
        invoiceDate: parsed.invoiceDate || "",
        customer: "",
        customerGstin: "",
        items,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        rounding: 0,
        total: 0,
    };
};