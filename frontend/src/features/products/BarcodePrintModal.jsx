import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Printer, RefreshCw, Layers, Check, Copy, Sliders, Eye,
    Calendar, Tag, Store, Hash, FileText, CheckCircle2, ChevronRight, Sparkles, PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useCompanySettings } from '../settings/useSettings';
import { useProducts } from './useProducts';
import { stockApi } from '../stock/stockApi';
import { BarcodeLabelSvg, generateRetailBarcode } from '../../utils/barcodeGenerator';

export default function BarcodePrintModal({ isOpen, onClose, initialProduct = null }) {
    const { data: settingsRes } = useCompanySettings();
    const company = settingsRes?.data || {};

    const { data: productsRes } = useProducts({ limit: 200, status: 'active' });
    const productList = productsRes?.data || [];

    const printAreaRef = useRef(null);

    // Selected product & label fields
    const [selectedProductId, setSelectedProductId] = useState('');
    const [storeName, setStoreName] = useState('');
    const [productName, setProductName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [price, setPrice] = useState('');
    const [packedDate, setPackedDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('new'); // 'new' or StockItem._id
    const [labelCount, setLabelCount] = useState(24);
    const [labelFormat, setLabelFormat] = useState('thermal-50x30'); // 'thermal-50x30' | 'thermal-38x25' | 'a4-sheet-24'

    // Options checkboxes
    const [showStoreName, setShowStoreName] = useState(true);
    const [showPrice, setShowPrice] = useState(true);
    const [showDates, setShowDates] = useState(true);
    const [showBatchNumber, setShowBatchNumber] = useState(true);

    // Preview Mode: 'single' (zoomed die-cut) | 'sheet' (all stickers)
    const [previewMode, setPreviewMode] = useState('single');

    // Default today date YYYY-MM-DD
    const getTodayStr = () => new Date().toISOString().split('T')[0];

    // Helper to generate a new Batch Number e.g. "BN-261103-841"
    const generateBatchNumber = () => {
        const d = new Date();
        const dateStr = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const rand = Math.floor(100 + Math.random() * 900);
        return `BN-${dateStr}-${rand}`;
    };

    // Fetch existing stock batches for the selected product
    const { data: stockData } = useQuery({
        queryKey: ['stock-by-product', selectedProductId],
        queryFn: () => stockApi.byProduct(selectedProductId),
        enabled: !!selectedProductId && isOpen,
    });

    const stockItems = stockData?.data?.items || [];
    // Batches that have batchNumber or expiryDate or available quantity
    const existingBatches = stockItems.filter(s => s.batchNumber || s.expiryDate || (s.quantities?.onHand > 0));

    // Initialize or load product data
    useEffect(() => {
        if (!isOpen) return;

        const defaultStore = company.companyName || 'ASIP SUPERMARKET';
        setStoreName(defaultStore);

        const prod = initialProduct || (productList.length > 0 ? productList[0] : null);
        if (prod) {
            setSelectedProductId(prod._id);
            setProductName(prod.name || '');
            setBarcode(prod.barcode || generateRetailBarcode());
            setPrice(prod.basePrice !== undefined ? String(prod.basePrice) : '0.00');
            setSelectedBatchId('new');
            setBatchNumber(generateBatchNumber());

            const today = getTodayStr();
            setPackedDate(today);

            if (prod.isPerishable && prod.shelfLifeDays) {
                const exp = new Date();
                exp.setDate(exp.getDate() + (prod.shelfLifeDays || 1));
                setExpiryDate(exp.toISOString().split('T')[0]);
            } else if (prod.expiryDate) {
                setExpiryDate(new Date(prod.expiryDate).toISOString().split('T')[0]);
            } else {
                setExpiryDate('');
            }
        } else {
            setPackedDate(getTodayStr());
            setBatchNumber(generateBatchNumber());
        }
    }, [isOpen, initialProduct, company.companyName, productList.length]);

    // Handle product dropdown change
    const handleProductSelect = (prodId) => {
        setSelectedProductId(prodId);
        setSelectedBatchId('new');
        setBatchNumber(generateBatchNumber());

        const prod = productList.find(p => p._id === prodId);
        if (!prod) return;

        setProductName(prod.name || '');
        setBarcode(prod.barcode || generateRetailBarcode());
        setPrice(prod.basePrice !== undefined ? String(prod.basePrice) : '0.00');

        const today = getTodayStr();
        setPackedDate(today);

        if (prod.isPerishable && prod.shelfLifeDays) {
            const exp = new Date();
            exp.setDate(exp.getDate() + (prod.shelfLifeDays || 1));
            setExpiryDate(exp.toISOString().split('T')[0]);
        } else if (prod.expiryDate) {
            setExpiryDate(new Date(prod.expiryDate).toISOString().split('T')[0]);
        } else {
            setExpiryDate('');
        }
    };

    // Handle batch dropdown change
    const handleBatchSelect = (batchId) => {
        setSelectedBatchId(batchId);
        if (batchId === 'new') {
            const prod = productList.find(p => p._id === selectedProductId);
            setBatchNumber(generateBatchNumber());
            setPackedDate(getTodayStr());
            if (prod?.isPerishable && prod.shelfLifeDays) {
                const exp = new Date();
                exp.setDate(exp.getDate() + (prod.shelfLifeDays || 1));
                setExpiryDate(exp.toISOString().split('T')[0]);
            } else {
                setExpiryDate('');
            }
            toast.success('Ready for new batch stickers');
        } else {
            const b = existingBatches.find(x => x._id === batchId);
            if (!b) return;

            setBatchNumber(b.batchNumber || '');
            if (b.manufactureDate) {
                setPackedDate(new Date(b.manufactureDate).toISOString().split('T')[0]);
            }
            if (b.expiryDate) {
                setExpiryDate(new Date(b.expiryDate).toISOString().split('T')[0]);
            }
            if (b.quantities?.available > 0) {
                setLabelCount(b.quantities.available);
                toast.success(`Loaded Batch ${b.batchNumber || 'Stock'} (${b.quantities.available} pcs in stock)`);
            } else {
                toast.success(`Loaded Batch details`);
            }
        }
    };

    const handleRegenerateBarcode = () => {
        const newCode = generateRetailBarcode();
        setBarcode(newCode);
        toast.success(`Generated retail EAN-13: ${newCode}`);
    };

    // Format currency
    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2
    }).format(parseFloat(n) || 0);

    const fmtDate = (d) => {
        if (!d) return '—';
        try {
            const date = new Date(d);
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        } catch {
            return d;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    const count = Math.max(1, parseInt(labelCount, 10) || 1);
    const stickersArray = Array.from({ length: count });

    const formatLabels = {
        'thermal-50x30': { name: 'Roll 50×30mm', desc: 'Standard Thermal Roll', icon: '🏷️' },
        'thermal-38x25': { name: 'Roll 38×25mm', desc: 'Compact Grocery Roll', icon: '🏷️' },
        'a4-sheet-24': { name: 'A4 Sheet (24/page)', desc: '3×8 Sheet Grid', icon: '📄' },
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🏷️ Supermarket Barcode Label Studio"
            size="2xl"
        >
            <div className="p-6 space-y-5">
                {/* Modern Toolbar with generous breathing space */}
                <div className="p-3.5 bg-gray-50 border border-gray-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    {/* Paper Format Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} className="text-indigo-600" />
                            Format:
                        </span>
                        <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                            {Object.entries(formatLabels).map(([key, val]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setLabelFormat(key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                        labelFormat === key
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{val.icon}</span>
                                    <span>{val.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview Mode Segmented Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Eye size={14} className="text-indigo-600" />
                            Preview:
                        </span>
                        <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 shadow-2xs text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setPreviewMode('single')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    previewMode === 'single'
                                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <span>Sticker Detail</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewMode('sheet')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    previewMode === 'sheet'
                                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <span>All Labels ({count})</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2-Column Responsive Body */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* LEFT PANEL: CONFIGURATION (5 cols) */}
                    <div className="lg:col-span-5 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                        {/* Product Selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Select Product
                            </label>
                            <select
                                value={selectedProductId}
                                onChange={(e) => handleProductSelect(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs transition"
                            >
                                <option value="">-- Choose from Catalog --</option>
                                {productList.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} ({p.sku || p.productCode || p.barcode}) - Rs. {p.basePrice}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Batch & Expiry Arrival Selector */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <PackageCheck size={14} className="text-amber-700" /> Stock Batch / Lot
                                </label>
                                {existingBatches.length > 0 && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full">
                                        {existingBatches.length} batch{existingBatches.length > 1 ? 'es' : ''} in store
                                    </span>
                                )}
                            </div>

                            <select
                                value={selectedBatchId}
                                onChange={(e) => handleBatchSelect(e.target.value)}
                                className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs bg-white font-bold text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
                            >
                                <option value="new">✨ + New Stock Arrival / Bakery Production Batch</option>
                                {existingBatches.map(b => (
                                    <option key={b._id} value={b._id}>
                                        📦 {b.batchNumber || 'No Batch #'} | EXP: {fmtDate(b.expiryDate)} | {b.quantities?.available || 0} in {b.warehouseId?.name || 'Stock'}
                                    </option>
                                ))}
                            </select>

                            {/* Batch Number & Auto-Generator */}
                            <div className="flex items-center gap-2 pt-0.5">
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-800">BN:</span>
                                    <input
                                        type="text"
                                        value={batchNumber}
                                        onChange={(e) => setBatchNumber(e.target.value)}
                                        placeholder="BN-xxxx"
                                        className="w-full pl-10 pr-2.5 py-1.5 border border-amber-300 rounded-lg text-xs font-mono font-black text-gray-900 bg-white focus:ring-1 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const bn = generateBatchNumber();
                                        setBatchNumber(bn);
                                        toast.success(`Generated batch: ${bn}`);
                                    }}
                                    className="px-2.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-lg transition shrink-0 active:scale-95"
                                    title="Auto-Generate Unique Batch Number"
                                >
                                    Auto BN
                                </button>
                            </div>
                        </div>

                        {/* Label Quantity Counter */}
                        <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-indigo-50/80 border border-indigo-100 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <Hash size={14} className="text-indigo-600" /> Quantity to Print
                                </label>
                                <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs font-mono">
                                    {count} sticker{count > 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center border border-indigo-200 bg-white rounded-xl shadow-2xs p-1">
                                    <button
                                        type="button"
                                        onClick={() => setLabelCount(Math.max(1, count - 1))}
                                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg font-bold text-base transition"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max="500"
                                        value={labelCount}
                                        onChange={(e) => setLabelCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="w-16 text-center text-base font-black text-indigo-950 bg-transparent border-0 focus:ring-0 p-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setLabelCount(count + 1)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg font-bold text-base transition"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Preset Pills */}
                                <div className="flex items-center gap-1 flex-wrap flex-1">
                                    {[6, 12, 24, 48, 100].map(cnt => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => setLabelCount(cnt)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                                                count === cnt
                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:text-indigo-700'
                                            }`}
                                        >
                                            {cnt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Product Title */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Label Title
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Product display name on sticker"
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                            />
                        </div>

                        {/* Barcode & Price Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-700">Barcode</label>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateBarcode}
                                        className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                                        title="Generate valid GS1 EAN-13 code"
                                    >
                                        <RefreshCw size={10} /> Auto EAN
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    placeholder="20xxxx"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Price (LKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rs.</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dates Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <Calendar size={12} className="text-gray-400" /> Packed (PKG)
                                </label>
                                <input
                                    type="date"
                                    value={packedDate}
                                    onChange={(e) => setPackedDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <Calendar size={12} className="text-rose-500" /> Expiry (EXP)
                                </label>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                                />
                            </div>
                        </div>

                        {/* Store Name Header */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Store size={12} className="text-gray-400" /> Header Store Brand
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Store name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs uppercase tracking-wider font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                            />
                        </div>

                        {/* Label Display Toggles */}
                        <div className="pt-2 border-t border-gray-200">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Display Elements</span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBatchNumber(!showBatchNumber)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                                        showBatchNumber
                                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                                            : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                                    }`}
                                >
                                    <Check size={12} className={showBatchNumber ? 'opacity-100' : 'opacity-0'} />
                                    <span>Batch No</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowStoreName(!showStoreName)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                                        showStoreName
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                                    }`}
                                >
                                    <Check size={12} className={showStoreName ? 'opacity-100' : 'opacity-0'} />
                                    <span>Store Name</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowPrice(!showPrice)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                                        showPrice
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                                    }`}
                                >
                                    <Check size={12} className={showPrice ? 'opacity-100' : 'opacity-0'} />
                                    <span>Price</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowDates(!showDates)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                                        showDates
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                                    }`}
                                >
                                    <Check size={12} className={showDates ? 'opacity-100' : 'opacity-0'} />
                                    <span>Dates</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: LIVE HIGH-FIDELITY PREVIEW (7 cols) */}
                    <div className="lg:col-span-7 bg-slate-50 border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between shadow-2xs min-h-[460px]">
                        <div className="flex justify-between items-center mb-3 shrink-0">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-500" />
                                {previewMode === 'single' ? 'Sticker Preview (Realistic Die-Cut)' : `Live Sheet Grid (${count} Labels)`}
                            </span>
                            <span className="text-xs font-mono font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                                {formatLabels[labelFormat]?.desc}
                            </span>
                        </div>

                        {/* VIEW 1: SINGLE STICKER REALISTIC PREVIEW */}
                        {previewMode === 'single' ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6">
                                {/* Realistic Thermal Sticker Card */}
                                <div
                                    className="bg-white border-2 border-gray-900 rounded-2xl p-3.5 shadow-2xl select-none flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02]"
                                    style={{
                                        width: labelFormat === 'thermal-38x25' ? '290px' : '340px',
                                        minHeight: labelFormat === 'thermal-38x25' ? '185px' : '210px',
                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                    }}
                                >
                                    {/* Top Store Header */}
                                    {showStoreName && storeName && (
                                        <div className="text-center font-black tracking-widest text-[11px] uppercase text-gray-900 border-b border-gray-300 pb-1 mb-1 truncate">
                                            ✦ {storeName} ✦
                                        </div>
                                    )}

                                    {/* Product Title */}
                                    <div className="text-center font-black text-gray-950 text-sm leading-snug line-clamp-2 px-1">
                                        {productName || 'PRODUCT TITLE'}
                                    </div>

                                    {/* Barcode Vector & Readable Digits */}
                                    <div className="my-1.5 px-3">
                                        <BarcodeLabelSvg
                                            value={barcode || '2001234567890'}
                                            height={labelFormat === 'thermal-38x25' ? 36 : 46}
                                            showText={true}
                                            textClassName="text-[11px] font-mono tracking-widest text-center font-bold text-black mt-1"
                                        />
                                    </div>

                                    {/* Price, Batch & Expiry Footer */}
                                    <div className="pt-1.5 border-t border-gray-300 flex flex-col gap-1">
                                        {showPrice && (
                                            <div className="flex justify-between items-baseline px-1.5 bg-gray-50 p-1 rounded-lg">
                                                <span className="text-[10px] uppercase font-bold text-gray-600">MRP / PRICE:</span>
                                                <span className="text-base font-black text-black font-mono">
                                                    {fmt(price)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-800 px-1 pt-0.5">
                                            {showBatchNumber && batchNumber && (
                                                <span className="font-mono text-[9px] text-gray-700 font-extrabold truncate max-w-[130px]">
                                                    B: {batchNumber}
                                                </span>
                                            )}
                                            <div className="flex gap-2 ml-auto">
                                                {showDates && packedDate && <span>PKG: {fmtDate(packedDate)}</span>}
                                                {showDates && expiryDate && <span className="text-rose-700">EXP: {fmtDate(expiryDate)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 mt-5 font-medium flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    Batch & Expiry synchronized for supermarket shelf labeling
                                </p>
                            </div>
                        ) : (
                            /* VIEW 2: FULL SHEET PREVIEW */
                            <div className="flex-1 overflow-y-auto p-3 bg-white rounded-2xl border border-gray-300 shadow-inner max-h-[440px]">
                                <div className={`grid gap-2.5 ${labelFormat === 'a4-sheet-24' ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
                                    {stickersArray.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white border-2 border-gray-900 rounded-xl p-2.5 flex flex-col justify-between text-black shadow-2xs"
                                            style={{ minHeight: '130px' }}
                                        >
                                            {showStoreName && storeName && (
                                                <div className="text-center font-black text-[9px] uppercase tracking-wider truncate border-b border-gray-200 pb-0.5">
                                                    {storeName}
                                                </div>
                                            )}
                                            <div className="font-bold text-[10px] text-center truncate my-1">
                                                {productName || 'PRODUCT'}
                                            </div>
                                            <div className="px-1 my-0.5">
                                                <BarcodeLabelSvg
                                                    value={barcode || '2001234567890'}
                                                    height={28}
                                                    showText={true}
                                                    textClassName="text-[9px] font-mono tracking-widest text-center font-bold"
                                                />
                                            </div>
                                            <div className="pt-1 border-t border-gray-200">
                                                {showPrice && (
                                                    <div className="flex justify-between font-black text-[11px]">
                                                        <span>MRP:</span>
                                                        <span>{fmt(price)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-[7.5px] font-bold text-gray-700 pt-0.5">
                                                    {showBatchNumber && batchNumber && (
                                                        <span className="font-mono text-[7px] text-gray-600 truncate max-w-[80px]">
                                                            B:{batchNumber}
                                                        </span>
                                                    )}
                                                    <div className="flex gap-1.5 ml-auto">
                                                        {showDates && packedDate && <span>P:{fmtDate(packedDate)}</span>}
                                                        {showDates && expiryDate && <span className="text-rose-700">E:{fmtDate(expiryDate)}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Bottom Action Bar */}
                <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                            Ready to print: <strong className="text-gray-900">{count}</strong> labels on <strong className="text-gray-900">{formatLabels[labelFormat]?.name}</strong>
                            {batchNumber && <span className="text-amber-800 ml-1 font-mono font-bold">({batchNumber})</span>}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose} className="px-4">
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="primary"
                            onClick={handlePrint}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 active:scale-95"
                        >
                            <Printer size={16} />
                            <span>Print / Download PDF ({count})</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Hidden Printable Container for Direct Thermal / Sheet Output */}
            <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]" ref={printAreaRef}>
                <style type="text/css" media="print">
                    {labelFormat === 'thermal-50x30' ? `
                        @page {
                            size: 50mm 30mm;
                            margin: 0;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                        }
                        .barcode-print-sticker {
                            width: 50mm !important;
                            height: 30mm !important;
                            page-break-after: always !important;
                            break-after: page !important;
                            padding: 1.5mm 2mm !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                            overflow: hidden !important;
                            font-family: Arial, sans-serif !important;
                        }
                    ` : labelFormat === 'thermal-38x25' ? `
                        @page {
                            size: 38mm 25mm;
                            margin: 0;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                        }
                        .barcode-print-sticker {
                            width: 38mm !important;
                            height: 25mm !important;
                            page-break-after: always !important;
                            break-after: page !important;
                            padding: 1mm 1.5mm !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                            overflow: hidden !important;
                            font-family: Arial, sans-serif !important;
                        }
                    ` : `
                        @page {
                            size: A4 portrait;
                            margin: 8mm;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                        }
                        .barcode-print-grid {
                            display: grid !important;
                            grid-template-columns: repeat(3, 1fr) !important;
                            gap: 2.5mm !important;
                            width: 100% !important;
                        }
                        .barcode-print-sticker {
                            height: 32mm !important;
                            border: 1px solid #000 !important;
                            border-radius: 4px !important;
                            padding: 2mm !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            font-family: Arial, sans-serif !important;
                        }
                    `}
                </style>

                <div className={labelFormat === 'a4-sheet-24' ? 'barcode-print-grid' : ''}>
                    {stickersArray.map((_, idx) => (
                        <div key={idx} className="barcode-print-sticker bg-white text-black">
                            {/* Store Name Header */}
                            {showStoreName && storeName && (
                                <div style={{ fontSize: '8px', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '1px' }}>
                                    {storeName}
                                </div>
                            )}

                            {/* Product Name */}
                            <div style={{ fontSize: '10px', fontWeight: '900', textAlign: 'center', lineHeight: 1.15, margin: '1px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {productName || 'PRODUCT NAME'}
                            </div>

                            {/* Barcode SVG */}
                            <div style={{ padding: '0 2px', margin: '1px 0', textAlign: 'center' }}>
                                <BarcodeLabelSvg
                                    value={barcode || '2001234567890'}
                                    height={labelFormat === 'thermal-38x25' ? 24 : 32}
                                    showText={true}
                                    textClassName="text-[8px] font-mono tracking-widest text-center font-bold"
                                />
                            </div>

                            {/* Price, Batch & Dates Footer */}
                            <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                                {showPrice && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: '900', fontSize: '11px' }}>
                                        <span>PRICE:</span>
                                        <span style={{ fontSize: '12px' }}>{fmt(price)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7.5px', fontWeight: 'bold', color: '#111' }}>
                                    {showBatchNumber && batchNumber && (
                                        <span style={{ fontFamily: 'monospace', fontSize: '7px' }}>B:{batchNumber}</span>
                                    )}
                                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                        {showDates && packedDate && <span>P:{fmtDate(packedDate)}</span>}
                                        {showDates && expiryDate && <span>E:{fmtDate(expiryDate)}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
