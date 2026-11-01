
import {
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ============================================================
// TYPES
// ============================================================

export interface DashboardProduct {
    id: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    purchaseRate: number;
    category: string;
    active?: boolean;
}

export interface DashboardBill {
    id: string;
    billNumber: string;
    billDate: string;
    grandTotal: number;
    paidAmount: number;
    paymentStatus: string;
    customerName: string;
    customerPhone?: string;
    items?: any[];
}

export interface DashboardStockIn {
    id: string;
    supplier: string;
    invoiceNumber: string;
    invoiceDate: string;
    items: {
        product: string;
        quantity: number;
    }[];
}

export interface SalesChartData {
    date: string;
    amount: number;
}

export interface RecentSale {
    id: string;
    billNumber: string;
    customerName: string;
    billDate: string;
    grandTotal: number;
    paymentStatus: string;
}

export interface CategorySale {
    name: string;
    amount: number;
    percentage: number;
}

export interface TopSellingProduct {
    id: string;
    name: string;
    quantity: number;
    amount: number;
}

export interface ExpiryAlert {
    id: string;
    productName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    daysLeft: number;
}

export interface DashboardData {
    totalProducts: number;
    totalStock: number;
    todaySales: number;
    todayBills: number;
    outstanding: number;
    stockValue: number;
    totalCustomers: number;

    lowStockProducts: DashboardProduct[];
    outOfStockProducts: DashboardProduct[];

    recentStockIn: DashboardStockIn[];
    recentSales: RecentSale[];

    salesChart: SalesChartData[];
    categorySales: CategorySale[];
    topSellingProducts: TopSellingProduct[];

    expiryAlerts: ExpiryAlert[];
}

// ============================================================
// HELPERS
// ============================================================

function toNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function getDateString(value: any): string {
    if (!value) return "";

    let date: Date;

    if (typeof value === "string") {
        // Supports YYYY-MM-DD and ISO date strings.
        const match = value.match(/^\d{4}-\d{2}-\d{2}/);
        return match ? match[0] : "";
    }

    if (value instanceof Date) {
        date = value;
    } else if (typeof value?.toDate === "function") {
        date = value.toDate();
    } else {
        return "";
    }

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayString(): string {
    return getDateString(new Date());
}

function getDaysDifference(dateString: string): number {
    const target = new Date(`${dateString}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return Math.ceil(
        (target.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}

// ============================================================
// DASHBOARD DATA
// ============================================================

export async function getDashboardData(): Promise<DashboardData> {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Please log in to view your dashboard.");
    }

    const shopId = user.uid;

    // Fetch all dashboard collections.
    const [
        productsSnapshot,
        billsSnapshot,
        stockInsSnapshot,
        batchesSnapshot,
    ] = await Promise.all([
        getDocs(
            query(
                collection(db, "products"),
                where("shopId", "==", shopId)
            )
        ),

        getDocs(
            query(
                collection(db, "bills"),
                where("shopId", "==", shopId)
            )
        ),

        getDocs(
            query(
                collection(db, "stockIns"),
                where("shopId", "==", shopId)
            )
        ),

        getDocs(
            query(
                collection(db, "productBatches"),
                where("shopId", "==", shopId)
            )
        ),
    ]);

    // ========================================================
    // PRODUCTS
    // ========================================================

    const products: DashboardProduct[] =
        productsSnapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                id: doc.id,
                name: String(data.name ?? "Unknown Product"),
                currentStock: toNumber(data.currentStock),
                minimumStock: toNumber(data.minimumStock),
                purchaseRate: toNumber(data.purchaseRate),
                category: String(data.category ?? "Other"),
                active: data.active !== false,
            };
        });

    const activeProducts = products.filter(
        (product) => product.active !== false
    );

    const totalProducts = activeProducts.length;

    const totalStock = activeProducts.reduce(
        (sum, product) => sum + product.currentStock,
        0
    );

    // Stock valuation using purchaseRate.
    const stockValue = activeProducts.reduce(
        (sum, product) =>
            sum + product.currentStock * product.purchaseRate,
        0
    );

    const lowStockProducts = activeProducts
        .filter(
            (product) =>
                product.currentStock <= product.minimumStock
        )
        .sort(
            (a, b) => a.currentStock - b.currentStock
        );

    const outOfStockProducts = activeProducts.filter(
        (product) => product.currentStock <= 0
    );

    const productMap = new Map(
        activeProducts.map((product) => [product.id, product])
    );

    // ========================================================
    // BILLS
    // ========================================================

    const bills: DashboardBill[] = billsSnapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            id: doc.id,
            billNumber: String(data.billNumber ?? doc.id),

            billDate: getDateString(
                data.billDate ?? data.date ?? data.createdAt
            ),

            grandTotal: toNumber(data.grandTotal),
            paidAmount: toNumber(data.paidAmount),

            paymentStatus: String(
                data.paymentStatus ??
                data.status ??
                "Unknown"
            ),

            customerName: String(
                data.customerName ??
                data.customer?.name ??
                "Walk-in Customer"
            ),

            customerPhone: String(
                data.customerPhone ??
                data.customer?.phone ??
                ""
            ),

            items: Array.isArray(data.items) ? data.items : [],
        };
    });

    const today = getTodayString();

    const todayBills = bills.filter(
        (bill) => bill.billDate === today
    );

    const todaySales = todayBills.reduce(
        (sum, bill) => sum + bill.grandTotal,
        0
    );

    const todayBillsCount = todayBills.length;

    const outstanding = bills.reduce(
        (sum, bill) =>
            sum + Math.max(
                0,
                bill.grandTotal - bill.paidAmount
            ),
        0
    );

    // ========================================================
    // CUSTOMERS FROM BILLS
    // No customers collection needed.
    // ========================================================

    const uniqueCustomers = new Set<string>();

    bills.forEach((bill) => {
        const customerKey = bill.customerPhone.trim()
            ? bill.customerPhone.trim()
            : bill.customerName.trim().toLowerCase();

        if (
            customerKey &&
            customerKey.toLowerCase() !== "walk-in customer"
        ) {
            uniqueCustomers.add(customerKey);
        }
    });

    const totalCustomers = uniqueCustomers.size;

    // ========================================================
    // RECENT SALES
    // ========================================================

    const recentSales: RecentSale[] = [...bills]
        .sort((a, b) =>
            b.billDate.localeCompare(a.billDate)
        )
        .slice(0, 10)
        .map((bill) => ({
            id: bill.id,
            billNumber: bill.billNumber,
            customerName: bill.customerName,
            billDate: bill.billDate,
            grandTotal: bill.grandTotal,
            paymentStatus: bill.paymentStatus,
        }));

    // ========================================================
    // SALES CHART - LAST 30 DAYS
    // ========================================================

    const salesMap = new Map<string, number>();

    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const dateString = getDateString(date);
        salesMap.set(dateString, 0);
    }

    bills.forEach((bill) => {
        if (salesMap.has(bill.billDate)) {
            salesMap.set(
                bill.billDate,
                (salesMap.get(bill.billDate) ?? 0) +
                bill.grandTotal
            );
        }
    });

    const salesChart: SalesChartData[] =
        Array.from(salesMap.entries()).map(
            ([date, amount]) => ({
                date,
                amount,
            })
        );

    // ========================================================
    // SALES BY CATEGORY
    // ========================================================

    const categoryMap = new Map<string, number>();

    bills.forEach((bill) => {
        bill.items?.forEach((item: any) => {
            const productId = String(
                item.productId ?? item.id ?? ""
            );

            const product = productMap.get(productId);

            const category = String(
                item.category ??
                product?.category ??
                "Other"
            );

            const quantity = toNumber(
                item.quantity ?? item.qty
            );

            const price = toNumber(
                item.price ??
                item.sellingPrice ??
                item.rate
            );

            const amount = toNumber(
                item.total ??
                item.totalAmount ??
                item.subtotal
            ) || quantity * price;

            categoryMap.set(
                category,
                (categoryMap.get(category) ?? 0) + amount
            );
        });
    });

    const totalCategorySales = Array.from(
        categoryMap.values()
    ).reduce((sum, amount) => sum + amount, 0);

    const categorySales: CategorySale[] =
        Array.from(categoryMap.entries())
            .map(([name, amount]) => ({
                name,
                amount,
                percentage:
                    totalCategorySales > 0
                        ? (amount / totalCategorySales) * 100
                        : 0,
            }))
            .sort((a, b) => b.amount - a.amount);

    // ========================================================
    // TOP SELLING PRODUCTS
    // ========================================================

    const productSalesMap = new Map<
        string,
        TopSellingProduct
    >();

    bills.forEach((bill) => {
        bill.items?.forEach((item: any) => {
            const productId = String(
                item.productId ?? item.id ?? item.product ?? "unknown"
            );

            const product = productMap.get(productId);

            const name = String(
                item.productName ??
                item.name ??
                product?.name ??
                item.product ??
                "Unknown Product"
            );

            const quantity = toNumber(
                item.quantity ?? item.qty
            );

            const price = toNumber(
                item.price ??
                item.sellingPrice ??
                item.rate
            );

            const amount =
                toNumber(
                    item.total ??
                    item.totalAmount ??
                    item.subtotal
                ) || quantity * price;

            const existing = productSalesMap.get(productId);

            if (existing) {
                existing.quantity += quantity;
                existing.amount += amount;
            } else {
                productSalesMap.set(productId, {
                    id: productId,
                    name,
                    quantity,
                    amount,
                });
            }
        });
    });

    const topSellingProducts = Array.from(
        productSalesMap.values()
    )
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    // ========================================================
    // PRODUCT BATCH EXPIRY ALERTS
    // Source: productBatches.expiryDate
    // ========================================================

    const expiryAlerts: ExpiryAlert[] =
        batchesSnapshot.docs
            .map((doc) => {
                const data = doc.data();

                const expiryDate = getDateString(
                    data.expiryDate
                );

                if (!expiryDate) return null;

                const daysLeft = getDaysDifference(expiryDate);

                const productId = String(
                    data.productId ?? data.product ?? ""
                );

                const product = productMap.get(productId);

                const quantity = toNumber(
                    data.quantity ?? data.currentStock
                );

                // Ignore empty batches and batches expiring
                // more than 30 days from today.
                if (quantity <= 0 || daysLeft > 30) {
                    return null;
                }

                return {
                    id: doc.id,

                    productName: String(
                        data.productName ??
                        data.name ??
                        product?.name ??
                        "Unknown Product"
                    ),

                    batchNumber: String(
                        data.batchNumber ??
                        data.batchNo ??
                        "-"
                    ),

                    expiryDate,
                    quantity,
                    daysLeft,
                };
            })
            .filter(
                (batch): batch is ExpiryAlert =>
                    batch !== null
            )
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 20);

    // ========================================================
    // RECENT STOCK IN
    // ========================================================

    const recentStockIn: DashboardStockIn[] =
        stockInsSnapshot.docs
            .map((doc) => {
                const data = doc.data();

                return {
                    id: doc.id,

                    supplier: String(
                        data.supplier ?? "Unknown Supplier"
                    ),

                    invoiceNumber: String(
                        data.invoiceNumber ?? "-"
                    ),

                    invoiceDate: getDateString(
                        data.invoiceDate ??
                        data.deliveryDate ??
                        data.createdAt
                    ),

                    items: Array.isArray(data.items)
                        ? data.items.map((item: any) => ({
                            product: String(
                                item.product ??
                                item.productName ??
                                "Unknown Product"
                            ),
                            quantity: toNumber(item.quantity),
                        }))
                        : [],
                };
            })
            .sort((a, b) =>
                b.invoiceDate.localeCompare(a.invoiceDate)
            )
            .slice(0, 5);

    // ========================================================
    // FINAL RESULT
    // ========================================================

    return {
        totalProducts,
        totalStock,
        todaySales,
        todayBills: todayBillsCount,
        outstanding,
        stockValue,
        totalCustomers,

        lowStockProducts,
        outOfStockProducts,

        recentStockIn,
        recentSales,

        salesChart,
        categorySales,
        topSellingProducts,

        expiryAlerts,
    };
}
