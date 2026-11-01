import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    FileText,
    Phone,
    Printer,
    User,
    MessageCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
    getBillById,
    type Bill,
} from "../services/billingService";
const thermalPrintStyles = `
@media print {

    @page {
        size: 80mm auto;
        margin: 0;
    }

    html,
    body {
        width: 80mm;
        margin: 0;
        padding: 0;
        background: white !important;
    }

    body {
        font-family: Arial, Helvetica, sans-serif;
        color: #000 !important;
    }

    .thermal-bill {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 4mm !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
    }

    .thermal-header {
        background: white !important;
        color: black !important;
        padding: 0 0 3mm 0 !important;
        border-bottom: 1px dashed #000 !important;
    }

    .thermal-header p,
    .thermal-header h1 {
        color: black !important;
    }

    .thermal-content {
        padding: 3mm 0 0 0 !important;
    }

    .thermal-customer {
        display: block !important;
        padding-bottom: 3mm !important;
        border-bottom: 1px dashed #000 !important;
    }

    .thermal-customer > div {
        margin-bottom: 1.5mm;
    }

    .thermal-customer svg {
        display: none !important;
    }

    .thermal-items {
        margin-top: 3mm !important;
    }

    .thermal-items h2 {
        display: none !important;
    }

    .thermal-table {
        width: 100% !important;
        min-width: 0 !important;
        border: none !important;
        font-size: 10px !important;
    }

    .thermal-table thead {
        background: white !important;
    }

    .thermal-table th,
    .thermal-table td {
        padding: 1.5mm 0.5mm !important;
        border: none !important;
        color: #000 !important;
    }

    .thermal-table th {
        font-size: 9px !important;
        border-bottom: 1px dashed #000 !important;
    }

    .thermal-table tbody tr {
        border-bottom: 1px dotted #999 !important;
    }

    .thermal-product {
        max-width: 32mm;
        white-space: normal;
        word-break: break-word;
    }

    .thermal-totals {
        margin-top: 3mm !important;
        width: 100% !important;
        max-width: none !important;
        border-top: 1px dashed #000;
        padding-top: 2mm;
    }

    .thermal-grand-total {
        font-size: 14px !important;
        font-weight: 700 !important;
        border-top: 1px solid #000 !important;
        border-bottom: 1px solid #000 !important;
        padding: 2mm 0 !important;
    }

    .thermal-payment {
        border-top: 1px dashed #000 !important;
        padding-top: 2mm !important;
    }

    .thermal-payment span {
        color: #000 !important;
    }

    .thermal-status {
        border: none !important;
        padding-top: 1mm !important;
    }

    .thermal-status span:last-child {
        background: white !important;
        color: black !important;
        padding: 0 !important;
    }

    .thermal-footer {
        margin-top: 4mm !important;
        padding-top: 3mm !important;
        border-top: 1px dashed #000 !important;
    }

    .thermal-footer p {
        color: #000 !important;
    }

    .thermal-no-print {
        display: none !important;
    }
}
`;
function BillDetails() {
    const { billId } = useParams();
    const navigate = useNavigate();

    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBill = async () => {
            if (!billId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const data = await getBillById(billId);

                setBill(data);
            } catch (error) {
                console.error("Error loading bill:", error);
                alert("Failed to load bill.");
            } finally {
                setLoading(false);
            }
        };

        loadBill();
    }, [billId]);

    if (loading) {
        return (

            <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                    <p className="text-sm text-gray-500">
                        Loading bill...
                    </p>
                </div>
            </div>
        );
        <style>{thermalPrintStyles}</style>
    }

    if (!bill) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-sm">
                    <FileText
                        size={48}
                        className="mx-auto text-gray-300"
                    />

                    <h2 className="mt-4 text-xl font-bold text-gray-900">
                        Bill not found
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        The requested bill could not be found.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/sales")}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                    >
                        <ArrowLeft size={17} />
                        Back to Sales
                    </button>
                </div>
            </div>
        );
    }

    const outstanding =
        bill.grandTotal - bill.paidAmount;

    const paymentBadge =
        bill.paymentStatus === "Paid"
            ? "bg-green-100 text-green-700"
            : bill.paymentStatus === "Partial"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700";
    const handleWhatsApp = () => {
        const itemsText = bill.items
            .map(
                (item, index) =>
                    `${index + 1}. ${item.productName} - ${item.quantity} ${item.unit} × ₹${item.sellingPrice.toFixed(
                        2
                    )} = ₹${item.amount.toFixed(2)}`
            )
            .join("\n");

        const outstanding = bill.grandTotal - bill.paidAmount;

        const message = `New Balaji Ruthu Depo

Bill No: ${bill.billNumber}
Date: ${bill.billDate}

Customer: ${bill.customerName}
Phone: ${bill.customerPhone}

Items:
${itemsText}

Subtotal: ₹${bill.subtotal.toFixed(2)}
Grand Total: ₹${bill.grandTotal.toFixed(2)}
Paid: ₹${bill.paidAmount.toFixed(2)}
Outstanding: ₹${outstanding.toFixed(2)}
Payment Status: ${bill.paymentStatus}

Thank you for your business.`;

        const encodedMessage = encodeURIComponent(message);

        window.open(
            `https://wa.me/?text=${encodedMessage}`,
            "_blank"
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Top actions */}
            <div className="mx-auto mb-5 flex max-w-5xl items-center justify-between gap-3 print:hidden">
                <button
                    type="button"
                    onClick={() => navigate("/sales")}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                    <ArrowLeft size={17} />
                    Back
                </button>

                <div className="flex items-center gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={handleWhatsApp}
                        className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-100"
                    >
                        <MessageCircle size={17} />
                        WhatsApp
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                    >
                        <Printer size={17} />
                        Print Bill
                    </button>
                </div>
            </div>

            {/* Bill */}
            <div className="thermal-bill mx-auto max-w-5xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
                {/* Shop header */}
                <div className="thermal-header bg-green-700 px-5 py-6 text-white md:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                New Balaji Ruthu Depo
                            </h1>

                            <p className="mt-1 text-sm text-green-100">
                                Agricultural Products & Inputs
                            </p>
                        </div>

                        <div className="sm:text-right">
                            <p className="text-sm font-medium text-green-100">
                                BILL
                            </p>

                            <p className="mt-1 text-xl font-bold">
                                {bill.billNumber}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="thermal-content p-5 md:p-8">
                    {/* Customer information */}
                    <div className="thermal-customer grid gap-5 border-b border-gray-100 pb-6 md:grid-cols-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Customer
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                                <User
                                    size={17}
                                    className="text-green-600"
                                />

                                <p className="font-semibold text-gray-900">
                                    {bill.customerName}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Phone
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                                <Phone
                                    size={17}
                                    className="text-green-600"
                                />

                                <p className="font-medium text-gray-800">
                                    {bill.customerPhone}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Bill Date
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                                <CalendarDays
                                    size={17}
                                    className="text-green-600"
                                />

                                <p className="font-medium text-gray-800">
                                    {bill.billDate}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="thermal-items mt-6">
                        <h2 className="mb-3 text-lg font-bold text-gray-900">
                            Items
                        </h2>

                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="thermal-table w-full min-w-[650px]">

                                <thead className="bg-gray-50">
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-4 py-3">
                                            #
                                        </th>

                                        <th className="px-4 py-3">
                                            Product
                                        </th>

                                        <th className="px-4 py-3 text-right">
                                            Qty
                                        </th>

                                        <th className="px-4 py-3">
                                            Unit
                                        </th>

                                        <th className="px-4 py-3 text-right">
                                            Price
                                        </th>

                                        <th className="px-4 py-3 text-right">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {bill.items.map((item, index) => (
                                        <tr key={`${item.productId}-${index}`}>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {index + 1}
                                            </td>

                                            <td className="thermal-product px-4 py-4">
                                                <p className="font-medium text-gray-900">
                                                    {item.productName}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-right text-sm text-gray-700">
                                                {item.quantity}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-600">
                                                {item.unit}
                                            </td>

                                            <td className="px-4 py-4 text-right text-sm text-gray-700">
                                                ₹{item.sellingPrice.toFixed(2)}
                                            </td>

                                            <td className="px-4 py-4 text-right font-semibold text-gray-900">
                                                ₹{item.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="mt-6 flex justify-end">
                        <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>

                                <span>
                                    ₹{bill.subtotal.toFixed(2)}
                                </span>
                            </div>

                            <div className="border-t border-gray-200 pt-3">
                                <div className="thermal-grand-total flex justify-between text-lg font-bold text-gray-900">
                                    <span>Grand Total</span>

                                    <span>
                                        ₹{bill.grandTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="thermal-payment flex justify-between text-sm text-gray-600">
                                <span>Paid Amount</span>

                                <span>
                                    ₹{bill.paidAmount.toFixed(2)}
                                </span>
                            </div>

                            <div className="thermal-outstanding flex justify-between text-sm font-medium">
                                <span>Outstanding</span>

                                <span className="text-red-600">
                                    ₹{outstanding.toFixed(2)}
                                </span>
                            </div>

                            <div className="thermal-status flex items-center justify-between border-t border-gray-200 pt-3">
                                <span className="text-sm font-medium text-gray-700">
                                    Payment Status
                                </span>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentBadge}`}
                                >
                                    {bill.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="thermal-footer mt-8 border-t border-gray-100 pt-5 text-center">
                        <p className="text-sm font-medium text-gray-700">
                            Thank you for your business
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                            This bill is permanently retained in the
                            system.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BillDetails;