import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Save, X,
    Package, AlertCircle, UserPlus, PackagePlus, CreditCard,
    CheckCircle, ArrowLeft, LayoutGrid, List, Landmark, Banknote, FileText, Ticket,
    PauseCircle, PlayCircle, Layers, Sparkles, Scale, Barcode
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parseWeighingScaleBarcode, findScaleProduct } from '../utils/weighingScaleBarcode';
import { SRI_LANKA_BANK_PROMOS, calculateBankDiscount } from '../utils/bankPromotions';
import BarcodePrintModal from '../features/products/BarcodePrintModal';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { stockApi } from '../features/stock/stockApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCategories } from '../features/products/useProducts';
import { useCreateSalesOrder } from '../features/salesOrders/useSalesOrders';
import { useCreateCustomer } from '../features/customers/useCustomers';
import QuickCreateCustomerModal from '../features/customers/QuickCreateCustomerModal';
import { posSessionsApi } from '../features/posSessions/posSessionsApi';
import PosSessionModal from '../features/posSessions/PosSessionModal';
import CloseRegisterModal from '../features/posSessions/CloseRegisterModal';
import ThermalReceipt from '../components/print/ThermalReceipt';
import api from '../api/axios';
import { useCompanySettings } from '../features/settings/useSettings';
import { settingsApi } from '../features/settings/settingsApi';
import { couponsApi } from '../features/coupons/couponsApi';

import { useAuthStore } from '../store/authStore';
import { useMobile } from '../hooks/useMobile';

export default function PosPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const createOrder = useCreateSalesOrder();
    const isMobile = useMobile();
    const [showCartOnMobile, setShowCartOnMobile] = useState(false);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('posViewMode') || 'grid');

    const toggleViewMode = (mode) => {
        setViewMode(mode);
        localStorage.setItem('posViewMode', mode);
    };

    // Pre-fetch settings for receipt
    useCompanySettings();

    // Cart state
    const [customerId, setCustomerId] = useState('');
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [cart, setCart] = useState([]); // [{ productId, name, code, price, qty, available, taxRate, taxable }]
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [phoneSearch, setPhoneSearch] = useState('');
    const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);
    const [orderDiscountAmount, setOrderDiscountAmount] = useState(0);
    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const createCustomer = useCreateCustomer();

    // Modals
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isCloseRegisterModalOpen, setIsCloseRegisterModalOpen] = useState(false);
    const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
    const [calculatorCashReceived, setCalculatorCashReceived] = useState('');
    const [calculatorChangeReturned, setCalculatorChangeReturned] = useState(0);
    const [posPaymentMethod, setPosPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'bank_transfer' | 'cheque'
    const [posBankAccountId, setPosBankAccountId] = useState('');
    const [posTransactionRef, setPosTransactionRef] = useState('');
    const [posBankName, setPosBankName] = useState('');
    const [posChequeNumber, setPosChequeNumber] = useState('');
    const [posChequeDate, setPosChequeDate] = useState(new Date().toISOString().split('T')[0]);
    const [isBarcodePrintOpen, setIsBarcodePrintOpen] = useState(false);

    // Parked / Held Carts
    const [heldCarts, setHeldCarts] = useState(() => {
        try {
            const saved = localStorage.getItem('asip_held_pos_carts');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem('asip_held_pos_carts', JSON.stringify(heldCarts));
        } catch (e) {
            console.error('Failed to persist held carts:', e);
        }
    }, [heldCarts]);

    // Bank Card Promotions
    const [selectedBankPromo, setSelectedBankPromo] = useState(null);

    // Split Payment State
    const [splitCash, setSplitCash] = useState('');
    const [splitCard, setSplitCard] = useState('');
    const [splitBank, setSplitBank] = useState('');
    const [splitCardRef, setSplitCardRef] = useState('');
    const [splitBankRef, setSplitBankRef] = useState('');

    // Direct Printing
    const [recentInvoice, setRecentInvoice] = useState(null);
    const [paymentForPrint, setPaymentForPrint] = useState([]);

    // Data
    const { data: activeSessionData, isLoading: isLoadingSession } = useQuery({
        queryKey: ['pos-sessions', 'active'],
        queryFn: posSessionsApi.getActive,
        retry: false
    });
    const activeSession = activeSessionData?.data;
    const { data: bankAccountsData } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => (await api.get('/bank-accounts')).data
    });
    const bankAccounts = bankAccountsData?.data || [];
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', 'pos'],
        queryFn: () => productsApi.list({ status: 'active', canBeSold: true, limit: 500 }),
    });
    const { data: categoriesData } = useCategories({ isActive: 'true' });
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'pos', sourceWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: sourceWarehouseId, limit: 500 }),
        enabled: !!sourceWarehouseId,
    });

    const warehouses = warehousesData?.data || [];
    const customers = customersData?.data || [];
    const products = (productsData?.data || []).filter((p) => p.canBeSold !== false);
    const categories = categoriesData?.data || [];
    const stockItems = stockData?.data || [];

    // Set default warehouse
    useEffect(() => {
        if (!sourceWarehouseId && warehouses.length > 0) {
            const assignedVan = warehouses.find((w) => w.assignedRep === user?._id || w.assignedRep?._id === user?._id);
            const def = assignedVan || warehouses.find((w) => w.isDefault) || warehouses[0];
            if (def) setSourceWarehouseId(def._id);
        }
    }, [warehouses, sourceWarehouseId, user]);

    // Removed auto-select walk-in logic per user request

    // Build stock map
    const stockMap = useMemo(() => {
        const map = new Map();
        stockItems.forEach((s) => {
            const pid = s.productId?._id || s.productId;
            const existing = map.get(pid) || { onHand: 0, reserved: 0 };
            existing.onHand += s.quantities?.onHand || 0;
            existing.reserved += s.quantities?.reserved || 0;
            map.set(pid, existing);
        });
        return map;
    }, [stockItems]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (activeCategory === 'clearance') {
            result = result.filter((p) => p.isClearance);
        } else if (activeCategory !== 'all') {
            result = result.filter((p) => (p.categoryId?._id || p.categoryId) === activeCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q)
                || p.productCode?.toLowerCase().includes(q)
                || p.barcode?.toLowerCase().includes(q)
            );
        }
        return result.slice(0, 60); // limit display
    }, [products, activeCategory, searchQuery]);

    const customerSuggestions = useMemo(() => {
        if ((!customerSearch && !phoneSearch) || customerId) return [];
        const q = customerSearch.toLowerCase();
        const ph = phoneSearch.toLowerCase();
        return customers.filter(c => {
            if (customerSearch) return (
                c.displayName?.toLowerCase().includes(q) ||
                c.primaryContact?.phone?.includes(q) ||
                c.customerCode?.toLowerCase().includes(q)
            );
            if (phoneSearch) return c.primaryContact?.phone?.includes(ph);
            return false;
        }).slice(0, 5);
    }, [customerSearch, phoneSearch, customers, customerId]);

    const phoneSuggestions = useMemo(() => {
        if (!phoneSearch || customerId) return [];
        const ph = phoneSearch.toLowerCase();
        return customers.filter(c => c.primaryContact?.phone?.includes(ph)).slice(0, 5);
    }, [phoneSearch, customers, customerId]);

    // Helper: get tier price for product at given quantity
    const getTierPrice = (product, qty) => {
        if (!product.tierPricing || product.tierPricing.length === 0) return product.basePrice;
        const tiers = [...product.tierPricing].sort((a, b) => (b.minQuantity || 0) - (a.minQuantity || 0));
        for (const tier of tiers) {
            if (qty >= (tier.minQuantity || 0)) {
                const maxOk = !tier.maxQuantity || qty <= tier.maxQuantity;
                if (maxOk && tier.price > 0) return tier.price;
            }
        }
        return product.basePrice;
    };

    const selectedCustomer = customers.find((c) => c._id === customerId);
    const customerOptions = customers.map((c) => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode})`,
    }));

    // Helper: get product price considering clearance or tier price
    const getProductPrice = (product, qty) => {
        if (product.isClearance && product.clearancePrice > 0) {
            return product.clearancePrice;
        }
        return getTierPrice(product, qty);
    };

    // Item-level discount state
    const [editingDiscountId, setEditingDiscountId] = useState(null);

    const setItemDiscount = (productId, discountType, discountValue) => {
        setCart((prev) => prev.map((item) => {
            if (item.productId !== productId) return item;
            return {
                ...item,
                discountType: discountType || 'percent',
                discountValue: Math.max(0, +discountValue || 0),
            };
        }));
    };

    // Cart actions
    const addToCart = (product, customQty = 1, customPrice = null) => {
        const stock = stockMap.get(product._id);
        const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;

        if (available <= 0) {
            toast.error(`${product.name} is out of stock at this warehouse`);
            return;
        }

        // Fresh Bakery / Perishable Expiry Check
        if (product.isPerishable && product.expiryDate) {
            const exp = new Date(product.expiryDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (exp < today) {
                toast.error(`⚠️ Cannot sell expired item: ${product.name} (Expired on ${exp.toLocaleDateString()})`);
                return;
            }
        }

        const addQty = typeof customQty === 'number' && customQty > 0 ? customQty : 1;

        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                const newQty = parseFloat((existing.qty + addQty).toFixed(3));
                if (newQty > available) {
                    toast.error(`Only ${available} available (attempted ${newQty})`);
                    return prev;
                }
                const unitPrice = getProductPrice(product, newQty);
                let price = unitPrice;
                if (selectedCustomer?.defaultDiscountPercent && !product.isClearance) {
                    price = price * (1 - selectedCustomer.defaultDiscountPercent / 100);
                }
                return prev.map((i) => i.productId === product._id
                    ? { ...i, qty: newQty, price: +price.toFixed(2), tierPricing: product.tierPricing } : i);
            }

            const initialPrice = getProductPrice(product, addQty);
            let price = initialPrice;
            if (selectedCustomer?.defaultDiscountPercent && !product.isClearance) {
                price = price * (1 - selectedCustomer.defaultDiscountPercent / 100);
            }

            return [...prev, {
                productId: product._id,
                name: product.name,
                code: product.productCode,
                price: customPrice ? +(customPrice / addQty).toFixed(2) : +price.toFixed(2),
                qty: addQty,
                available,
                unitOfMeasure: product.unitOfMeasure,
                tierPricing: product.tierPricing || [],
                basePrice: product.basePrice,
                isClearance: !!product.isClearance,
                clearancePrice: product.clearancePrice || 0,
                isPerishable: !!product.isPerishable,
                shelfLifeDays: product.shelfLifeDays || 1,
                isWeighed: addQty !== Math.floor(addQty) || product.unitOfMeasure === 'kg',
                discountType: 'percent',
                discountValue: 0,
            }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = i.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            // Recalculate price on qty change
            const newPrice = i.isClearance && i.clearancePrice > 0
                ? i.clearancePrice
                : getTierPrice({ basePrice: i.basePrice || i.price, tierPricing: i.tierPricing || [] }, newQty);
            let finalPrice = newPrice;
            if (selectedCustomer?.defaultDiscountPercent && !i.isClearance) {
                finalPrice = finalPrice * (1 - selectedCustomer.defaultDiscountPercent / 100);
            }
            return { ...i, qty: newQty, price: +finalPrice.toFixed(2) };
        }).filter(Boolean));
    };

    const setQty = (productId, qty) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = Math.max(0, +qty || 0);
            if (newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            // Recalculate price on qty change
            const newPrice = i.isClearance && i.clearancePrice > 0
                ? i.clearancePrice
                : getTierPrice({ basePrice: i.basePrice || i.price, tierPricing: i.tierPricing || [] }, newQty);
            let finalPrice = newPrice;
            if (selectedCustomer?.defaultDiscountPercent && !i.isClearance) {
                finalPrice = finalPrice * (1 - selectedCustomer.defaultDiscountPercent / 100);
            }
            return { ...i, qty: newQty, price: +finalPrice.toFixed(2) };
        }).filter((i) => i.qty > 0));
    };

    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
    };

    const clearCart = (silent = false) => {
        if (cart.length === 0) return;
        if (silent || window.confirm('Clear all items from active cart?')) {
            setCart([]);
            setOrderDiscountPercent(0);
            setOrderDiscountAmount(0);
            setPointsToRedeem(0);
            setAppliedCoupon(null);
            setSelectedBankPromo(null);
            setCustomerSearch('');
            setCustomerId('');
            setCustomerPhone('');
            setPhoneSearch('');
        }
    };

    // Hold / Resume Cart (Park Sale)
    const holdCurrentCart = () => {
        if (cart.length === 0) {
            toast.error('Cannot hold an empty cart');
            return;
        }

        const newHeld = {
            id: `HOLD_${Date.now()}`,
            createdAt: new Date().toISOString(),
            timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            customerName: selectedCustomer ? selectedCustomer.displayName : (customerSearch || 'Walking Customer'),
            customerId,
            customerSearch,
            customerPhone,
            phoneSearch,
            cart: [...cart],
            orderDiscountPercent,
            orderDiscountAmount,
            pointsToRedeem,
            appliedCoupon,
            selectedBankPromo,
            grandTotal: totals.grandTotal,
            itemCount: cart.reduce((s, i) => s + i.qty, 0),
        };

        setHeldCarts(prev => [newHeld, ...prev]);
        clearCart(true);
        toast.success(`⏸️ Sale parked: Bill for "${newHeld.customerName}" held! (${heldCarts.length + 1} parked)`);
    };

    const resumeHeldCart = (heldId) => {
        const item = heldCarts.find(h => h.id === heldId);
        if (!item) return;

        // If active cart has items, park current first
        if (cart.length > 0) {
            holdCurrentCart();
        }

        setCart(item.cart || []);
        setCustomerId(item.customerId || '');
        setCustomerSearch(item.customerSearch || '');
        setCustomerPhone(item.customerPhone || '');
        setPhoneSearch(item.phoneSearch || '');
        setOrderDiscountPercent(item.orderDiscountPercent || 0);
        setOrderDiscountAmount(item.orderDiscountAmount || 0);
        setPointsToRedeem(item.pointsToRedeem || 0);
        setAppliedCoupon(item.appliedCoupon || null);
        setSelectedBankPromo(item.selectedBankPromo || null);

        setHeldCarts(prev => prev.filter(h => h.id !== heldId));
        setIsHeldModalOpen(false);
        toast.success(`▶️ Resumed bill for ${item.customerName}`);
    };

    const discardHeldCart = (heldId) => {
        setHeldCarts(prev => prev.filter(h => h.id !== heldId));
        toast.success('🗑️ Parked bill removed');
    };

    // Barcode scanner & weighing scale parsing on Enter
    const handleBarcodeOrSearchEnter = (e) => {
        if (e.key !== 'Enter') return;
        const query = searchQuery.trim();
        if (!query) return;

        // 1. Check if Weighing Scale Barcode (DIGI / Mettler Toledo / CAS: starts with 20, 21, 22, 02)
        const scaleData = parseWeighingScaleBarcode(query);
        if (scaleData) {
            const product = findScaleProduct(products, scaleData);
            if (product) {
                if (scaleData.type === 'weight') {
                    addToCart(product, scaleData.weightKg);
                    toast.success(`⚖️ Weighed Item: ${product.name} (${scaleData.weightKg} kg) added`);
                } else if (scaleData.type === 'price') {
                    const unitPrice = product.basePrice || 1;
                    const calculatedWeight = parseFloat((scaleData.price / unitPrice).toFixed(3));
                    addToCart(product, calculatedWeight, scaleData.price);
                    toast.success(`⚖️ Weighed Item: ${product.name} (Rs. ${scaleData.price.toFixed(2)}) added`);
                }
                setSearchQuery('');
                return;
            } else {
                toast.error(`⚖️ Scale product not found for code: ${scaleData.itemCodes[0]}`);
                return;
            }
        }

        // 2. Check exact barcode / SKU / productCode match
        const exactMatch = products.find(p =>
            p.barcode?.trim() === query ||
            p.sku?.trim().toLowerCase() === query.toLowerCase() ||
            p.productCode?.trim().toLowerCase() === query.toLowerCase()
        );

        if (exactMatch) {
            addToCart(exactMatch, 1);
            toast.success(`Scanned: ${exactMatch.name}`);
            setSearchQuery('');
            return;
        }

        // 3. If there is exactly 1 match in currently filtered items, add it
        if (filteredProducts.length === 1) {
            addToCart(filteredProducts[0], 1);
            toast.success(`Added: ${filteredProducts[0].name}`);
            setSearchQuery('');
            return;
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCodeInput.trim()) {
            toast.error('Enter a coupon code');
            return;
        }
        setIsValidatingCoupon(true);
        try {
            const currentSubtotal = totals.subtotal - totals.itemsDiscountTotal;
            const res = await couponsApi.validate({
                code: couponCodeInput.trim(),
                customerId: customerId || undefined,
                cartTotal: currentSubtotal,
            });
            if (res.valid && res.data) {
                setAppliedCoupon(res.data);
                toast.success(`Coupon "${res.data.code}" applied!`);
                setCouponCodeInput('');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Invalid coupon code');
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        toast.success('Coupon removed');
    };

    // Totals
    const totals = useMemo(() => {
        let itemsSubtotal = 0;
        let itemsDiscountTotal = 0;

        cart.forEach((item) => {
            const lineSub = item.qty * item.price;
            let lineDisc = 0;
            if (item.discountValue > 0) {
                if (item.discountType === 'amount') {
                    lineDisc = Math.min(lineSub, +item.discountValue || 0);
                } else {
                    lineDisc = +(lineSub * (+item.discountValue || 0) / 100).toFixed(2);
                }
            }
            itemsSubtotal += lineSub;
            itemsDiscountTotal += lineDisc;
        });

        const netAfterItems = Math.max(0, itemsSubtotal - itemsDiscountTotal);
        const orderDiscPercentAmount = +(netAfterItems * (+orderDiscountPercent || 0) / 100).toFixed(2);
        const orderDiscFixed = +orderDiscountAmount || 0;
        const orderDiscount = orderDiscPercentAmount + orderDiscFixed;
        const netBeforeCoupon = Math.max(0, netAfterItems - orderDiscount);

        // Coupon calculation
        let couponDiscountAmount = 0;
        if (appliedCoupon) {
            if (appliedCoupon.type === 'percentage') {
                couponDiscountAmount = (netAfterItems * appliedCoupon.value) / 100;
                if (appliedCoupon.maxDiscountAmount && couponDiscountAmount > appliedCoupon.maxDiscountAmount) {
                    couponDiscountAmount = appliedCoupon.maxDiscountAmount;
                }
            } else {
                couponDiscountAmount = Math.min(netBeforeCoupon, appliedCoupon.value);
            }
            couponDiscountAmount = Math.min(netBeforeCoupon, Math.round(couponDiscountAmount * 100) / 100);
        }

        const netBeforePromo = Math.max(0, netBeforeCoupon - couponDiscountAmount);

        // Bank Card Promotion discount
        let bankDiscountAmount = 0;
        if (selectedBankPromo) {
            bankDiscountAmount = calculateBankDiscount(selectedBankPromo, netBeforePromo);
        }
        const netBeforeLoyalty = Math.max(0, netBeforePromo - bankDiscountAmount);

        // Loyalty points calculation (1 pt = Rs. 1)
        const availablePoints = selectedCustomer?.loyalty?.points || 0;
        const maxRedeemablePoints = Math.min(availablePoints, Math.floor(netBeforeLoyalty));
        const effectiveRedeemedPoints = Math.min(maxRedeemablePoints, Math.max(0, +pointsToRedeem || 0));
        const loyaltyDiscountAmount = effectiveRedeemedPoints * 1;

        const totalDiscount = itemsDiscountTotal + orderDiscount + couponDiscountAmount + bankDiscountAmount + loyaltyDiscountAmount;
        const grandTotal = Math.max(0, itemsSubtotal - totalDiscount);
        const loyaltyPointsEarned = Math.floor(grandTotal / 100); // 1 pt per 100 LKR spent

        return {
            subtotal: +itemsSubtotal.toFixed(2),
            itemsDiscountTotal: +itemsDiscountTotal.toFixed(2),
            orderDiscount: +orderDiscount.toFixed(2),
            couponDiscountAmount: +couponDiscountAmount.toFixed(2),
            bankDiscountAmount: +bankDiscountAmount.toFixed(2),
            loyaltyDiscountAmount: +loyaltyDiscountAmount.toFixed(2),
            loyaltyPointsRedeemed: effectiveRedeemedPoints,
            loyaltyPointsEarned,
            availablePoints,
            maxRedeemablePoints,
            totalDiscount: +totalDiscount.toFixed(2),
            grandTotal: +grandTotal.toFixed(2),
            itemCount: cart.reduce((s, i) => s + i.qty, 0),
        };
    }, [cart, orderDiscountPercent, orderDiscountAmount, pointsToRedeem, selectedCustomer, appliedCoupon, selectedBankPromo]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const handleCheckout = async (saveAsDraft = false, paymentInfo = null) => {
        let finalCustomerId = customerId;

        // Auto-add customer if not selected but name typed
        if (!finalCustomerId && customerSearch) {
            try {
                const newCust = await createCustomer.mutateAsync({
                    displayName: customerSearch,
                    primaryContact: {
                        name: customerSearch,
                        phone: customerPhone || undefined
                    },
                    customerType: 'individual',
                    status: 'active'
                });
                finalCustomerId = newCust.data._id;
            } catch (err) {
                console.error('Auto-create customer error:', err);
                toast.error(err.response?.data?.message || err.message || 'Failed to auto-create customer');
                return;
            }
        }

        if (!finalCustomerId) { toast.error('Select or type a customer'); return; }
        if (!sourceWarehouseId) { toast.error('Select a warehouse'); return; }
        if (cart.length === 0) { toast.error('Cart is empty'); return; }
        if (!activeSession) { toast.error('You must open the cash register first'); setIsSessionModalOpen(true); return; }

        if (!saveAsDraft && paymentInfo === null) {
            setCalculatorCashReceived(totals.grandTotal.toString());
            setCalculatorChangeReturned(0);
            setIsCalculatorModalOpen(true);
            return;
        }

        const isCash = !paymentInfo || paymentInfo.method === 'cash';
        const cashAmt = isCash ? (paymentInfo?.cashReceived || totals.grandTotal) : totals.grandTotal;
        const changeAmt = isCash ? (paymentInfo?.changeReturned || 0) : 0;

        const payload = {
            customerId: finalCustomerId,
            sourceWarehouseId,
            source: 'pos',
            items: cart.map((i) => {
                const lineSub = i.qty * i.price;
                let lineDisc = 0;
                let discPct = 0;
                if (i.discountValue > 0) {
                    if (i.discountType === 'amount') {
                        lineDisc = Math.min(lineSub, +i.discountValue || 0);
                        discPct = lineSub > 0 ? +((lineDisc / lineSub) * 100).toFixed(2) : 0;
                    } else {
                        discPct = +i.discountValue || 0;
                        lineDisc = +(lineSub * discPct / 100).toFixed(2);
                    }
                }
                return {
                    productId: i.productId,
                    orderedQuantity: i.qty,
                    unitPrice: i.price,
                    discountPercent: discPct,
                    discountAmount: lineDisc,
                };
            }),
            orderDiscount: (totals.orderDiscount > 0 || totals.bankDiscountAmount > 0)
                ? { type: 'fixed', value: +(totals.orderDiscount + (totals.bankDiscountAmount || 0)).toFixed(2) }
                : undefined,
            bankPromo: selectedBankPromo ? {
                bankId: selectedBankPromo.id,
                bankName: selectedBankPromo.bankName,
                discountPercent: selectedBankPromo.discountPercent,
                discountAmount: totals.bankDiscountAmount || 0,
            } : undefined,
            splitPayments: paymentInfo?.method === 'split' ? paymentInfo.splitPayments : undefined,
            coupon: appliedCoupon ? {
                code: appliedCoupon.code,
                type: appliedCoupon.type,
                value: appliedCoupon.value,
                discountAmount: totals.couponDiscountAmount,
            } : undefined,
            loyaltyDiscount: totals.loyaltyPointsRedeemed > 0 ? {
                pointsRedeemed: totals.loyaltyPointsRedeemed,
                discountAmount: totals.loyaltyDiscountAmount,
            } : undefined,
            loyaltyPointsEarned: totals.loyaltyPointsEarned,
            status: saveAsDraft ? 'draft' : 'approved',
            paymentMethod: saveAsDraft ? undefined : (paymentInfo?.method || 'cash'),
            cashReceived: saveAsDraft ? undefined : cashAmt,
            changeReturned: saveAsDraft ? undefined : changeAmt,
            transactionReference: saveAsDraft ? undefined : paymentInfo?.transactionReference,
            bankName: saveAsDraft ? undefined : paymentInfo?.bankName,
            chequeNumber: saveAsDraft ? undefined : paymentInfo?.chequeNumber,
            chequeDate: saveAsDraft ? undefined : paymentInfo?.chequeDate,
            bankAccountId: saveAsDraft ? undefined : paymentInfo?.bankAccountId,
        };

        try {
            const result = await createOrder.mutateAsync(payload);
            if (saveAsDraft) {
                toast.success('Order saved as draft');
                navigate(`/sales-orders/${result.data._id}`);
            } else {
                let fetchedInvoiceId = result.invoiceId || result.data?.invoiceId || null;
                if (!fetchedInvoiceId) {
                    try {
                        const invoicesRes = await api.get('/invoices', { params: { salesOrderId: result.data._id } });
                        if (invoicesRes.data?.data?.length > 0) {
                            fetchedInvoiceId = invoicesRes.data.data[0]._id;
                        }
                    } catch (err) {
                        console.error('Could not fetch invoice as fallback', err);
                    }
                }

                toast.success('Sale complete! Invoice generated.');
                setCart([]);
                setCustomerId('');
                setCustomerSearch('');
                setCustomerPhone('');
                setOrderDiscountPercent(0);
                setOrderDiscountAmount(0);
                setPointsToRedeem(0);
                setAppliedCoupon(null);
                setSelectedBankPromo(null);
                setCouponCodeInput('');

                // Navigate to receipt page - auto-triggers print dialog
                if (fetchedInvoiceId) {
                    navigate(`/receipt/${fetchedInvoiceId}`);
                }
            }
        } catch (err) {
            console.error('Checkout failed:', err);
            toast.error(err.response?.data?.message || err.message || 'Checkout failed');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 -m-4 md:-m-6">
            {/* Top bar */}
            <div className="bg-white border-b px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate('/sales-orders')}>
                            <ArrowLeft size={14} className="mr-1" /> Back
                        </Button>
                        <h1 className="font-bold text-lg flex items-center gap-2 md:hidden">
                            <ShoppingCart size={20} /> POS
                        </h1>
                    </div>
                    {/* Mobile Register Open/Close button */}
                    <div className="flex md:hidden gap-2">
                        {activeSession ? (
                            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 text-xs py-1.5 px-2.5 h-[36px]" onClick={() => setIsCloseRegisterModalOpen(true)}>
                                Close Reg
                            </Button>
                        ) : (
                            <Button variant="primary" size="sm" className="text-xs py-1.5 px-2.5 h-[36px]" onClick={() => setIsSessionModalOpen(true)}>
                                Open Reg
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center w-full">
                    {/* Customer & Phone section */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 relative">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Customer Name..."
                                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none border-gray-200 shadow-sm transition-all"
                                value={customerId ? selectedCustomer?.displayName : customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setCustomerId('');
                                }}
                            />
                            {(customerId || customerSearch) && (
                                <button
                                    onClick={() => { setCustomerId(''); setCustomerSearch(''); setCustomerPhone(''); setPhoneSearch(''); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <X size={14} />
                                </button>
                            )}

                            {customerSearch && !customerId && customerSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="p-2 text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-50 border-b">Suggested Customers</div>
                                    {customerSuggestions.map(c => (
                                        <button
                                            key={c._id}
                                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 transition-colors border-b last:border-0 flex flex-col"
                                            onClick={() => {
                                                setCustomerId(c._id);
                                                setCustomerSearch('');
                                                setCustomerPhone('');
                                            }}
                                        >
                                            <span className="font-bold text-gray-800">{c.displayName}</span>
                                            <span className="text-[10px] text-gray-500 flex items-center gap-2">
                                                {c.customerCode} • {c.primaryContact?.phone || 'No phone'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="flex-1 sm:w-40 relative">
                                <input
                                    type="text"
                                    placeholder="Phone No (Enter to match)..."
                                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none border-gray-200 shadow-sm transition-all"
                                    value={customerId ? (selectedCustomer?.primaryContact?.phone || '') : phoneSearch || customerPhone}
                                    onChange={(e) => {
                                        if (!customerId) {
                                            setPhoneSearch(e.target.value);
                                            setCustomerPhone(e.target.value);
                                            setCustomerId('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const found = phoneSuggestions[0] || customers.find(c => c.primaryContact?.phone?.includes(phoneSearch.trim()));
                                            if (found) {
                                                setCustomerId(found._id);
                                                setCustomerSearch('');
                                                setPhoneSearch('');
                                                setCustomerPhone('');
                                                toast.success(`⭐ Loyalty Member: ${found.displayName} (${found.loyalty?.points || 0} pts)`);
                                            }
                                        }
                                    }}
                                    readOnly={!!customerId}
                                />
                                {phoneSearch && !customerId && phoneSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200" style={{minWidth:'220px'}}>
                                        <div className="p-2 text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-50 border-b">By Phone</div>
                                        {phoneSuggestions.map(c => (
                                            <button
                                                key={c._id}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 transition-colors border-b last:border-0 flex flex-col"
                                                onClick={() => {
                                                    setCustomerId(c._id);
                                                    setCustomerSearch('');
                                                    setPhoneSearch('');
                                                    setCustomerPhone('');
                                                }}
                                            >
                                                <span className="font-bold text-gray-800">{c.displayName}</span>
                                                <span className="text-[10px] text-gray-500">{c.primaryContact?.phone} • {c.customerCode}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(true)} title={selectedCustomer ? "Edit Customer" : "Advanced Add"} className="h-[42px] px-3 shrink-0">
                                <UserPlus size={16} className={selectedCustomer ? "text-blue-600" : ""} />
                            </Button>
                        </div>
                    </div>

                    <div className="w-full lg:w-56">
                        <Select placeholder="Warehouse"
                            options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                            value={sourceWarehouseId} onChange={(e) => { setSourceWarehouseId(e.target.value); setCart([]); }} />
                    </div>

                    {selectedCustomer && (
                        <div className="text-xs text-gray-600 self-start lg:self-center shrink-0 flex items-center gap-2.5">
                            <div className="bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-2 shadow-2xs">
                                <span className="text-sm">⭐</span>
                                <div>
                                    <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider block leading-none">Loyalty</span>
                                    <p className="font-black text-amber-950 text-xs leading-tight">
                                        {selectedCustomer.loyalty?.points || 0} pts
                                        <span className="text-[10px] font-semibold text-amber-700 ml-1 uppercase">
                                            ({selectedCustomer.loyalty?.tier || 'bronze'})
                                        </span>
                                    </p>
                                </div>
                                {totals.maxRedeemablePoints > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (pointsToRedeem > 0) {
                                                setPointsToRedeem(0);
                                                toast.success('Points discount removed');
                                            } else {
                                                setPointsToRedeem(totals.maxRedeemablePoints);
                                                toast.success(`⚡ Redeemed ${totals.maxRedeemablePoints} points! (-${fmt(totals.maxRedeemablePoints)})`);
                                            }
                                        }}
                                        className={`text-[10px] font-extrabold px-2 py-1 rounded-md transition border shadow-xs ml-1 ${
                                            pointsToRedeem > 0
                                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 active:scale-95'
                                        }`}
                                    >
                                        {pointsToRedeem > 0 ? `Redeemed (-${fmt(pointsToRedeem)}) ✓` : `⚡ Redeem All`}
                                    </button>
                                )}
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">Credit: <span className="font-semibold text-gray-800">{fmt(selectedCustomer.creditStatus?.availableCredit || 0)}</span></p>
                                {selectedCustomer.creditStatus?.onCreditHold && (
                                    <Badge variant="danger" className="text-[9px] px-1 py-0">On Credit Hold</Badge>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-2 shrink-0">
                    <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setIsBarcodePrintOpen(true)} title="Print Barcode Stickers">
                        <Barcode size={16} className="mr-1" /> Barcodes
                    </Button>
                    {activeSession ? (
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setIsCloseRegisterModalOpen(true)}>
                            Close Register
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={() => setIsSessionModalOpen(true)}>
                            Open Register
                        </Button>
                    )}
                    <h1 className="font-bold text-lg items-center gap-2 flex ml-4">
                        <ShoppingCart size={20} /> POS
                    </h1>
                </div>
            </div>

            {/* Main 2-column layout */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Backdrop for mobile cart drawer */}
                {showCartOnMobile && (
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-300 lg:hidden"
                        onClick={() => setShowCartOnMobile(false)}
                    />
                )}

                {/* Left: Product catalog */}
                <div className="flex-1 flex flex-col bg-gray-50 p-4 overflow-hidden flex">
                    {/* Search */}
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products or scan barcode / weighing scale (20xxxx)..."
                                className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none border-gray-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleBarcodeOrSearchEnter}
                            />
                        </div>
                        {/* View toggle */}
                        <div className="flex bg-gray-150 border border-gray-200 rounded-lg p-0.5 shrink-0 bg-white">
                            <button
                                type="button"
                                onClick={() => toggleViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-1 mb-3 overflow-x-auto pb-1 no-scrollbar">
                        <button onClick={() => setActiveCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap font-medium ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-100'
                                }`}>
                            All
                        </button>
                        <button onClick={() => setActiveCategory('clearance')}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap font-medium flex items-center gap-1.5 transition ${activeCategory === 'clearance' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                }`}>
                            🔥 Clearance Sale
                        </button>
                        {categories.map((c) => (
                            <button key={c._id} onClick={() => setActiveCategory(c._id)}
                                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap font-medium ${activeCategory === c._id ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-100'
                                    }`}>
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Product Catalog */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                                <p>No products found</p>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="flex flex-col gap-2">
                                {filteredProducts.map((p) => {
                                    const stock = stockMap.get(p._id);
                                    const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;
                                    const inCart = cart.find((i) => i.productId === p._id)?.qty || 0;
                                    const outOfStock = available <= 0;

                                    return (
                                        <button
                                            key={p._id}
                                            onClick={() => addToCart(p)}
                                            disabled={outOfStock}
                                            className={`text-left bg-white border rounded-xl p-3 flex items-center justify-between transition-all ${outOfStock
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:shadow-md hover:border-gray-300 active:scale-[0.99]'
                                                } ${inCart > 0 ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500' : ''}`}
                                        >
                                            <div className="min-w-0 flex-1 pr-4">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-sm text-gray-800 truncate">{p.name}</span>
                                                    {p.isClearance && (
                                                        <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-0.5 border border-rose-200">
                                                            🔥 CLEARANCE
                                                        </span>
                                                    )}
                                                    {p.isPerishable && (
                                                        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 border border-amber-300">
                                                            🥖 FRESH ({p.shelfLifeDays || 1}d)
                                                        </span>
                                                    )}
                                                    {inCart > 0 && (
                                                        <Badge variant="primary" className="px-1.5 py-0 text-[10px] font-bold">
                                                            {inCart} in cart
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-600">{p.productCode}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        Stock: 
                                                        <span className={`font-bold ${available <= 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                                                            {available} {p.unitOfMeasure || 'pcs'}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {p.isClearance && p.clearancePrice > 0 ? (
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-rose-600">{fmt(p.clearancePrice)}</p>
                                                        <p className="text-[10px] text-gray-400 line-through font-medium leading-none">{fmt(p.basePrice)}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-black text-primary-600">{fmt(p.basePrice)}</p>
                                                )}
                                                <Badge variant={outOfStock ? 'danger' : available <= 5 ? 'warning' : 'success'} className="px-2 py-0.5 text-xs font-semibold">
                                                    {outOfStock ? 'Out of Stock' : 'Available'}
                                                </Badge>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredProducts.map((p) => {
                                    const stock = stockMap.get(p._id);
                                    const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;
                                    const inCart = cart.find((i) => i.productId === p._id)?.qty || 0;
                                    const outOfStock = available <= 0;

                                    return (
                                        <button
                                            key={p._id}
                                            onClick={() => addToCart(p)}
                                            disabled={outOfStock}
                                            className={`relative text-left bg-white border rounded-xl p-3 flex flex-col justify-between transition-all min-h-[96px] ${outOfStock
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:shadow-md active:scale-95 hover:border-primary-300'
                                                } ${inCart > 0 ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500' : ''}`}>
                                            <div>
                                                {p.isClearance && (
                                                    <div className="mb-1">
                                                        <span className="bg-rose-100 text-rose-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-rose-200 inline-flex items-center gap-0.5">
                                                            🔥 CLEARANCE
                                                        </span>
                                                    </div>
                                                )}
                                                {p.isPerishable && (
                                                    <div className="mb-1">
                                                        <span className="bg-amber-100 text-amber-900 font-bold text-[9px] px-1.5 py-0.5 rounded-md border border-amber-300 inline-flex items-center gap-0.5">
                                                            🥖 FRESH ({p.shelfLifeDays || 1}d)
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-xs font-bold text-gray-800 line-clamp-2 mb-0.5 leading-snug">{p.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{p.productCode}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                                {p.isClearance && p.clearancePrice > 0 ? (
                                                    <div>
                                                        <p className="text-xs font-black text-rose-600">{fmt(p.clearancePrice)}</p>
                                                        <p className="text-[9px] text-gray-400 line-through font-medium leading-none">{fmt(p.basePrice)}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-extrabold text-primary-600">{fmt(p.basePrice)}</p>
                                                )}
                                                <span className={`text-[10px] font-bold ${outOfStock ? 'text-red-500' : available <= 5 ? 'text-amber-500' : 'text-green-600'}`}>
                                                    {outOfStock ? 'Out' : `${available} Left`}
                                                </span>
                                            </div>
                                            {inCart > 0 && (
                                                <div className="absolute top-1.5 right-1.5">
                                                    <span className="bg-primary-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                        {inCart}
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Cart (Fixed width on desktop, sliding drawer on mobile/tablet when active) */}
                <div className={`
                    fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] shadow-2xl flex flex-col bg-white border-l h-full transition-transform duration-300 ease-in-out
                    lg:static lg:w-96 lg:translate-x-0 lg:shadow-none lg:flex
                    ${showCartOnMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    <div className="p-3 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowCartOnMobile(false)} className="p-2 -ml-2 text-gray-400 lg:hidden" aria-label="Close cart">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="font-bold flex items-center gap-2 text-gray-900">
                                <ShoppingCart size={18} /> Cart
                                {totals.itemCount > 0 && <Badge>{totals.itemCount}</Badge>}
                            </h2>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {heldCarts.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIsHeldModalOpen(true)}
                                    className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition shadow-2xs"
                                    title="View Parked Sales / Held Carts"
                                >
                                    <Layers size={13} />
                                    <span>Held ({heldCarts.length})</span>
                                </button>
                            )}

                            {cart.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={holdCurrentCart}
                                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition"
                                        title="Park this cart to serve another customer"
                                    >
                                        <PauseCircle size={13} />
                                        <span>Hold</span>
                                    </button>
                                    <button onClick={() => clearCart(false)} className="text-xs text-red-600 font-semibold hover:underline px-1">
                                        Clear
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {cart.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Cart is empty</p>
                                <button onClick={() => setShowCartOnMobile(false)} className="mt-4 text-primary-600 text-sm font-bold lg:hidden">Browse Products</button>
                            </div>
                        ) : (
                            cart.map((item) => {
                                const lineSubtotal = item.qty * item.price;
                                const isDiscAmount = item.discountType === 'amount';
                                const lineDiscount = item.discountValue > 0
                                    ? (isDiscAmount ? Math.min(lineSubtotal, +item.discountValue || 0) : +(lineSubtotal * (+item.discountValue || 0) / 100).toFixed(2))
                                    : 0;
                                const lineFinal = Math.max(0, lineSubtotal - lineDiscount);
                                const isEditing = editingDiscountId === item.productId;

                                return (
                                    <div key={item.productId} className="border border-gray-200 rounded-xl p-3 bg-white shadow-2xs transition-all hover:border-gray-300">
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-sm font-bold text-gray-900 break-words leading-tight">{item.name}</p>
                                                    {item.isClearance && (
                                                        <span className="shrink-0 text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded-full border border-rose-200">
                                                            🔥 CLEARANCE
                                                        </span>
                                                    )}
                                                    {item.isPerishable && (
                                                        <span className="shrink-0 text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded-full border border-amber-300">
                                                            🥖 FRESH
                                                        </span>
                                                    )}
                                                    {item.isWeighed && (
                                                        <span className="shrink-0 text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-full border border-sky-300 flex items-center gap-0.5">
                                                            ⚖️ WEIGHED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.code}</p>
                                            </div>
                                            <button onClick={() => removeFromCart(item.productId)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 my-2">
                                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5 shadow-2xs">
                                                <button onClick={() => updateQty(item.productId, item.isWeighed ? -0.1 : -1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white text-gray-600 rounded-md transition-colors">
                                                    <Minus size={14} />
                                                </button>
                                                <input type="number" value={item.qty} min="0.001" step="any" max={item.available}
                                                    onChange={(e) => setQty(item.productId, e.target.value)}
                                                    className="w-12 text-center text-sm font-bold bg-transparent border-0 focus:ring-0 p-0" />
                                                <button onClick={() => updateQty(item.productId, item.isWeighed ? 0.1 : 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white text-gray-600 rounded-md transition-colors">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-gray-900">{fmt(lineFinal)}</p>
                                                {lineDiscount > 0 && (
                                                    <p className="text-[11px] text-rose-600 font-bold leading-tight">
                                                        -{fmt(lineDiscount)} ({item.discountType === 'amount' ? `Rs. ${item.discountValue}` : `${item.discountValue}%`})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                                            <span>{fmt(item.price)} {item.unitOfMeasure ? `/ ${item.unitOfMeasure}` : ''}</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditingDiscountId(isEditing ? null : item.productId)}
                                                className={`font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                                    lineDiscount > 0
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                🏷️ {lineDiscount > 0 ? `Disc: ${item.discountType === 'amount' ? `Rs. ${item.discountValue}` : `${item.discountValue}%`}` : '+ Item Disc'}
                                            </button>
                                        </div>

                                        {/* Inline Item Discount Popover/Panel */}
                                        {isEditing && (
                                            <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 bg-gray-50/80 p-2.5 rounded-lg space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-gray-700">Line Discount</span>
                                                    <div className="flex bg-white rounded-md border border-gray-200 p-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setItemDiscount(item.productId, 'percent', item.discountValue)}
                                                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${item.discountType === 'percent' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
                                                        >
                                                            %
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setItemDiscount(item.productId, 'amount', item.discountValue)}
                                                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${item.discountType === 'amount' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
                                                        >
                                                            Rs.
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step={item.discountType === 'amount' ? '1' : '0.5'}
                                                        max={item.discountType === 'percent' ? 100 : lineSubtotal}
                                                        placeholder={item.discountType === 'percent' ? 'e.g. 10%' : 'e.g. 150'}
                                                        value={item.discountValue || ''}
                                                        onChange={(e) => setItemDiscount(item.productId, item.discountType, e.target.value)}
                                                        className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setItemDiscount(item.productId, 'percent', 0); setEditingDiscountId(null); }}
                                                        className="text-[10px] text-gray-500 hover:text-red-600 px-1.5 py-1"
                                                    >
                                                        Reset
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingDiscountId(null)}
                                                        className="text-[10px] bg-primary-600 text-white font-bold px-2.5 py-1 rounded-md"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                                {/* Quick Presets for item discount */}
                                                <div className="flex gap-1">
                                                    {[5, 10, 15, 20].map((pct) => (
                                                        <button
                                                            key={pct}
                                                            type="button"
                                                            onClick={() => setItemDiscount(item.productId, 'percent', pct)}
                                                            className="flex-1 text-[10px] py-0.5 bg-white border border-gray-200 rounded text-gray-700 hover:bg-gray-100 font-medium"
                                                        >
                                                            {pct}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Summary */}
                    <div className="border-t p-4 space-y-3 bg-gray-50 sticky bottom-0">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 font-medium">
                                <span>Subtotal</span><span>{fmt(totals.subtotal)}</span>
                            </div>

                            {/* Item-level discounts line if any */}
                            {totals.itemsDiscountTotal > 0 && (
                                <div className="flex justify-between text-xs text-rose-600 font-semibold">
                                    <span>Item Discounts</span><span>-{fmt(totals.itemsDiscountTotal)}</span>
                                </div>
                            )}

                            {/* Order-level quick preset buttons */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-gray-500 font-semibold uppercase">Order Discount</span>
                                    <div className="flex gap-1">
                                        {[0, 5, 10, 15, 20].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => {
                                                    setOrderDiscountPercent(pct);
                                                    setOrderDiscountAmount(0);
                                                }}
                                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                                    +orderDiscountPercent === pct && +orderDiscountAmount === 0
                                                        ? 'bg-primary-600 text-white border-primary-600 font-bold'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {pct === 0 ? '0%' : `${pct}%`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-1.5">
                                    <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-2xs">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase">Disc %</span>
                                        <input type="number" min="0" max="100" step="0.01"
                                            value={orderDiscountPercent}
                                            onChange={(e) => setOrderDiscountPercent(e.target.value)}
                                            className="w-12 text-right font-bold focus:outline-none text-xs bg-transparent border-0 p-0 focus:ring-0" />
                                    </div>
                                    <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-2xs">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase">Disc (Rs)</span>
                                        <input type="number" min="0" step="0.01"
                                            value={orderDiscountAmount}
                                            onChange={(e) => setOrderDiscountAmount(e.target.value)}
                                            className="w-16 text-right font-bold focus:outline-none text-xs bg-transparent border-0 p-0 focus:ring-0" />
                                    </div>
                                </div>
                            </div>

                            {/* Coupon / Voucher Section */}
                            <div className="p-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm">🎟️</span>
                                        <span className="text-xs font-bold text-indigo-950">Coupon / Voucher</span>
                                    </div>
                                    {appliedCoupon && (
                                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                                            Applied
                                        </span>
                                    )}
                                </div>

                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-xs text-indigo-900">{appliedCoupon.code}</span>
                                                <span className="text-[10px] text-indigo-600 font-semibold">
                                                    ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% OFF` : `Rs. ${appliedCoupon.value} OFF`})
                                                </span>
                                            </div>
                                            {appliedCoupon.description && (
                                                <div className="text-[10px] text-gray-500">{appliedCoupon.description}</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="text-xs text-gray-400 hover:text-rose-600 p-1 font-bold"
                                            title="Remove Coupon"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            placeholder="PROMO CODE..."
                                            value={couponCodeInput}
                                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleApplyCoupon();
                                                }
                                            }}
                                            className="flex-1 px-2.5 py-1 text-xs font-mono uppercase font-semibold border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            disabled={isValidatingCoupon || !couponCodeInput.trim()}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            {isValidatingCoupon ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                )}

                                {totals.couponDiscountAmount > 0 && (
                                    <div className="flex justify-between text-xs font-bold text-indigo-950 pt-0.5">
                                        <span>Coupon Discount:</span>
                                        <span>-{fmt(totals.couponDiscountAmount)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Loyalty Points Redemption Section */}
                            {selectedCustomer && (
                                <div className="p-2.5 rounded-xl border border-amber-200/90 bg-amber-50/60 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm">⭐</span>
                                            <span className="text-xs font-bold text-amber-950">Loyalty Rewards</span>
                                        </div>
                                        <span className="text-[11px] font-extrabold text-amber-800">
                                            {totals.availablePoints} pts available
                                        </span>
                                    </div>

                                    {totals.availablePoints > 0 ? (
                                        <div className="space-y-1.5 pt-1.5 border-t border-amber-200/70">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-amber-900 font-medium">Redeem (1 pt = Rs. 1):</span>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={totals.maxRedeemablePoints}
                                                        value={pointsToRedeem || ''}
                                                        onChange={(e) => setPointsToRedeem(Math.min(totals.maxRedeemablePoints, Math.max(0, +e.target.value || 0)))}
                                                        placeholder="0"
                                                        className="w-16 px-2 py-0.5 text-xs text-right font-bold border border-amber-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    />
                                                    <span className="text-[10px] text-amber-700 font-bold">pts</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {[50, 100].filter(p => p <= totals.maxRedeemablePoints).map(pts => (
                                                    <button
                                                        key={pts}
                                                        type="button"
                                                        onClick={() => setPointsToRedeem(pts)}
                                                        className="flex-1 text-[10px] py-0.5 bg-white border border-amber-200 rounded font-semibold text-amber-800 hover:bg-amber-100"
                                                    >
                                                        {pts} pts
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setPointsToRedeem(totals.maxRedeemablePoints)}
                                                    className="flex-1 text-[10px] py-0.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-700"
                                                >
                                                    Max ({totals.maxRedeemablePoints})
                                                </button>
                                                {pointsToRedeem > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPointsToRedeem(0)}
                                                        className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 hover:text-red-600"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            {totals.loyaltyDiscountAmount > 0 && (
                                                <div className="flex justify-between text-xs font-bold text-amber-950 pt-0.5">
                                                    <span>Points Discount:</span>
                                                    <span>-{fmt(totals.loyaltyDiscountAmount)}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-amber-700 italic">No points yet to redeem.</p>
                                    )}

                                    {totals.loyaltyPointsEarned > 0 && (
                                        <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 pt-1 border-t border-amber-200/50">
                                            <span>🎁</span>
                                            <span>+{totals.loyaltyPointsEarned} pts will be earned on this order!</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {totals.totalDiscount > 0 && (
                                <div className="flex justify-between text-xs font-bold text-rose-600 pt-1 border-t border-gray-200/60">
                                    <span>Total Savings</span><span>-{fmt(totals.totalDiscount)}</span>
                                </div>
                            )}

                        </div>

                        <div className="flex justify-between pt-3 border-t border-gray-200">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="text-xl font-black text-primary-600 leading-none">{fmt(totals.grandTotal)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button variant="outline" onClick={() => handleCheckout(true)}
                                disabled={cart.length === 0 || (!customerId && !customerSearch)} loading={createOrder.isPending}>
                                <Save size={14} className="mr-1" /> Draft
                            </Button>
                            <Button variant="primary" onClick={() => handleCheckout(false)}
                                disabled={cart.length === 0 || (!customerId && !customerSearch)} loading={createOrder.isPending}>
                                <CreditCard size={14} className="mr-1" /> Checkout
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Cart Toggle Button */}
                {!showCartOnMobile && (
                    <button
                        onClick={() => setShowCartOnMobile(true)}
                        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 hover:scale-105 active:scale-90 transition-all duration-200"
                    >
                        <div className="relative">
                            <ShoppingCart size={24} />
                            {totals.itemCount > 0 && (
                                <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {totals.itemCount}
                                </span>
                            )}
                        </div>
                    </button>
                )}
            </div>

            <QuickCreateCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSuccess={(newCustomer) => {
                    setCustomerId(newCustomer._id);
                    setCustomerSearch('');
                }}
                initialData={selectedCustomer || (customerSearch ? { displayName: customerSearch } : null)}
                isPosMode={true}
            />

            <PosSessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} />
            <CloseRegisterModal isOpen={isCloseRegisterModalOpen} onClose={() => setIsCloseRegisterModalOpen(false)} session={activeSession} />

            <Modal
                isOpen={isCalculatorModalOpen}
                onClose={() => setIsCalculatorModalOpen(false)}
                title="POS Payment & Checkout"
                size="md"
            >
                <div className="p-6 space-y-5">
                    {/* Grand Total Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Payable</p>
                            <p className="text-2xl font-bold text-indigo-950 mt-0.5">{fmt(totals.grandTotal)}</p>
                        </div>
                        <div className="bg-indigo-600 text-white rounded-xl p-2.5 shadow-sm shadow-indigo-200">
                            <CreditCard size={24} />
                        </div>
                    </div>

                    {/* Bank Card Promotions Selector */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                <Sparkles size={14} className="text-amber-600" />
                                <span>Bank Card Offers (Keells / Food City Deals)</span>
                            </div>
                            {selectedBankPromo && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedBankPromo(null)}
                                    className="text-[10px] text-amber-800 font-bold hover:underline"
                                >
                                    ✕ Remove Offer
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {SRI_LANKA_BANK_PROMOS.map((promo) => {
                                const isSelected = selectedBankPromo?.id === promo.id;
                                const qualifies = totals.subtotal >= promo.minSpend;
                                return (
                                    <button
                                        key={promo.id}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedBankPromo(null);
                                            } else {
                                                if (!qualifies) {
                                                    toast.error(`Min spend for ${promo.bankName} is ${fmt(promo.minSpend)}`);
                                                }
                                                setSelectedBankPromo(promo);
                                            }
                                        }}
                                        className={`px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition flex flex-col ${
                                            isSelected
                                                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                                                : qualifies
                                                    ? 'bg-white border-amber-200 text-gray-800 hover:bg-amber-100/50'
                                                    : 'bg-gray-100/70 border-gray-200 text-gray-400 opacity-60'
                                        }`}
                                    >
                                        <span className="text-[11px] font-bold leading-tight">{promo.logoText} {promo.discountPercent}% OFF</span>
                                        <span className="text-[9px] opacity-85">Min {fmt(promo.minSpend)}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {totals.bankDiscountAmount > 0 && selectedBankPromo && (
                            <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex justify-between items-center">
                                <span>🎉 {selectedBankPromo.bankName} Promo Discount:</span>
                                <span>-{fmt(totals.bankDiscountAmount)}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Select Payment Method
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <button
                                type="button"
                                onClick={() => setPosPaymentMethod('cash')}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition ${
                                    posPaymentMethod === 'cash'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Banknote size={16} />
                                <span>Cash</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPosPaymentMethod('card')}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition ${
                                    posPaymentMethod === 'card'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <CreditCard size={16} />
                                <span>Card</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPosPaymentMethod('split');
                                    // Default split: 50% cash, 50% card
                                    const half = +(totals.grandTotal / 2).toFixed(2);
                                    setSplitCash(half.toString());
                                    setSplitCard((totals.grandTotal - half).toFixed(2));
                                    setSplitBank('');
                                }}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition ${
                                    posPaymentMethod === 'split'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Layers size={16} />
                                <span>Split</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPosPaymentMethod('bank_transfer')}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition ${
                                    posPaymentMethod === 'bank_transfer'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Landmark size={16} />
                                <span>Bank Transfer</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPosPaymentMethod('cheque')}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition ${
                                    posPaymentMethod === 'cheque'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <FileText size={16} />
                                <span>Cheque</span>
                            </button>
                        </div>
                    </div>

                    {/* METHOD 1: CASH */}
                    {posPaymentMethod === 'cash' && (
                        <div className="space-y-4 pt-1">
                            {/* Cash Received Input */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-gray-700">Cash Received (LKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">Rs.</span>
                                    <input
                                        type="number"
                                        step="any"
                                        autoFocus
                                        placeholder="0.00"
                                        value={calculatorCashReceived}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCalculatorCashReceived(val);
                                            const parsed = parseFloat(val) || 0;
                                            setCalculatorChangeReturned(Math.max(0, parsed - totals.grandTotal));
                                        }}
                                        className="w-full bg-white border border-gray-300 rounded-xl py-2.5 pl-11 pr-4 text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Quick Cash Buttons */}
                            <div className="space-y-1.5">
                                <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Quick Cash Shortcuts</span>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCalculatorCashReceived(totals.grandTotal.toString());
                                            setCalculatorChangeReturned(0);
                                        }}
                                        className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium rounded-lg transition border border-gray-200 active:scale-95"
                                    >
                                        Exact Cash
                                    </button>
                                    {[1000, 2000, 5000, 10000].map((denom) => (
                                        <button
                                            key={denom}
                                            type="button"
                                            onClick={() => {
                                                setCalculatorCashReceived(denom.toString());
                                                setCalculatorChangeReturned(Math.max(0, denom - totals.grandTotal));
                                            }}
                                            className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition border border-indigo-100 active:scale-95"
                                        >
                                            {denom.toLocaleString('en-LK')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Change Returned Display */}
                            <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Change to Return</p>
                                    <p className="text-xl font-bold text-emerald-950 mt-0.5">{fmt(calculatorChangeReturned)}</p>
                                </div>
                                <div className="bg-emerald-500 text-white rounded-lg p-2 shadow-sm shadow-emerald-200">
                                    <CheckCircle size={20} />
                                </div>
                            </div>

                            {calculatorCashReceived && (parseFloat(calculatorCashReceived) || 0) < totals.grandTotal && (
                                <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
                                    <AlertCircle size={16} />
                                    <span>Cash received is less than total payable!</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* METHOD 2: CARD */}
                    {posPaymentMethod === 'card' && (
                        <div className="space-y-3.5 pt-1">
                            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="text-gray-600">Card Payment Amount:</span>
                                <span className="font-bold text-blue-900 text-sm">{fmt(totals.grandTotal)}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Card / Terminal Reference / Approval Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Auth Code / Slip # 49201"
                                    value={posTransactionRef}
                                    onChange={(e) => setPosTransactionRef(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {bankAccounts.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Deposit To Bank Account</label>
                                    <select
                                        value={posBankAccountId}
                                        onChange={(e) => setPosBankAccountId(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="">Default POS Terminal Account</option>
                                        {bankAccounts.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.accountName} - {b.bankName} ({b.accountNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* METHOD: SPLIT PAYMENT */}
                    {posPaymentMethod === 'split' && (
                        <div className="space-y-4 pt-1">
                            {(() => {
                                const cVal = parseFloat(splitCash) || 0;
                                const cardVal = parseFloat(splitCard) || 0;
                                const bVal = parseFloat(splitBank) || 0;
                                const totalEntered = +(cVal + cardVal + bVal).toFixed(2);
                                const diff = +(totals.grandTotal - totalEntered).toFixed(2);
                                const isBalanced = Math.abs(diff) <= 0.01;

                                return (
                                    <>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2.5 rounded-lg border bg-gray-50 text-center">
                                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Due</span>
                                                <span className="text-sm font-bold text-gray-900">{fmt(totals.grandTotal)}</span>
                                            </div>
                                            <div className="p-2.5 rounded-lg border bg-blue-50 text-center border-blue-100">
                                                <span className="text-[10px] text-blue-600 uppercase font-semibold block">Total Paid</span>
                                                <span className="text-sm font-bold text-blue-900">{fmt(totalEntered)}</span>
                                            </div>
                                            <div className={`p-2.5 rounded-lg border text-center ${
                                                isBalanced
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                    : diff > 0
                                                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                                                        : 'bg-purple-50 border-purple-200 text-purple-800'
                                            }`}>
                                                <span className="text-[10px] uppercase font-semibold block">
                                                    {isBalanced ? 'Status' : diff > 0 ? 'Remaining' : 'Change'}
                                                </span>
                                                <span className="text-sm font-bold">
                                                    {isBalanced ? '✓ Balanced' : fmt(Math.abs(diff))}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Cash Portion */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                                        <Banknote size={14} className="text-emerald-600" /> Cash Portion (LKR)
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const remainder = Math.max(0, totals.grandTotal - (parseFloat(splitCard) || 0) - (parseFloat(splitBank) || 0));
                                                            setSplitCash(remainder.toFixed(2));
                                                        }}
                                                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                                                    >
                                                        Fill Remaining
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={splitCash}
                                                    onChange={(e) => setSplitCash(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>

                                            {/* Card Portion */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                                        <CreditCard size={14} className="text-blue-600" /> Card Portion (LKR)
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const remainder = Math.max(0, totals.grandTotal - (parseFloat(splitCash) || 0) - (parseFloat(splitBank) || 0));
                                                            setSplitCard(remainder.toFixed(2));
                                                        }}
                                                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                                                    >
                                                        Fill Remaining
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={splitCard}
                                                    onChange={(e) => setSplitCard(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                                />
                                                {parseFloat(splitCard) > 0 && (
                                                    <input
                                                        type="text"
                                                        placeholder="Card Auth / Slip Ref (optional)"
                                                        value={splitCardRef}
                                                        onChange={(e) => setSplitCardRef(e.target.value)}
                                                        className="w-full mt-1.5 px-3 py-1.5 border rounded-lg text-xs outline-none"
                                                    />
                                                )}
                                            </div>

                                            {/* Bank Transfer / QR Portion */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                                        <Landmark size={14} className="text-purple-600" /> Bank Transfer / QR (LKR)
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const remainder = Math.max(0, totals.grandTotal - (parseFloat(splitCash) || 0) - (parseFloat(splitCard) || 0));
                                                            setSplitBank(remainder.toFixed(2));
                                                        }}
                                                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                                                    >
                                                        Fill Remaining
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={splitBank}
                                                    onChange={(e) => setSplitBank(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* METHOD 3: BANK TRANSFER */}
                    {posPaymentMethod === 'bank_transfer' && (
                        <div className="space-y-3.5 pt-1">
                            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="text-gray-600">Transfer Amount:</span>
                                <span className="font-bold text-purple-900 text-sm">{fmt(totals.grandTotal)}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer Bank Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Commercial / BOC / Sampath"
                                        value={posBankName}
                                        onChange={(e) => setPosBankName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Transfer Ref / Slip No.</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. TXN9872145"
                                        value={posTransactionRef}
                                        onChange={(e) => setPosTransactionRef(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {bankAccounts.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Receiving Bank Account</label>
                                    <select
                                        value={posBankAccountId}
                                        onChange={(e) => setPosBankAccountId(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="">Default Business Account</option>
                                        {bankAccounts.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.accountName} - {b.bankName} ({b.accountNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* METHOD 4: CHEQUE */}
                    {posPaymentMethod === 'cheque' && (
                        <div className="space-y-3.5 pt-1">
                            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="text-gray-600">Cheque Amount:</span>
                                <span className="font-bold text-amber-900 text-sm">{fmt(totals.grandTotal)}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Cheque Number *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CHQ-482910"
                                        value={posChequeNumber}
                                        onChange={(e) => setPosChequeNumber(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Cheque Date</label>
                                    <input
                                        type="date"
                                        value={posChequeDate}
                                        onChange={(e) => setPosChequeDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Bank & Branch Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. HNB - Kollupitiya"
                                    value={posBankName}
                                    onChange={(e) => setPosBankName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-3 border-t">
                        <Button
                            variant="outline"
                            className="flex-1 py-2.5"
                            onClick={() => setIsCalculatorModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={
                                (posPaymentMethod === 'cash' && (!calculatorCashReceived || (parseFloat(calculatorCashReceived) || 0) < totals.grandTotal)) ||
                                (posPaymentMethod === 'split' && (((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) + (parseFloat(splitBank) || 0)) < totals.grandTotal - 0.01)) ||
                                (posPaymentMethod === 'cheque' && !posChequeNumber.trim()) ||
                                createOrder.isLoading
                            }
                            onClick={async () => {
                                setIsCalculatorModalOpen(false);
                                await handleCheckout(false, {
                                    method: posPaymentMethod,
                                    splitPayments: posPaymentMethod === 'split' ? {
                                        cash: parseFloat(splitCash) || 0,
                                        card: parseFloat(splitCard) || 0,
                                        bank: parseFloat(splitBank) || 0,
                                    } : undefined,
                                    cashReceived: posPaymentMethod === 'cash'
                                        ? parseFloat(calculatorCashReceived)
                                        : (posPaymentMethod === 'split' ? (parseFloat(splitCash) || 0) : totals.grandTotal),
                                    changeReturned: posPaymentMethod === 'cash'
                                        ? calculatorChangeReturned
                                        : (posPaymentMethod === 'split' ? Math.max(0, ((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) + (parseFloat(splitBank) || 0)) - totals.grandTotal) : 0),
                                    transactionReference: (posPaymentMethod === 'split' ? (splitCardRef || splitBankRef) : posTransactionRef) || undefined,
                                    bankName: posBankName || undefined,
                                    chequeNumber: posChequeNumber || undefined,
                                    chequeDate: posChequeDate || undefined,
                                    bankAccountId: posBankAccountId || undefined,
                                });
                            }}
                        >
                            {createOrder.isLoading ? 'Processing...' : 'Confirm & Complete Sale'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Held Carts / Parked Bills Modal */}
            <Modal
                isOpen={isHeldModalOpen}
                onClose={() => setIsHeldModalOpen(false)}
                title={`⏸️ Parked Bills / Held Carts (${heldCarts.length})`}
                size="md"
            >
                <div className="p-4 space-y-3">
                    {heldCarts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Layers size={32} className="mx-auto mb-2 text-gray-300" />
                            <p className="font-semibold text-sm">No parked bills</p>
                            <p className="text-xs text-gray-400">Click &quot;Hold&quot; on any active cart to park it</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                            {heldCarts.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition-all flex items-center justify-between shadow-2xs"
                                >
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-gray-900 truncate">
                                                {item.customerName}
                                            </span>
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                {item.timeStr}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{item.itemCount} items ({item.cart?.length} lines)</span>
                                            <span>•</span>
                                            <span className="font-extrabold text-indigo-700">{fmt(item.grandTotal)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <button
                                            type="button"
                                            onClick={() => resumeHeldCart(item.id)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                                        >
                                            <PlayCircle size={13} />
                                            <span>Resume</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => discardHeldCart(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Discard this held bill"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t">
                        {heldCarts.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Clear all parked bills?')) {
                                        setHeldCarts([]);
                                        toast.success('All parked bills cleared');
                                    }
                                }}
                                className="text-xs text-red-600 font-semibold hover:underline"
                            >
                                Clear All Parked
                            </button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={() => setIsHeldModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            <BarcodePrintModal
                isOpen={isBarcodePrintOpen}
                onClose={() => setIsBarcodePrintOpen(false)}
            />



            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}