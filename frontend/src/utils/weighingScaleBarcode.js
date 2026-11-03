/**
 * Supermarket Weighing Scale Barcode Parser
 * Supports standard retail weighing scales (DIGI, Mettler Toledo, CAS, Ishida)
 * Common prefixes in Sri Lanka and globally: '20', '21', '22', '23', '24', '02'
 * 
 * EAN-13 Formats:
 * Weight-embedded: [Prefix 2 digits: 20] [Item Code 4-5 digits] [Weight in grams 4-5 digits] [Checksum 1 digit]
 * Price-embedded:  [Prefix 2 digits: 21] [Item Code 4-5 digits] [Price in cents/LKR 4-5 digits] [Checksum 1 digit]
 */

export function parseWeighingScaleBarcode(rawBarcode) {
    if (!rawBarcode || typeof rawBarcode !== 'string') return null;
    const barcode = rawBarcode.trim();

    // Must be 12 or 13 digits and start with 20-24 or 02
    if (!/^(02|20|21|22|23|24)\d{10,11}$/.test(barcode)) {
        return null;
    }

    const prefix = barcode.slice(0, 2);

    // Format A: 13 digits standard EAN-13
    // Prefix (2) + ItemCode (5) + Value (5) + Checksum (1)
    if (barcode.length === 13) {
        const itemCode5 = barcode.slice(2, 7);
        const itemCode4 = barcode.slice(2, 6); // alternate 4 digit code
        const val5 = parseInt(barcode.slice(7, 12), 10);

        if (prefix === '20' || prefix === '02') {
            // Weight-embedded (grams)
            // e.g. 00520 = 520 grams = 0.52 kg
            const weightKg = parseFloat((val5 / 1000).toFixed(3));
            return {
                type: 'weight',
                prefix,
                itemCodes: [itemCode5, itemCode4, String(parseInt(itemCode5, 10)), String(parseInt(itemCode4, 10))],
                weightKg,
                rawBarcode: barcode,
            };
        } else if (prefix === '21' || prefix === '22') {
            // Price-embedded
            // e.g. 00260 = Rs. 260.00
            const price = parseFloat((val5 / 100).toFixed(2));
            return {
                type: 'price',
                prefix,
                itemCodes: [itemCode5, itemCode4, String(parseInt(itemCode5, 10)), String(parseInt(itemCode4, 10))],
                price,
                rawBarcode: barcode,
            };
        }
    }

    // Format B: 12 digits UPC-A style
    // Prefix (2) + ItemCode (4) + Value (5) + Checksum (1)
    if (barcode.length === 12) {
        const itemCode4 = barcode.slice(2, 6);
        const val5 = parseInt(barcode.slice(6, 11), 10);
        const weightKg = parseFloat((val5 / 1000).toFixed(3));

        return {
            type: 'weight',
            prefix,
            itemCodes: [itemCode4, String(parseInt(itemCode4, 10))],
            weightKg,
            rawBarcode: barcode,
        };
    }

    return null;
}

/**
 * Searches product list for a match with weighing scale item codes
 */
export function findScaleProduct(products, scaleData) {
    if (!products || !scaleData || !scaleData.itemCodes) return null;

    for (const code of scaleData.itemCodes) {
        const found = products.find(p => {
            const b = p.barcode?.trim();
            const sku = p.sku?.trim();
            const pCode = p.productCode?.trim();

            return (
                b === code ||
                b === `20${code}` ||
                b === `02${code}` ||
                sku === code ||
                sku?.endsWith(code) ||
                pCode === code ||
                pCode?.endsWith(code)
            );
        });
        if (found) return found;
    }

    return null;
}

