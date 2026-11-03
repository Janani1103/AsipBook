/**
 * Barcode utilities for Retail, Supermarket & Bakery products.
 * Generates GS1 compliant in-store retail EAN-13 barcodes, Code-128 barcodes,
 * and renders high-density, crisp vector SVG for thermal & sheet label printers.
 */

// Calculate Modulo-10 Check Digit for EAN-13
export function calculateEan13CheckDigit(digits12) {
    const str = String(digits12).replace(/\D/g, '').slice(0, 12);
    if (str.length < 12) return '0';

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const num = parseInt(str[i], 10);
        sum += (i % 2 === 0) ? num * 1 : num * 3;
    }
    const remainder = sum % 10;
    return String((10 - remainder) % 10);
}

// Generate unique in-store retail EAN-13 barcode starting with '20' (GS1 standard for in-store items)
export function generateRetailBarcode() {
    let randomPart = '';
    for (let i = 0; i < 9; i++) {
        randomPart += Math.floor(Math.random() * 10).toString();
    }
    const base12 = `20${randomPart}`;
    const checkDigit = calculateEan13CheckDigit(base12);
    return `${base12}${checkDigit}`;
}

// GS1 EAN-13 Standard Tables
const L_PATTERNS = [
    "0001101", "0011001", "0010011", "0111101", "0100011",
    "0110001", "0101111", "0111011", "0110111", "0001011"
];
const G_PATTERNS = [
    "0100111", "0110011", "0011011", "0100001", "0011101",
    "0111001", "0000101", "0010001", "0001001", "0010111"
];
const R_PATTERNS = [
    "1110010", "1100110", "1101100", "1000010", "1011100",
    "1001110", "1010000", "1000100", "1001000", "1110100"
];
const FIRST_DIGIT_STRUCTURE = [
    "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
    "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

/**
 * Encodes a 12 or 13 digit number into GS1 EAN-13 binary string
 */
export function encodeEan13ToBits(rawCode) {
    let clean = String(rawCode || '').replace(/\D/g, '');
    if (clean.length === 12) {
        clean = clean + calculateEan13CheckDigit(clean);
    }
    if (clean.length !== 13) return null;

    const firstDigit = parseInt(clean[0], 10);
    const pattern = FIRST_DIGIT_STRUCTURE[firstDigit] || "LLLLLL";

    let bits = "101"; // Left Guard

    // First group of 6 digits (digits 1 to 6)
    for (let i = 1; i <= 6; i++) {
        const d = parseInt(clean[i], 10);
        const pType = pattern[i - 1];
        bits += (pType === 'G' ? G_PATTERNS[d] : L_PATTERNS[d]);
    }

    bits += "01010"; // Center Guard

    // Second group of 6 digits (digits 7 to 12)
    for (let i = 7; i <= 12; i++) {
        const d = parseInt(clean[i], 10);
        bits += R_PATTERNS[d];
    }

    bits += "101"; // Right Guard
    return { bits, code: clean };
}

// Code-128 Pattern subset (11 modules per character)
const CODE128_PATTERNS = [
    "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
    "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
    "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
    "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
    "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
    "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
    "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
    "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
    "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
    "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
    "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
    "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
    "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
    "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
    "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
    "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
    "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
    "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
    "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
    "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
    "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
    "11010011100", "11000111010"
];

/**
 * Encodes an alphanumeric string into Code-128B binary
 */
export function encodeCode128ToBits(rawText) {
    const text = String(rawText || '').trim() || '200000';
    let bits = "11010010000"; // START CODE B (index 104)
    let checksum = 104;

    for (let i = 0; i < text.length; i++) {
        const ascii = text.charCodeAt(i);
        const code128Val = ascii - 32;
        if (code128Val >= 0 && code128Val <= 95) {
            bits += CODE128_PATTERNS[code128Val];
            checksum += code128Val * (i + 1);
        } else {
            // fallback space
            bits += CODE128_PATTERNS[0];
        }
    }

    const checkChar = checksum % 103;
    bits += CODE128_PATTERNS[checkChar] || CODE128_PATTERNS[0];
    bits += "1100011101011"; // STOP CODE (13 modules)
    return { bits, code: text };
}

/**
 * Crisp Vector Barcode SVG component
 * Automatically selects GS1 EAN-13 when input is numeric (12 or 13 digits),
 * or standard Code-128 for alphanumeric barcodes.
 */
export function BarcodeLabelSvg({
    value = '2001234567890',
    width = 180,
    height = 42,
    showText = false,
    textClassName = 'text-[9px] font-mono tracking-widest text-center mt-0.5'
}) {
    const rawVal = String(value || '2000000000000').trim();
    
    // Choose encoder
    let encoded = null;
    const digitsOnly = rawVal.replace(/\D/g, '');
    if ((digitsOnly.length === 12 || digitsOnly.length === 13) && rawVal === digitsOnly) {
        encoded = encodeEan13ToBits(rawVal);
    }
    if (!encoded) {
        encoded = encodeCode128ToBits(rawVal);
    }

    const bits = encoded.bits;
    const moduleCount = bits.length;
    const moduleWidth = 1.6;
    const totalSvgWidth = moduleCount * moduleWidth;

    return (
        <div className="w-full flex flex-col items-center">
            <svg
                width="100%"
                height={height}
                viewBox={`0 0 ${totalSvgWidth} ${height}`}
                className="shape-rendering-crispEdges select-none"
                preserveAspectRatio="none"
            >
                <rect width="100%" height="100%" fill="#ffffff" />
                {Array.from(bits).map((bit, idx) => (
                    bit === '1' ? (
                        <rect
                            key={idx}
                            x={idx * moduleWidth}
                            y={0}
                            width={moduleWidth}
                            height={height}
                            fill="#000000"
                        />
                    ) : null
                ))}
            </svg>
            {showText && (
                <div className={textClassName}>
                    {encoded.code}
                </div>
            )}
        </div>
    );
}
