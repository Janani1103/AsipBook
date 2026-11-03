/**
 * Sri Lankan Bank Credit / Debit Card Promotion rules for Supermarkets & Retail
 */

export const SRI_LANKA_BANK_PROMOS = [
    {
        id: 'combank',
        bankName: 'Commercial Bank',
        cardType: 'Credit & Debit Cards',
        discountPercent: 15,
        minSpend: 3000,
        maxDiscount: 1500,
        badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
        logoText: 'COMBANK',
    },
    {
        id: 'sampath',
        bankName: 'Sampath Bank',
        cardType: 'Visa / Mastercard',
        discountPercent: 20,
        minSpend: 4000,
        maxDiscount: 2000,
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        logoText: 'SAMPATH',
    },
    {
        id: 'hnb',
        bankName: 'Hatton National Bank (HNB)',
        cardType: 'Credit Cards',
        discountPercent: 10,
        minSpend: 2500,
        maxDiscount: 1000,
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        logoText: 'HNB',
    },
    {
        id: 'boc',
        bankName: 'Bank of Ceylon (BOC)',
        cardType: 'Debit & Credit',
        discountPercent: 10,
        minSpend: 3000,
        maxDiscount: 1000,
        badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
        logoText: 'BOC',
    },
    {
        id: 'amex',
        bankName: 'American Express (NTB)',
        cardType: 'Amex Centurion Cards',
        discountPercent: 20,
        minSpend: 5000,
        maxDiscount: 2500,
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        logoText: 'AMEX',
    },
    {
        id: 'seylan',
        bankName: 'Seylan Bank',
        cardType: 'Seylan Credit Cards',
        discountPercent: 12,
        minSpend: 3000,
        maxDiscount: 1200,
        badgeColor: 'bg-red-100 text-red-900 border-red-300',
        logoText: 'SEYLAN',
    },
];

export function calculateBankDiscount(promo, subtotal) {
    if (!promo || !subtotal) return 0;
    if (promo.minSpend && subtotal < promo.minSpend) return 0;

    let discount = (subtotal * promo.discountPercent) / 100;
    if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
    }

    return parseFloat(discount.toFixed(2));
}

