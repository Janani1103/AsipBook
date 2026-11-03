/**
 * Trilingual dictionary for Receipts and Invoices (English, Sinhala, Tamil)
 * Provides comprehensive translations for POS 80mm thermal receipts and A4 invoices.
 */

export const RECEIPT_LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'si', label: 'සිංහල', flag: '🇱🇰' },
    { code: 'ta', label: 'தமிழ்', flag: '🇱🇰' },
];

export const receiptDictionary = {
    en: {
        taxInvoice: 'TAX INVOICE',
        salesReceipt: 'SALES RECEIPT',
        posReceipt: 'CASH SALE RECEIPT',
        originalReceipt: 'ORIGINAL RECEIPT',
        receiptNo: 'Receipt No',
        invoiceNo: 'Invoice No',
        date: 'Date',
        time: 'Time',
        cashier: 'Cashier',
        customer: 'Customer',
        customerCode: 'Cust Code',
        contact: 'Contact',
        address: 'Address',
        phone: 'Phone',
        tel: 'TEL',
        vatNo: 'VAT Reg No',
        businessRegNo: 'BR No',
        billTo: 'BILL TO',
        invoiceDetails: 'INVOICE DETAILS',
        dueDate: 'Due Date',
        orderRef: 'Order Ref',
        paymentTerms: 'Terms',
        
        // Item table
        itemDescription: 'Description',
        qty: 'Qty',
        rate: 'Price',
        unitPrice: 'Unit Price',
        discount: 'Discount',
        amount: 'Amount',
        itemsCount: 'Total Items',
        totalQty: 'Total Qty',
        
        // Totals
        subtotal: 'Subtotal',
        itemDiscount: 'Item Discount',
        orderDiscount: 'Special Discount',
        couponDiscount: 'Coupon Code',
        totalTax: 'VAT / Tax',
        netTotal: 'Net Total',
        grandTotal: 'TOTAL AMOUNT',
        
        // Savings highlight
        totalSavings: 'TOTAL SAVINGS',
        youSaved: 'You Saved on this purchase!',
        
        // Settlement & payment
        paymentMethod: 'Payment Method',
        paidAmount: 'Paid Amount',
        cashReceived: 'Cash Tendered',
        changeReturned: 'Change Returned',
        balanceDue: 'Balance Due',
        refSlip: 'Ref / Slip',
        chequeNo: 'Cheque No',
        
        // Methods
        cash: 'CASH',
        card: 'CARD',
        bank_transfer: 'BANK TRANSFER',
        cheque: 'CHEQUE',
        credit: 'CREDIT / ON ACCOUNT',
        qr: 'QR PAYMENT',
        
        // Loyalty
        loyaltyRewards: '⭐ LOYALTY REWARDS ⭐',
        pointsUsed: 'Points Redeemed',
        pointsEarned: 'Points Earned Today',
        pointsBalance: 'Loyalty Balance',
        
        // Footer
        thankYou: 'THANK YOU FOR YOUR BUSINESS!',
        visitAgain: 'PLEASE VISIT AGAIN',
        exchangePolicy: 'Goods return or exchange accepted within 7 days with original receipt.',
        scanVerify: 'Scan QR to verify authentic receipt',
        softwareCredit: 'Powered by AsipBook ERP',
    },
    si: {
        taxInvoice: 'බදු ඉන්වොයිසිය',
        salesReceipt: 'විකුණුම් රිසිට්පත',
        posReceipt: 'මුදල් ගෙවීම් රිසිට්පත',
        originalReceipt: 'මුල් පිටපත',
        receiptNo: 'රිසිට් අංකය',
        invoiceNo: 'ඉන්වොයිස් අංකය',
        date: 'දිනය',
        time: 'වේලාව',
        cashier: 'අයකැමි',
        customer: 'පාරිභෝගිකයා',
        customerCode: 'ගැණුම්කරු අංකය',
        contact: 'දුරකථන',
        address: 'ලිපිනය',
        phone: 'දුරකථන',
        tel: 'දුරකථන',
        vatNo: 'වැට් අංකය',
        businessRegNo: 'ව්‍යාපාර ලියාපදිංචි අංකය',
        billTo: 'බිල්පත ලබන්නා',
        invoiceDetails: 'ඉන්වොයිස් විස්තර',
        dueDate: 'ගෙවිය යුතු දිනය',
        orderRef: 'ඇණවුම් අංකය',
        paymentTerms: 'කොන්දේසි',
        
        // Item table
        itemDescription: 'භාණ්ඩ විස්තරය',
        qty: 'ප්‍රමාණය',
        rate: 'මිල',
        unitPrice: 'ඒකක මිල',
        discount: 'වට්ටම්',
        amount: 'මුදල',
        itemsCount: 'භාණ්ඩ වර්ග',
        totalQty: 'මුළු ප්‍රමාණය',
        
        // Totals
        subtotal: 'එකතුව (Subtotal)',
        itemDiscount: 'භාණ්ඩ වට්ටම්',
        orderDiscount: 'විශේෂ වට්ටම්',
        couponDiscount: 'කූපන් වට්ටම්',
        totalTax: 'එකතු කළ බදු (VAT)',
        netTotal: 'ශුද්ධ එකතුව',
        grandTotal: 'මුළු එකතුව (Total)',
        
        // Savings highlight
        totalSavings: 'ඔබේ මුළු ඉතිරිය',
        youSaved: 'මෙම මිලදී ගැනීමෙන් ඔබ ඉතිරි කළ මුදල!',
        
        // Settlement & payment
        paymentMethod: 'ගෙවීම් ක්‍රමය',
        paidAmount: 'ගෙවූ මුදල',
        cashReceived: 'ලැබුණු මුදල්',
        changeReturned: 'ඉතිරි මුදල',
        balanceDue: 'හිඟ මුදල',
        refSlip: 'යොමු අංකය',
        chequeNo: 'චෙක්පත් අංකය',
        
        // Methods
        cash: 'මුදල් (CASH)',
        card: 'කාඩ්පත් (CARD)',
        bank_transfer: 'බැංකු හුවමාරුව',
        cheque: 'චෙක්පත් (CHEQUE)',
        credit: 'ණය (CREDIT)',
        qr: 'QR ගෙවීම්',
        
        // Loyalty
        loyaltyRewards: '⭐ පාරිභෝගික ප්‍රතිලාභ ⭐',
        pointsUsed: 'භාවිතා කළ ලකුණු',
        pointsEarned: 'අද උපයාගත් ලකුණු',
        pointsBalance: 'මුළු ලකුණු ශේෂය',
        
        // Footer
        thankYou: 'අප සමඟ ගනුදෙනු කළ ඔබට ස්තූතියි!',
        visitAgain: 'නැවත පැමිණෙන්න, සුබ දවසක්!',
        exchangePolicy: 'දින 7ක් ඇතුළත මුල් බිල්පත සමඟ භාණ්ඩ මාරු කළ හැක.',
        scanVerify: 'බිල්පත තහවුරු කිරීමට QR කේතය ස්කෑන් කරන්න',
        softwareCredit: 'AsipBook මෘදුකාංග පද්ධතිය මඟින් බලගැන්වේ',
    },
    ta: {
        taxInvoice: 'வரி விலைப்பட்டியல்',
        salesReceipt: 'விற்பனை ரசீது',
        posReceipt: 'பண விற்பனை ரசீது',
        originalReceipt: 'அசல் ரசீது',
        receiptNo: 'ரசீது எண்',
        invoiceNo: 'விலைப்பட்டியல் எண்',
        date: 'தேதி',
        time: 'நேரம்',
        cashier: 'காசாளர்',
        customer: 'வாடிக்கையாளர்',
        customerCode: 'வாடிக்கையாளர் குறியீடு',
        contact: 'தொலைபேசி',
        address: 'முகவரி',
        phone: 'தொலைபேசி',
        tel: 'தொலைபேசி',
        vatNo: 'VAT எண்',
        businessRegNo: 'வணிகப் பதிவு எண்',
        billTo: 'வாங்குபவர்',
        invoiceDetails: 'விலைப்பட்டியல் விவரங்கள்',
        dueDate: 'செலுத்த வேண்டிய தேதி',
        orderRef: 'ஆர்டர் குறிப்பு',
        paymentTerms: 'விதிமுறைகள்',
        
        // Item table
        itemDescription: 'விவரம்',
        qty: 'அளவு',
        rate: 'விலை',
        unitPrice: 'அலகு விலை',
        discount: 'தள்ளுபடி',
        amount: 'தொகை',
        itemsCount: 'பொருட்களின் எண்ணிக்கை',
        totalQty: 'மொத்த அளவு',
        
        // Totals
        subtotal: 'கூட்டுத்தொகை (Subtotal)',
        itemDiscount: 'பொருள் தள்ளுபடி',
        orderDiscount: 'சிறப்பு தள்ளுபடி',
        couponDiscount: 'கூப்பன் தள்ளுபடி',
        totalTax: 'வரி (VAT)',
        netTotal: 'நிகர மொத்தம்',
        grandTotal: 'மொத்த தொகை (Total)',
        
        // Savings highlight
        totalSavings: 'உங்கள் மொத்த சேமிப்பு',
        youSaved: 'இந்த கொள்முதலில் நீங்கள் சேமித்த தொகை!',
        
        // Settlement & payment
        paymentMethod: 'கட்டண முறை',
        paidAmount: 'செலுத்திய தொகை',
        cashReceived: 'பெற்ற பணம்',
        changeReturned: 'மீதி தொகை',
        balanceDue: 'நிலுவைத் தொகை',
        refSlip: 'குறிப்பு எண்',
        chequeNo: 'காசோலை எண்',
        
        // Methods
        cash: 'பணம் (CASH)',
        card: 'அட்டை (CARD)',
        bank_transfer: 'வங்கி பரிமாற்றம்',
        cheque: 'காசோலை (CHEQUE)',
        credit: 'கடன் (CREDIT)',
        qr: 'QR கட்டணம்',
        
        // Loyalty
        loyaltyRewards: '⭐ வாடிக்கையாளர் வெகுமதிகள் ⭐',
        pointsUsed: 'பயன்படுத்திய புள்ளிகள்',
        pointsEarned: 'இன்று பெற்ற புள்ளிகள்',
        pointsBalance: 'புள்ளி இருப்பு',
        
        // Footer
        thankYou: 'உங்கள் வணிகத்திற்கு நன்றி!',
        visitAgain: 'மீண்டும் வருக, இனிய நாளாகட்டும்!',
        exchangePolicy: 'அசல் ரசீதுடன் 7 நாட்களுக்குள் பொருட்களை மாற்றலாம்.',
        scanVerify: 'ரசீதை சரிபார்க்க QR குறியீட்டை ஸ்கேன் செய்யவும்',
        softwareCredit: 'இயங்குவது AsipBook மென்பொருள்',
    }
};

export const getReceiptText = (lang = 'en') => {
    return receiptDictionary[lang] || receiptDictionary.en;
};

