
export interface ScannedProduct {
    barcode: string;
    name: string;
    manufacturer: string;
    category: string;
    imageUrl: string;
    description: string;
}

interface OpenFoodFactsResponse {
    status?: string;
    product?: {
        code?: string;
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        categories?: string;
        categories_tags?: string[];
        image_front_url?: string;
        image_url?: string;
        image_front_small_url?: string;
        generic_name?: string;
    };
}

export const lookupProductByBarcode = async (
    barcode: string
): Promise<ScannedProduct | null> => {
    const code = barcode.trim();

    if (!/^\d{8,14}$/.test(code)) {
        throw new Error("Invalid barcode. Please scan again.");
    }

    const fields = [
        "code",
        "product_name",
        "product_name_en",
        "brands",
        "categories",
        "categories_tags",
        "image_front_url",
        "image_url",
        "image_front_small_url",
        "generic_name",
    ].join(",");

    const url =
        `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}.json` +
        `?product_type=all&fields=${fields}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Product database is temporarily unavailable.");
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (!data.product) {
        return null;
    }

    const product = data.product;

    const name =
        product.product_name?.trim() ||
        product.product_name_en?.trim();

    if (!name) {
        return null;
    }

    const imageUrl =
        product.image_front_url ||
        product.image_url ||
        product.image_front_small_url ||
        "";
    const mapProductCategory = (categories = ""): string => {
        const value = categories.toLowerCase();

        if (value.includes("beverage") || value.includes("drink")) {
            return "Beverages";
        }

        if (value.includes("snack") || value.includes("chocolate")) {
            return "Snacks & Chocolates";
        }

        if (value.includes("dairy") || value.includes("milk")) {
            return "Dairy & Frozen Foods";
        }

        if (value.includes("bakery") || value.includes("bread")) {
            return "Bakery";
        }

        if (value.includes("fruit") || value.includes("vegetable")) {
            return "Fruits & Vegetables";
        }

        if (value.includes("personal care")) {
            return "Personal Care";
        }

        if (value.includes("cleaning") || value.includes("household")) {
            return "Household & Cleaning";
        }

        return "Other";
    };

    return {
        barcode: code,
        name,
        manufacturer: product.brands?.split(",")[0]?.trim() || "",
        category: mapProductCategory(product.categories || ""),
        imageUrl,
        description: product.generic_name || "",
    };
};
