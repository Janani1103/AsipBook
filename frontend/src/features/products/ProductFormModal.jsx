import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Package,
    Layers,
    Boxes,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    Check,
    DollarSign,
    Percent,
    AlertCircle,
    Flame
} from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { productFormSchema } from './productSchemas';
import {
    useCategories,
    useBrands,
    useUoms,
    useCreateProduct,
    useUpdateProduct,
    useProducts
} from './useProducts';
import { generateRetailBarcode } from '../../utils/barcodeGenerator';

export default function ProductFormModal({ isOpen, onClose, product = null }) {
    const isEdit = !!product;
    const [showAdvanced, setShowAdvanced] = useState(false);

    const { data: categoriesData } = useCategories();
    const { data: brandsData } = useBrands();
    const { data: uomsData } = useUoms();
    const { data: allProductsData } = useProducts({ limit: 1000, status: 'active' });

    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            type: 'trading',
            status: 'active',
            productType: 'finished_good',
            taxable: false,
            taxRate: 0,
            sellable: true,
            allowBackorder: false,
            canBeSold: true,
            canBePurchased: true,
            canBeManufactured: false,
            minimumOrderQuantity: 1,
            productNature: 'single',
            variations: [],
            comboItems: [],
            buyingPrice: 0,
            profitPercentage: 0,
            basePrice: 0,
            mrp: 0,
            isClearance: false,
            clearancePrice: 0,
            isPerishable: false,
            shelfLifeDays: 1,
            hasBatchTracking: false,
            tierPricing: [],
            minimumLevel: 0,
            reorderLevel: 5,
            maximumLevel: 0,
            unitsPerCarton: 1,
            cartonsPerPallet: 1,
        },
    });

    const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
        control,
        name: 'tierPricing',
    });

    const { fields: variationFields, append: appendVariation, remove: removeVariation } = useFieldArray({
        control,
        name: 'variations',
    });

    const { fields: comboFields, append: appendCombo, remove: removeCombo } = useFieldArray({
        control,
        name: 'comboItems',
    });

    const selectedNature = watch('productNature') || 'single';
    const buyingPrice = Number(watch('buyingPrice')) || 0;
    const sellingPrice = Number(watch('basePrice')) || 0;
    const profitMargin = sellingPrice > 0 && buyingPrice > 0
        ? (((sellingPrice - buyingPrice) / sellingPrice) * 100).toFixed(1)
        : null;
    const profitAmount = sellingPrice - buyingPrice;

    // Reset and populate form
    useEffect(() => {
        if (isOpen && product) {
            reset({
                name: product.name || '',
                shortName: product.shortName || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                productType: product.productType || 'finished_good',
                canBeSold: product.canBeSold ?? true,
                canBePurchased: product.canBePurchased ?? true,
                canBeManufactured: product.canBeManufactured ?? false,
                description: product.description || '',
                categoryId: product.categoryId?._id || product.categoryId || '',
                brandId: product.brandId?._id || product.brandId || '',
                type: product.type || 'trading',
                unitOfMeasure: product.unitOfMeasure || 'PCS',
                basePrice: product.basePrice || 0,
                mrp: product.mrp || 0,
                callPrice: product.callPrice || 0,
                taxable: product.tax?.taxable ?? false,
                taxRate: product.tax?.taxRate ?? 0,
                hsCode: product.tax?.hsCode || '',
                minimumLevel: product.stockLevels?.minimumLevel || 0,
                reorderLevel: product.stockLevels?.reorderLevel || 5,
                maximumLevel: product.stockLevels?.maximumLevel || 0,
                unitsPerCarton: product.packaging?.unitsPerCarton || 1,
                cartonsPerPallet: product.packaging?.cartonsPerPallet || 1,
                minimumOrderQuantity: product.salesConfig?.minimumOrderQuantity || 1,
                sellable: product.salesConfig?.sellable ?? true,
                allowBackorder: product.salesConfig?.allowBackorder ?? false,
                status: product.status || 'active',
                buyingPrice: product.costs?.standardCost || product.purchasePrice || 0,
                profitPercentage: product.costs?.standardCost && product.costs.standardCost > 0 && product.basePrice
                    ? (((product.basePrice - product.costs.standardCost) / product.costs.standardCost) * 100).toFixed(2)
                    : 0,
                isClearance: product.isClearance ?? false,
                clearancePrice: product.clearancePrice || 0,
                isPerishable: product.isPerishable ?? false,
                shelfLifeDays: product.shelfLifeDays || 1,
                hasBatchTracking: product.hasBatchTracking ?? false,
                tierPricing: product.tierPricing || [],
                productNature: product.productNature || 'single',
                variations: product.variations || [],
                comboItems: product.comboItems?.map(item => ({
                    productId: item.productId?._id || item.productId,
                    quantity: item.quantity || 1,
                    priceContribution: item.priceContribution || 0
                })) || [],
                notes: product.notes || '',
            });
            setShowAdvanced(
                Boolean(
                    (product.tierPricing && product.tierPricing.length > 0) ||
                    product.brandId ||
                    product.description ||
                    product.isClearance ||
                    (product.stockLevels?.reorderLevel && product.stockLevels.reorderLevel !== 5)
                )
            );
        } else if (isOpen && !product) {
            reset({
                type: 'trading',
                status: 'active',
                productType: 'finished_good',
                taxable: false,
                taxRate: 0,
                sellable: true,
                allowBackorder: false,
                canBeSold: true,
                canBePurchased: true,
                canBeManufactured: false,
                minimumOrderQuantity: 1,
                buyingPrice: 0,
                profitPercentage: 0,
                basePrice: 0,
                mrp: 0,
                callPrice: 0,
                isClearance: false,
                clearancePrice: 0,
                isPerishable: false,
                shelfLifeDays: 1,
                hasBatchTracking: false,
                tierPricing: [],
                productNature: 'single',
                variations: [],
                comboItems: [],
                minimumLevel: 0,
                reorderLevel: 5,
                unitOfMeasure: 'PCS',
            });
            setShowAdvanced(false);
        }
    }, [isOpen, product, reset]);

    const handleAutoGenerateBarcode = () => {
        const code = generateRetailBarcode();
        setValue('barcode', code, { shouldValidate: true });
    };

    const handleAutoGenerateSku = () => {
        const prefix = watch('name')
            ? watch('name').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
            : 'ITEM';
        const num = Math.floor(1000 + Math.random() * 9000);
        setValue('sku', `${prefix}-${num}`, { shouldValidate: true });
    };

    const onSubmit = async (data) => {
        const payload = {
            name: data.name,
            shortName: data.shortName || undefined,
            sku: data.sku || undefined,
            barcode: data.barcode || undefined,
            productType: data.productType || 'finished_good',
            canBeSold: data.canBeSold ?? true,
            canBePurchased: data.canBePurchased ?? true,
            canBeManufactured: data.canBeManufactured ?? false,
            description: data.description || undefined,
            categoryId: data.categoryId,
            brandId: data.brandId || undefined,
            type: data.type || 'trading',
            unitOfMeasure: data.unitOfMeasure,
            basePrice: Number(data.basePrice),
            purchasePrice: Number(data.buyingPrice) || 0,
            mrp: data.mrp ? Number(data.mrp) : undefined,
            callPrice: data.callPrice ? Number(data.callPrice) : undefined,
            isClearance: data.isClearance || false,
            clearancePrice: data.isClearance && data.clearancePrice ? Number(data.clearancePrice) : undefined,
            isPerishable: Boolean(data.isPerishable),
            shelfLifeDays: Number(data.shelfLifeDays) || 1,
            hasBatchTracking: Boolean(data.isPerishable || data.hasBatchTracking),
            costs: {
                ...(product?.costs || {}),
                standardCost: Number(data.buyingPrice) || 0,
            },
            tax: {
                taxable: false,
                taxRate: 0,
            },
            stockLevels: {
                minimumLevel: Number(data.minimumLevel) || 0,
                reorderLevel: Number(data.reorderLevel) || 5,
                maximumLevel: Number(data.maximumLevel) || 0,
            },
            packaging: {
                unitsPerCarton: Number(data.unitsPerCarton) || 1,
                cartonsPerPallet: Number(data.cartonsPerPallet) || 1,
            },
            salesConfig: {
                minimumOrderQuantity: Number(data.minimumOrderQuantity) || 1,
                sellable: data.sellable ?? true,
                allowBackorder: data.allowBackorder ?? false,
            },
            status: data.status || 'active',
            notes: data.notes || undefined,
            tierPricing: data.tierPricing || [],
            productNature: data.productNature || 'single',
            variations: data.productNature === 'variable' ? data.variations : [],
            comboItems: data.productNature === 'combo' ? data.comboItems : [],
        };

        try {
            if (isEdit) {
                await updateProduct.mutateAsync({ id: product._id, data: payload });
            } else {
                await createProduct.mutateAsync(payload);
            }
            onClose();
        } catch (_) {
            // Handled by react-query mutation hooks
        }
    };

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.code})`,
    }));

    const brandOptions = [
        { value: '', label: '-- No Brand / Generic --' },
        ...(brandsData?.data || []).map((b) => ({
            value: b._id,
            label: b.name,
        }))
    ];

    const uomOptions = (uomsData?.data || []).length > 0
        ? (uomsData.data || []).map((u) => ({
            value: u.symbol || u.code || u.name,
            label: `${u.name} (${u.symbol || u.code})`,
        }))
        : [
            { value: 'PCS', label: 'Pieces (PCS)' },
            { value: 'KG', label: 'Kilograms (KG)' },
            { value: 'G', label: 'Grams (G)' },
            { value: 'L', label: 'Liters (L)' },
            { value: 'ML', label: 'Milliliters (ML)' },
            { value: 'PACK', label: 'Pack' },
            { value: 'BOX', label: 'Box' },
            { value: 'BOTTLE', label: 'Bottle' },
        ];

    const isLoading = createProduct.isPending || updateProduct.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Product — ${product?.productCode || ''}` : 'Add New Product'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
                    {/* 1. Product Nature Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Product Type
                        </label>
                        <div className="inline-flex bg-gray-100 p-1 rounded-xl gap-1">
                            <button
                                type="button"
                                onClick={() => setValue('productNature', 'single')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                    selectedNature === 'single'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Package size={14} /> Standard Product
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('productNature', 'variable')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                    selectedNature === 'variable'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Layers size={14} /> Variable (Sizes/Colors)
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('productNature', 'combo')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                    selectedNature === 'combo'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Boxes size={14} /> Combo / Pack
                            </button>
                        </div>
                    </div>

                    {/* 2. Primary Essential Information */}
                    <div className="space-y-4">
                        {/* Product Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                                Product Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Anchor Full Cream Milk Powder 400g"
                                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500 mt-1 font-medium">{errors.name.message}</p>
                            )}
                        </div>

                        {/* Category & Unit of Measure */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Select
                                    label="Category *"
                                    required
                                    options={categoryOptions}
                                    error={errors.categoryId?.message}
                                    {...register('categoryId')}
                                />
                            </div>
                            <div>
                                <Select
                                    label="Unit of Measure (UOM) *"
                                    required
                                    options={uomOptions}
                                    error={errors.unitOfMeasure?.message}
                                    {...register('unitOfMeasure')}
                                />
                            </div>
                        </div>

                        {/* Barcode & SKU with Auto-Generators */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                        Barcode / EAN-13
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutoGenerateBarcode}
                                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Sparkles size={12} /> Auto Generate
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Scan barcode or auto generate"
                                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    {...register('barcode')}
                                />
                                {errors.barcode && (
                                    <p className="text-xs text-red-500 mt-1">{errors.barcode.message}</p>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                        SKU / Item Code
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutoGenerateSku}
                                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Sparkles size={12} /> Auto
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g. ANCH-400G"
                                    className="w-full px-3.5 py-2 text-sm font-mono uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    {...register('sku')}
                                />
                                {errors.sku && (
                                    <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Pricing & Profit Trio Card */}
                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                                    <DollarSign size={14} className="text-blue-600" /> Pricing & Profit
                                </span>
                                {profitMargin !== null && (
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                        profitAmount >= 0
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}>
                                        {profitAmount >= 0 ? `+${profitMargin}% Margin (Rs. ${profitAmount.toFixed(2)})` : `${profitMargin}% Loss`}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Buying / Cost Price (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        {...register('buyingPrice', {
                                            onChange: (e) => {
                                                const buy = parseFloat(e.target.value) || 0;
                                                const profit = parseFloat(watch('profitPercentage')) || 0;
                                                if (profit > 0) {
                                                    const sell = buy * (1 + profit / 100);
                                                    setValue('basePrice', parseFloat(sell.toFixed(2)));
                                                }
                                            }
                                        })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1">
                                        Selling Price (Retail) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 text-sm font-bold text-blue-700 rounded-lg border border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        {...register('basePrice', {
                                            onChange: (e) => {
                                                const sell = parseFloat(e.target.value) || 0;
                                                const buy = parseFloat(watch('buyingPrice')) || 0;
                                                if (buy > 0) {
                                                    const profit = ((sell - buy) / buy) * 100;
                                                    setValue('profitPercentage', parseFloat(profit.toFixed(2)));
                                                }
                                            }
                                        })}
                                    />
                                    {errors.basePrice && (
                                        <p className="text-xs text-red-500 mt-1">{errors.basePrice.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        MRP (Max Retail)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Printed Price"
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        {...register('mrp')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fresh Bakery & Perishable Item Toggle */}
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl">🥖</span>
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-950">
                                            Fresh Bakery / Perishable Item (කල් ඉකුත් වන නැවුම් ආහාර)
                                        </h4>
                                        <p className="text-[11px] text-amber-800">
                                            Enforces daily fresh tracking and prevents selling expired food at the checkout counter.
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                                    {...register('isPerishable')}
                                />
                            </div>

                            {watch('isPerishable') && (
                                <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                    <div>
                                        <label className="block text-xs font-bold text-amber-950 mb-1">
                                            Shelf Life (Days) *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="1 (e.g. 1 day for bread, 2 for cake)"
                                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            {...register('shelfLifeDays')}
                                        />
                                    </div>
                                    <div className="text-[11px] text-amber-900 bg-white/80 p-2.5 rounded-lg border border-amber-200 leading-snug">
                                        ✨ <strong>Daily Fresh Item:</strong> Production date + {watch('shelfLifeDays') || 1} day(s) sets the automated expiry cut-off.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Variable Products Table (Shows only if Variable is selected) */}
                    {selectedNature === 'variable' && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                                    <Layers size={14} /> Product Variations
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendVariation({
                                        name: '',
                                        sku: '',
                                        barcode: '',
                                        purchasePrice: buyingPrice,
                                        price: sellingPrice,
                                        stock: 0
                                    })}
                                >
                                    <Plus size={13} className="mr-1" /> Add Variant
                                </Button>
                            </div>

                            {variationFields.length === 0 ? (
                                <p className="text-xs text-gray-500 py-3 text-center border border-dashed rounded-lg">
                                    Click "+ Add Variant" to add sizes, colors or weights (e.g. Small, Medium, Large).
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {variationFields.map((field, idx) => (
                                        <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200">
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    placeholder="Variant Name (e.g. Red, XL, 500g)"
                                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300"
                                                    {...register(`variations.${idx}.name`)}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    placeholder="Barcode"
                                                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-gray-300"
                                                    {...register(`variations.${idx}.barcode`)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Sell Price"
                                                    className="w-full px-2 py-1.5 text-xs font-semibold rounded border border-gray-300"
                                                    {...register(`variations.${idx}.price`)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    placeholder="Stock"
                                                    className="w-full px-2 py-1.5 text-xs rounded border border-gray-300"
                                                    {...register(`variations.${idx}.stock`)}
                                                />
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeVariation(idx)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. Combo / Bundle Pack Table */}
                    {selectedNature === 'combo' && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                                    <Boxes size={14} /> Included Bundle Items
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendCombo({ productId: '', quantity: 1, priceContribution: 0 })}
                                >
                                    <Plus size={13} className="mr-1" /> Add Product
                                </Button>
                            </div>

                            {comboFields.length === 0 ? (
                                <p className="text-xs text-gray-500 py-3 text-center border border-dashed rounded-lg">
                                    Click "+ Add Product" to choose items that make up this bundle pack.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {comboFields.map((field, idx) => (
                                        <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200">
                                            <div className="col-span-7">
                                                <select
                                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300"
                                                    {...register(`comboItems.${idx}.productId`)}
                                                >
                                                    <option value="">-- Choose Item --</option>
                                                    {(allProductsData?.data || []).map(p => (
                                                        <option key={p._id} value={p._id}>
                                                            {p.name} ({p.sku || p.barcode || 'Item'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qty"
                                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300"
                                                    {...register(`comboItems.${idx}.quantity`)}
                                                />
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeCombo(idx)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5. Collapsible Advanced Section */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition"
                        >
                            <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                ⚙️ Additional Details (Wholesale Tiers, Brand, Stock Alert & Clearance)
                            </span>
                            {showAdvanced ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                        </button>

                        {showAdvanced && (
                            <div className="p-4 bg-white space-y-4 border-t border-gray-200">
                                {/* Brand & Status */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <Select
                                            label="Brand"
                                            options={brandOptions}
                                            {...register('brandId')}
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            label="Short / Bill Print Name"
                                            placeholder="Optional short receipt name"
                                            {...register('shortName')}
                                        />
                                    </div>
                                    <div>
                                        <Select
                                            label="Item Status"
                                            options={[
                                                { value: 'active', label: 'Active (Available)' },
                                                { value: 'inactive', label: 'Inactive (Hidden)' },
                                                { value: 'draft', label: 'Draft' },
                                                { value: 'discontinued', label: 'Discontinued' },
                                            ]}
                                            {...register('status')}
                                        />
                                    </div>
                                </div>

                                {/* Wholesale Tiers */}
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-700">Wholesale Bulk Price Tiers</span>
                                        <button
                                            type="button"
                                            onClick={() => appendTier({ tierName: 'Bulk Tier', minQuantity: 10, maxQuantity: null, price: 0 })}
                                            className="text-xs text-blue-600 font-bold hover:underline"
                                        >
                                            + Add Tier
                                        </button>
                                    </div>
                                    {tierFields.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No wholesale tiers added. (e.g. Buy 10+ for Rs. 450)</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {tierFields.map((field, idx) => (
                                                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
                                                    <div className="col-span-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Tier Label"
                                                            className="w-full px-2 py-1 text-xs border rounded"
                                                            {...register(`tierPricing.${idx}.tierName`)}
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            placeholder="Min Qty"
                                                            className="w-full px-2 py-1 text-xs border rounded"
                                                            {...register(`tierPricing.${idx}.minQuantity`)}
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Special Price"
                                                            className="w-full px-2 py-1 text-xs font-bold border rounded"
                                                            {...register(`tierPricing.${idx}.price`)}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTier(idx)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Stock Alert & Packaging */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <Input
                                        label="Low Stock Alert Qty"
                                        type="number"
                                        min="0"
                                        {...register('reorderLevel')}
                                    />
                                    <Input
                                        label="Minimum Level"
                                        type="number"
                                        min="0"
                                        {...register('minimumLevel')}
                                    />
                                    <Input
                                        label="Units Per Box/Carton"
                                        type="number"
                                        min="1"
                                        {...register('unitsPerCarton')}
                                    />
                                    <Input
                                        label="Min Order Qty"
                                        type="number"
                                        min="1"
                                        {...register('minimumOrderQuantity')}
                                    />
                                </div>

                                {/* Clearance Section */}
                                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Flame size={16} className="text-amber-600" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-950">Special Clearance Sale Item</p>
                                            <p className="text-[11px] text-amber-700">Display as clearance sale item with deep discount in POS.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                                        {...register('isClearance')}
                                    />
                                </div>
                                {watch('isClearance') && (
                                    <div className="w-48">
                                        <Input
                                            label="Clearance Price (Rs.) *"
                                            type="number"
                                            step="0.01"
                                            {...register('clearancePrice')}
                                        />
                                    </div>
                                )}

                                {/* Description */}
                                <Textarea
                                    label="Product Description / Specification"
                                    rows={2}
                                    placeholder="Optional notes or details for sales reps and staff"
                                    {...register('description')}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Always-visible Modal Footer */}
                <div className="flex justify-end gap-2.5 px-6 py-3.5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={isLoading}
                        className="px-6 font-bold"
                    >
                        <Check size={16} className="mr-1.5" />
                        {isEdit ? 'Update Product' : 'Save Product'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
