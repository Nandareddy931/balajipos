// src/pages/ScanInvoice.tsx
import { useState, useEffect } from "react";

import { extractInvoiceWithDeepSeek } from "../services/deepseekInvoiceService";
import { matchInvoiceItems } from "../services/productMatchingService";
import {
    getProducts,
    addProduct,
    findProductByName,
    type Product,
} from "../services/productService";
import { saveStockIn, type StockInItem } from "../services/stockInService";
import { checkDuplicateInvoice } from "../services/invoiceDuplicateService";
import type {
    ParsedInvoice,
    ParsedInvoiceItem,
    ProductMatchResult,
} from "../types/invoice";

type Step = "upload" | "processing" | "review" | "saving" | "done" | "error";

interface ScanResult {
    invoice: ParsedInvoice;
    matches: ProductMatchResult[];
}

export default function ScanInvoice() {
    const [step, setStep] = useState<Step>("upload");
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [elapsed, setElapsed] = useState(0);

    // Elapsed timer for processing step
    useEffect(() => {
        if (step !== "processing") {
            setElapsed(0);
            return;
        }
        const start = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [step]);

    // -----------------------------------------------------------
    // SCAN FLOW
    // -----------------------------------------------------------
    const handleFile = async (file: File) => {
        try {
            setError("");
            setPreview(URL.createObjectURL(file));
            setStep("processing");

            // 1. AI extraction
            setStatus("Reading invoice with AI...");
            const invoice = await extractInvoiceWithDeepSeek(file);

            if (!invoice.items.length) {
                throw new Error("No products found in invoice. Try a clearer photo.");
            }

            // 2. Duplicate guard
            setStatus("Checking for duplicates...");
            const dup = await checkDuplicateInvoice(invoice.invoiceNumber);
            if (dup.isDuplicate) {
                const date = dup.scannedAt
                    ? dup.scannedAt.toLocaleDateString()
                    : "an earlier date";
                throw new Error(
                    `Invoice ${invoice.invoiceNumber} was already scanned on ${date}.`
                );
            }

            // 3. Match products
            setStatus("Matching products...");
            const products: Product[] = await getProducts();
            const matches = matchInvoiceItems(invoice.items, products);

            // 4. Auto-create unmatched products
            setStatus("Creating new products...");
            const enrichedMatches: ProductMatchResult[] = [];

            for (const match of matches) {
                if (match.matchedProduct) {
                    enrichedMatches.push(match);
                    continue;
                }

                const existing = await findProductByName(match.invoiceItem.product);

                if (existing) {
                    enrichedMatches.push({
                        ...match,
                        matchedProduct: existing,
                        confidence: "high",
                        isNewProduct: false,
                    });
                    continue;
                }

                try {
                    const newId = await addProduct({
                        name: match.invoiceItem.product,
                        category: "General",
                        manufacturer: "",
                        unit: match.invoiceItem.unit || "piece",
                        sellingPrice: match.invoiceItem.rate || 0,
                        minimumStock: 5,
                    });

                    const allProducts = await getProducts();
                    const created = allProducts.find((p) => p.id === newId);

                    if (created) {
                        enrichedMatches.push({
                            ...match,
                            matchedProduct: created,
                            confidence: "high",
                            isNewProduct: true,
                        });
                    } else {
                        enrichedMatches.push(match);
                    }
                } catch (err) {
                    console.error("Failed to auto-create product:", err);
                    enrichedMatches.push(match);
                }
            }

            setResult({ invoice, matches: enrichedMatches });
            setStep("review");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Scan failed");
            setStep("error");
        }
    };

    // -----------------------------------------------------------
    // SAVE STOCK
    // -----------------------------------------------------------
    const handleConfirm = async () => {
        if (!result) return;
        try {
            setStep("saving");
            setStatus("Saving stock...");

            const matchedItems: StockInItem[] = result.matches
                .filter((m) => m.matchedProduct)
                .map((m) => ({
                    productId: m.matchedProduct!.id,
                    product: m.matchedProduct!.name,
                    batch:
                        m.invoiceItem.batch?.trim() ||
                        `NB-${Date.now().toString().slice(-6)}`,
                    manufacturingDate: m.invoiceItem.manufacturingDate ?? "",
                    expiryDate: m.invoiceItem.expiryDate ?? "",
                    pack: m.invoiceItem.packSize ?? "",
                    quantity: m.invoiceItem.quantity,
                    rate: m.invoiceItem.rate ?? 0,
                }));

            if (matchedItems.length === 0) {
                throw new Error("No matched products to save.");
            }

            await saveStockIn(
                {
                    supplier: result.invoice.supplier,
                    invoiceNumber: result.invoice.invoiceNumber,
                    invoiceDate: result.invoice.invoiceDate,
                    billMode: "Credit",
                },
                matchedItems
            );

            setStep("done");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
            setStep("error");
        }
    };

    const reset = () => {
        setStep("upload");
        setResult(null);
        setError("");
        setPreview(null);
        setStatus("");
    };

    // -----------------------------------------------------------
    // EDIT HELPERS
    // -----------------------------------------------------------
    const updateItemField = (
        index: number,
        field: keyof ParsedInvoiceItem,
        value: string | number
    ) => {
        if (!result) return;
        const updated = [...result.matches];
        updated[index] = {
            ...updated[index],
            invoiceItem: { ...updated[index].invoiceItem, [field]: value },
        };
        setResult({ ...result, matches: updated });
    };

    const removeItem = (index: number) => {
        if (!result) return;
        setResult({
            ...result,
            matches: result.matches.filter((_, i) => i !== index),
        });
    };

    // -----------------------------------------------------------
    // RENDER — UPLOAD
    // -----------------------------------------------------------
    if (step === "upload") {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <h1 className="text-2xl font-semibold mb-4">Scan Supplier Invoice</h1>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm mb-4">
                    <p className="font-medium text-blue-900 mb-1">
                        📸 Tips for best results
                    </p>
                    <ul className="list-disc list-inside text-blue-800 space-y-0.5">
                        <li>Flat surface, good lighting</li>
                        <li>Hold phone directly above invoice</li>
                        <li>Entire invoice must be in frame</li>
                        <li>Avoid shadows and glare</li>
                    </ul>
                </div>

                <div className="border-2 border-dashed border-green-300 rounded-xl p-10 text-center bg-white">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-neutral-600 mb-6">
                        Choose a photo of the supplier invoice
                    </p>
                    <label className="inline-block bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-lg cursor-pointer font-medium">
                        Choose Invoice Photo
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleFile(f);
                            }}
                        />
                    </label>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------
    // RENDER — PROCESSING / SAVING
    // -----------------------------------------------------------
    if (step === "processing" || step === "saving") {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                {preview && step === "processing" && (
                    <img
                        src={preview}
                        alt="Invoice"
                        className="max-h-64 mx-auto rounded-lg shadow mb-6"
                    />
                )}
                <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-neutral-700">{status}</p>

                {step === "processing" && elapsed > 10 && (
                    <p className="text-xs text-neutral-500 mt-2">
                        Still working... ({elapsed}s elapsed)
                    </p>
                )}

                {step === "processing" && elapsed > 45 && (
                    <p className="text-xs text-amber-600 mt-2">
                        This is taking longer than usual. The AI may be busy — please
                        wait.
                    </p>
                )}
            </div>
        );
    }

    // -----------------------------------------------------------
    // RENDER — DONE
    // -----------------------------------------------------------
    if (step === "done") {
        const savedCount =
            result?.matches.filter((m) => m.matchedProduct).length ?? 0;
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-xl font-semibold mb-2">
                    Stock updated successfully!
                </h2>
                <p className="text-neutral-600 mb-6">{savedCount} items saved.</p>
                <button
                    onClick={reset}
                    className="bg-green-700 text-white px-6 py-3 rounded-lg"
                >
                    Scan Another Invoice
                </button>
            </div>
        );
    }

    // -----------------------------------------------------------
    // RENDER — ERROR
    // -----------------------------------------------------------
    if (step === "error") {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-700 font-medium mb-3">{error}</p>
                    <button
                        onClick={reset}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------
    // RENDER — REVIEW
    // -----------------------------------------------------------
    if (!result) return null;

    const matchedCount = result.matches.filter((m) => m.matchedProduct).length;
    const newCount = result.matches.filter((m) => m.isNewProduct).length;
    const unmatchedCount = result.matches.filter(
        (m) => !m.matchedProduct
    ).length;

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-4">
            {/* Header */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-900">{result.invoice.supplier}</p>
                <p className="text-sm text-green-800">
                    Invoice {result.invoice.invoiceNumber || "—"} •{" "}
                    {result.invoice.invoiceDate || "—"}
                </p>
                <p className="text-sm text-green-700 mt-1">
                    {matchedCount} matched • {newCount} new • {unmatchedCount} unmatched
                </p>
            </div>

            {/* Items */}
            {result.matches.map((m, i) => (
                <EditableItemCard
                    key={i}
                    match={m}
                    index={i}
                    onUpdateField={updateItemField}
                    onRemove={removeItem}
                />
            ))}

            {/* Actions */}
            <div className="flex gap-3 sticky bottom-4 bg-white p-3 rounded-xl shadow border border-neutral-200">
                <button
                    onClick={reset}
                    className="flex-1 py-3 rounded-lg border-2 border-neutral-300 font-medium"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={matchedCount === 0}
                    className="flex-1 py-3 rounded-lg bg-green-700 text-white font-medium disabled:opacity-50"
                >
                    Confirm & Save Stock
                </button>
            </div>
        </div>
    );
}

// -----------------------------------------------------------
// EDITABLE ITEM CARD
// -----------------------------------------------------------
interface EditableItemCardProps {
    match: ProductMatchResult;
    index: number;
    onUpdateField: (
        i: number,
        field: keyof ParsedInvoiceItem,
        value: string | number
    ) => void;
    onRemove: (i: number) => void;
}

function EditableItemCard({
    match,
    index,
    onUpdateField,
    onRemove,
}: EditableItemCardProps) {
    const [editing, setEditing] = useState(false);
    const isMatched = !!match.matchedProduct;
    const isNew = match.isNewProduct;

    return (
        <div
            className={`rounded-lg p-4 border-2 ${isNew
                ? "bg-blue-50 border-blue-200"
                : isMatched
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <p className="font-medium text-lg">{match.invoiceItem.product}</p>
                    {isNew && (
                        <p className="text-xs text-blue-700 mt-0.5">
                            ✨ New product — created automatically
                        </p>
                    )}
                    {isMatched && !isNew && (
                        <p className="text-xs text-green-700 mt-0.5">
                            ✓ Matched: {match.matchedProduct?.name} ({match.confidence})
                        </p>
                    )}
                    {!isMatched && (
                        <p className="text-xs text-amber-700 mt-0.5">
                            ⚠ No match — will be skipped
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setEditing(!editing)}
                        className="text-xs px-2 py-1 rounded border border-neutral-300"
                    >
                        {editing ? "Done" : "✏️ Edit"}
                    </button>
                    <button
                        onClick={() => onRemove(index)}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-600"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {editing ? (
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="col-span-2">
                        <label className="text-xs text-neutral-500">Product name</label>
                        <input
                            type="text"
                            value={match.invoiceItem.product}
                            onChange={(e) =>
                                onUpdateField(index, "product", e.target.value)
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-neutral-500">Quantity</label>
                        <input
                            type="number"
                            value={match.invoiceItem.quantity}
                            onChange={(e) =>
                                onUpdateField(index, "quantity", Number(e.target.value))
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-neutral-500">Unit</label>
                        <input
                            type="text"
                            value={match.invoiceItem.unit}
                            onChange={(e) => onUpdateField(index, "unit", e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-neutral-500">Rate (₹)</label>
                        <input
                            type="number"
                            value={match.invoiceItem.rate}
                            onChange={(e) =>
                                onUpdateField(index, "rate", Number(e.target.value))
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-neutral-500">Batch</label>
                        <input
                            type="text"
                            value={match.invoiceItem.batch ?? ""}
                            onChange={(e) => onUpdateField(index, "batch", e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="text-xs text-neutral-500">Expiry date</label>
                        <input
                            type="date"
                            value={match.invoiceItem.expiryDate ?? ""}
                            onChange={(e) =>
                                onUpdateField(index, "expiryDate", e.target.value)
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                        />
                    </div>
                </div>
            ) : (
                <div className="mt-2 text-sm text-neutral-700 space-y-0.5">
                    <p>
                        <strong>Qty:</strong> {match.invoiceItem.quantity}{" "}
                        {match.invoiceItem.unit}
                    </p>
                    <p>
                        <strong>Rate:</strong> ₹{match.invoiceItem.rate ?? 0}
                    </p>
                    {match.invoiceItem.batch && (
                        <p>
                            <strong>Batch:</strong> {match.invoiceItem.batch}
                        </p>
                    )}
                    {match.invoiceItem.expiryDate && (
                        <p>
                            <strong>Expiry:</strong> {match.invoiceItem.expiryDate}
                        </p>
                    )}
                    {!match.invoiceItem.batch && (
                        <p className="text-xs text-amber-600">
                            ⚠ No batch — will use auto-generated batch number
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}