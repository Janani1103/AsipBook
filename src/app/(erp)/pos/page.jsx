"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserPlus,
  Tag,
  Ticket,
  Gift,
  Percent,
  CheckCircle2,
  X,
  RotateCcw,
  ArrowLeftRight,
  FileText,
} from "lucide-react";
import { customersApi } from "../../../client/features/customers/customersApi.js";
import { useCreateCustomer } from "../../../client/features/customers/useCustomers.js";
import { useBankAccounts } from "../../../client/features/bankAccounts/useBankAccounts.js";
import { useUsers } from "../../../client/features/users/useUsers.js";
import { useAuthStore } from "../../../client/store/authStore.js";
import QuickCreateCustomerModal from "../../../client/features/customers/QuickCreateCustomerModal.jsx";
import PosReturnExchangeModal from "../../../client/features/pos/PosReturnExchangeModal.jsx";
import PosReceiptPanel from "../../../client/features/pos/PosReceiptPanel.jsx";
import { posReturnsApi } from "../../../client/features/pos/posReturnsApi.js";
import { productsApi } from "../../../client/features/products/productsApi.js";
import { stockApi } from "../../../client/features/stock/stockApi.js";
import { useWarehouses } from "../../../client/features/warehouses/useWarehouses.js";
import { useCreateSalesOrder } from "../../../client/features/salesOrders/useSalesOrders.js";
import {
  useActivePosSession,
  useClosePosSession,
  useOpenPosSession,
} from "../../../client/features/posSessions/usePosSessions.js";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

export default function PosPage() {
  const router = useRouter();
  const createOrder = useCreateSalesOrder();
  const createCustomer = useCreateCustomer();
  const openSession = useOpenPosSession();
  const closeSession = useClosePosSession();
  const user = useAuthStore((state) => state.user);
  const [selectedCashierId, setSelectedCashierId] = useState("");

  useEffect(() => {
    if (user && !selectedCashierId) setSelectedCashierId(user._id);
  }, [user, selectedCashierId]);

  const { data: sessionData, isLoading: loadingSession } = useActivePosSession(selectedCashierId || user?._id);
  const { data: usersData } = useUsers({ status: "active", limit: 100 });
  const usersList = usersData?.data || [];
  const { data: bankAccountsData } = useBankAccounts({ isActive: true });
  const bankAccounts = bankAccountsData?.data || [];
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [creditToSave, setCreditToSave] = useState("");
  const [openingModal, setOpeningModal] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [bagModalOpen, setBagModalOpen] = useState(false);
  const [selectedBagId, setSelectedBagId] = useState("");
  const [bagCount, setBagCount] = useState(1);
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [actualBalance, setActualBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [promoOverride, setPromoOverride] = useState("");
  const [giftVoucher, setGiftVoucher] = useState("");
  const [appliedGiftVoucher, setAppliedGiftVoucher] = useState(null);
  const [voucherOverride, setVoucherOverride] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [calculationResult, setCalculationResult] = useState(null);
  const [returnExchangeModalOpen, setReturnExchangeModalOpen] = useState(false);
  const [exchangeRefundMethod, setExchangeRefundMethod] = useState("cash");
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);

  const handleAddExchangeToCart = (returnItems, invoice) => {
    if (completedReceipt) setCompletedReceipt(null);
    if (!customerId && invoice?.customerId) {
      const invCustId = invoice.customerId?._id || invoice.customerId;
      setCustomerId(invCustId);
    } else if (!customerId && invoice?.customerSnapshot?.name) {
      setCustomerName(invoice.customerSnapshot.name);
      if (invoice.customerSnapshot.phone) setCustomerPhone(invoice.customerSnapshot.phone);
    }

    setCart((prev) => {
      const filtered = prev.filter(
        (p) => !returnItems.some((r) => r.isReturn && r.productId === p.productId && r.originalInvoiceId === p.originalInvoiceId)
      );
      const mapped = returnItems.map((r) => ({
        productId: r.productId,
        name: r.name,
        price: r.unitPrice,
        qty: r.quantity,
        isReturn: true,
        condition: r.condition,
        reason: r.reason,
        reasonDescription: r.reasonDescription,
        originalInvoiceId: r.originalInvoiceId,
        originalInvoiceNumber: r.originalInvoiceNumber,
        maxQuantity: r.maxQuantity,
      }));
      return [...filtered, ...mapped];
    });
  };

  const activeSession = sessionData?.data;
  const { data: warehousesData } = useWarehouses({ isActive: true });
  const { data: customersData } = useQuery({
    queryKey: ["customers", "active", "pos"],
    queryFn: () => customersApi.list({ status: "active", limit: 500 }),
  });
  const { data: productsData } = useQuery({
    queryKey: ["products", "active", "pos"],
    queryFn: () =>
      productsApi.list({ status: "active", canBeSold: true, limit: 500 }),
  });
  const { data: stockData } = useQuery({
    queryKey: ["stock", "pos", warehouseId],
    queryFn: () => stockApi.list({ warehouseId, limit: 500 }),
    enabled: !!warehouseId,
  });
  const newCartItems = cart.filter((item) => !item.isReturn);
  const { data: promotionsData } = useQuery({
    queryKey: ["promotions", "applicable"],
    queryFn: async () => {
      const response = await fetch("/api/promotions/applicable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          cartItems: newCartItems.map((item) => ({
            productId: item.productId,
            quantity: item.qty,
          })),
        }),
      });
      const data = await response.json();
      return data.data || [];
    },
    enabled: newCartItems.length > 0,
  });
  const warehouses = warehousesData?.data || [];
  const customers = customersData?.data || [];
  const products = productsData?.data || [];
  const applicablePromotions = promotionsData || [];

  useEffect(() => {
    if (newCartItems.length === 0) {
      setCalculationResult(null);
      return;
    }
    const calculate = async () => {
      try {
        const response = await fetch("/api/sales-orders/calculate-discounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: newCartItems.map((item) => ({
              productId: item.productId,
              quantity: item.qty,
              unitPrice: item.price,
            })),
            customerId: customerId || null,
            paymentMethod: "any",
            promoCode: appliedPromoCode?.code || null,
            voucherCode: appliedGiftVoucher?.code || null,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setCalculationResult(data.data);
        }
      } catch (err) {
        console.error("Failed to calculate discounts:", err);
      }
    };
    const timeoutId = setTimeout(calculate, 300);
    return () => clearTimeout(timeoutId);
  }, [cart, customerId, appliedPromoCode, appliedGiftVoucher]);

  useEffect(() => {
    if (!warehouseId && warehouses.length)
      setWarehouseId(
        (warehouses.find((warehouse) => warehouse.isDefault) || warehouses[0])
          ._id,
      );
  }, [warehouseId, warehouses]);
  const stock = useMemo(() => {
    const map = new Map();
    (stockData?.data || []).forEach((item) => {
      const id = item.productId?._id || item.productId;
      const current = map.get(id) || { onHand: 0, reserved: 0 };
      current.onHand += item.quantities?.onHand || 0;
      current.reserved += item.quantities?.reserved || 0;
      map.set(id, current);
    });
    return map;
  }, [stockData]);
  const visibleProducts = products.filter(
    (product) =>
      product.canBeSold !== false &&
      (!search ||
        [product.name, product.productCode, product.barcode].some((value) =>
          value?.toLowerCase().includes(search.toLowerCase()),
        )),
  );
  const bagProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes("bag") ||
        p.productCode?.toLowerCase().includes("bag") ||
        p.categoryId?.code === "PKG" ||
        p.categoryId?.name?.toLowerCase().includes("packaging"),
    );
  }, [products]);
  const currentBagsInCart = useMemo(() => {
    return cart.filter(
      (item) => item.isBag || bagProducts.some((b) => b._id === item.productId),
    );
  }, [cart, bagProducts]);
  const totalBagsInCart = useMemo(() => {
    return currentBagsInCart.reduce((sum, item) => sum + item.qty, 0);
  }, [currentBagsInCart]);
  const totals = useMemo(() => {
    const positiveItems = cart.filter((item) => !item.isReturn);
    const returnItems = cart.filter((item) => item.isReturn);

    const subtotal = positiveItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    const returnCreditTotal = returnItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    const manualItemDiscount = positiveItems.reduce((sum, item) => sum + (item.qty * item.price * (item.discountPercent || 0)) / 100, 0);
    const orderDiscount = (subtotal * (+discountPercent || 0)) / 100 + (+discountAmount || 0);
    
    if (calculationResult) {
      let promoDiscount = calculationResult.breakdown?.find(b => b.type === 'promo')?.amount || 0;
      let voucherDiscount = calculationResult.breakdown?.find(b => b.type === 'voucher')?.amount || 0;

      let modifiedBreakdown = [...(calculationResult.breakdown || [])];
      
      if (promoOverride !== "") {
        promoDiscount = +promoOverride;
        const promoIndex = modifiedBreakdown.findIndex(b => b.type === 'promo');
        if (promoIndex !== -1) modifiedBreakdown[promoIndex] = { ...modifiedBreakdown[promoIndex], amount: promoDiscount };
        else if (promoDiscount > 0) modifiedBreakdown.push({ type: 'promo', name: 'Promo Code', amount: promoDiscount });
      }
      if (voucherOverride !== "") {
        voucherDiscount = +voucherOverride;
        const voucherIndex = modifiedBreakdown.findIndex(b => b.type === 'voucher');
        if (voucherIndex !== -1) modifiedBreakdown[voucherIndex] = { ...modifiedBreakdown[voucherIndex], amount: voucherDiscount };
        else if (voucherDiscount > 0) modifiedBreakdown.push({ type: 'voucher', name: 'Gift Voucher', amount: voucherDiscount });
      }

      const promotionDiscount = modifiedBreakdown.filter(b => b.type !== 'promo' && b.type !== 'voucher' && b.type !== 'item').reduce((sum, b) => sum + b.amount, 0) || 0;
      const engineItemDiscount = modifiedBreakdown.filter(b => b.type === 'item').reduce((sum, b) => sum + b.amount, 0) || 0;

      const totalDiscount = orderDiscount + promoDiscount + voucherDiscount + promotionDiscount + engineItemDiscount + manualItemDiscount;
      const netGrandTotal = +(calculationResult.subtotal - totalDiscount - returnCreditTotal).toFixed(2);
      
      return {
        subtotal: calculationResult.subtotal,
        returnCreditTotal: +returnCreditTotal.toFixed(2),
        orderDiscount: +orderDiscount.toFixed(2),
        promoDiscount: +promoDiscount.toFixed(2),
        voucherDiscount: +voucherDiscount.toFixed(2),
        promotionDiscount: +promotionDiscount.toFixed(2),
        totalDiscount: +totalDiscount.toFixed(2),
        grandTotal: netGrandTotal,
        isNetRefund: netGrandTotal < 0,
        breakdown: modifiedBreakdown,
      };
    }

    let promoDiscount = 0;
    if (appliedPromoCode) {
      if (promoOverride !== "") {
        promoDiscount = +promoOverride;
      } else if (appliedPromoCode.discountValue) {
        if (appliedPromoCode.discountType === "percentage") {
          promoDiscount = (subtotal * appliedPromoCode.discountValue) / 100;
        } else {
          promoDiscount = appliedPromoCode.discountValue;
        }
      }
    }
    
    let voucherDiscount = 0;
    if (appliedGiftVoucher) {
      if (voucherOverride !== "") {
        voucherDiscount = +voucherOverride;
      } else if (appliedGiftVoucher.value) {
        if (appliedGiftVoucher.type === "percentage") {
          voucherDiscount = (subtotal * appliedGiftVoucher.value) / 100;
        } else {
          voucherDiscount = appliedGiftVoucher.value;
        }
      }
    }
    let promotionDiscount = 0;
    if (appliedPromotion && (appliedPromotion.discountPercent || appliedPromotion.discountValue)) {
      if (appliedPromotion.type === "percentage_discount") {
        promotionDiscount = (subtotal * appliedPromotion.discountPercent) / 100;
      } else if (appliedPromotion.type === "fixed_discount") {
        promotionDiscount = appliedPromotion.discountValue;
      }
    }
    const totalDiscount = orderDiscount + promoDiscount + voucherDiscount + promotionDiscount + manualItemDiscount;
    const netGrandTotal = +(subtotal - totalDiscount - returnCreditTotal).toFixed(2);
    return {
      subtotal: +subtotal.toFixed(2),
      returnCreditTotal: +returnCreditTotal.toFixed(2),
      orderDiscount: +orderDiscount.toFixed(2),
      promoDiscount: +promoDiscount.toFixed(2),
      voucherDiscount: +voucherDiscount.toFixed(2),
      promotionDiscount: +promotionDiscount.toFixed(2),
      totalDiscount: +totalDiscount.toFixed(2),
      grandTotal: netGrandTotal,
      isNetRefund: netGrandTotal < 0,
      breakdown: [],
    };
  }, [cart, discountPercent, discountAmount, appliedPromoCode, appliedGiftVoucher, appliedPromotion, calculationResult, promoOverride, voucherOverride]);
  const addProduct = (product) => {
    if (completedReceipt) setCompletedReceipt(null);
    const available = Math.max(
      0,
      (stock.get(product._id)?.onHand || 0) -
        (stock.get(product._id)?.reserved || 0),
    );
    const line = cart.find((item) => item.productId === product._id && !item.isReturn);
    if (!available || line?.qty >= available)
      return toast.error(
        !available
          ? `${product.name} is out of stock at this warehouse`
          : `Only ${available} available`,
      );
    setCart((items) =>
      line
        ? items.map((item) =>
            item.productId === product._id && !item.isReturn
              ? { ...item, qty: item.qty + 1 }
              : item,
          )
        : [
            ...items,
            {
              productId: product._id,
              name: product.name,
              price: product.basePrice,
              qty: 1,
              available,
            },
          ],
    );
  };
  const updateQty = (id, quantity, isReturn = false) =>
    setCart((items) =>
      items.flatMap((item) => {
        if (item.productId !== id || Boolean(item.isReturn) !== Boolean(isReturn)) return [item];
        const qty = Math.max(0, quantity);
        if (!isReturn && qty > item.available) {
          toast.error(`Only ${item.available} available`);
          return [item];
        }
        if (isReturn && item.maxQuantity && qty > item.maxQuantity) {
          toast.error(`Max returnable is ${item.maxQuantity}`);
          return [item];
        }
        return qty ? [{ ...item, qty }] : [];
      }),
    );
  const updateItemDiscount = (id, percent) => {
    setCart((items) =>
      items.map((item) =>
        item.productId === id
          ? { ...item, discountPercent: percent === "" ? "" : Math.max(0, Math.min(100, Number(percent) || 0)) }
          : item
      )
    );
  };
  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setAppliedPromoCode({ code: promoCode });
    setPromoCode("");
    toast.success("Promo code applied successfully!");
  };
  const applyGiftVoucher = async () => {
    if (!giftVoucher.trim()) return;
    setAppliedGiftVoucher({ code: giftVoucher });
    setGiftVoucher("");
    toast.success("Gift voucher applied successfully!");
  };
  const clearPromoCode = () => {
    setAppliedPromoCode(null);
    setPromoOverride("");
    toast.success("Promo code removed");
  };
  const clearGiftVoucher = () => {
    setAppliedGiftVoucher(null);
    setVoucherOverride("");
    toast.success("Gift voucher removed");
  };

  const openBagModal = () => {
    if (currentBagsInCart.length > 0) {
      const existing = currentBagsInCart[0];
      setSelectedBagId(existing.productId);
      setBagCount(existing.qty || 1);
    } else if (bagProducts.length > 0) {
      setSelectedBagId(bagProducts[0]._id);
      setBagCount(1);
    }
    setBagModalOpen(true);
  };

  const handleCheckoutClick = () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (!activeSession) {
      toast.error("You must open the cash register first");
      setOpeningModal(true);
      return;
    }
    // If no shopping bags are in cart yet and bag products exist, prompt cashier
    if (currentBagsInCart.length === 0 && bagProducts.length > 0) {
      setSelectedBagId(bagProducts[0]._id);
      setBagCount(1);
      setBagModalOpen(true);
      return;
    }
    setCashModal(true);
  };

  const handleApplyBags = (proceedToCheckout = true) => {
    const chosenProduct =
      bagProducts.find((p) => p._id === selectedBagId) || bagProducts[0];
    if (!chosenProduct) {
      setBagModalOpen(false);
      if (proceedToCheckout) setCashModal(true);
      return;
    }

    const count = Math.max(1, parseInt(bagCount, 10) || 1);
    const available = Math.max(
      0,
      (stock.get(chosenProduct._id)?.onHand || 0) -
        (stock.get(chosenProduct._id)?.reserved || 0),
    );

    setCart((prev) => {
      const nonBagItems = prev.filter(
        (item) => !item.isBag && !bagProducts.some((b) => b._id === item.productId),
      );
      return [
        ...nonBagItems,
        {
          productId: chosenProduct._id,
          name: chosenProduct.name,
          price: chosenProduct.basePrice,
          qty: count,
          available: available > 0 ? available : 99999,
          isBag: true,
        },
      ];
    });

    toast.success(`Added ${count}x ${chosenProduct.name} to cart`);
    setBagModalOpen(false);
    if (proceedToCheckout) {
      setCashModal(true);
    }
  };

  const handleSkipBags = () => {
    setBagModalOpen(false);
    setCashModal(true);
  };

  const handleRemoveBags = () => {
    setCart((prev) =>
      prev.filter(
        (item) => !item.isBag && !bagProducts.some((b) => b._id === item.productId),
      ),
    );
    toast.success("Shopping bags removed");
  };

  const submitOrder = async (draft = false) => {
    let finalCustomerId = customerId;
    if (!finalCustomerId && customerName)
      finalCustomerId = (
        await createCustomer.mutateAsync({
          displayName: customerName,
          primaryContact: {
            name: customerName,
            phone: customerPhone || undefined,
          },
          customerType: "individual",
          status: "active",
        })
      ).data._id;
    if (!finalCustomerId) return toast.error("Select or type a customer");
    if (!warehouseId) return toast.error("Select a warehouse");
    if (!cart.length) return toast.error("Cart is empty");
    if (!activeSession) {
      toast.error("You must open the cash register first");
      setOpeningModal(true);
      return;
    }
    const newItems = cart.filter((i) => !i.isReturn);
    const returnItems = cart.filter((i) => i.isReturn);

    // If cart has ONLY return items (pure return):
    if (newItems.length === 0 && returnItems.length > 0) {
      try {
        const directRes = await posReturnsApi.processDirectReturn({
          warehouseId,
          customerId: finalCustomerId,
          refundMethod: exchangeRefundMethod,
          items: returnItems.map((i) => ({
            productId: i.productId,
            quantity: i.qty,
            unitPrice: i.price,
            condition: i.condition,
            reason: i.reason,
            reasonDescription: i.reasonDescription,
          })),
        });
        toast.success(`Return completed: ${directRes.data?.rmaNumber}`);
        const returnId = directRes.data?.returnId;
        const returnReceiptObj = {
          type: "return",
          id: returnId,
          rmaNumber: directRes.data?.rmaNumber,
        };
        setCompletedReceipt(returnReceiptObj);
        setLastReceipt(returnReceiptObj);
        setCart([]);
        setCustomerId("");
        setCustomerName("");
        setCustomerPhone("");
        setCashModal(false);
        return;
      } catch (err) {
        return toast.error(err.response?.data?.message || "Failed to process return");
      }
    }

    const selectedCustomer = customers.find(c => c._id === finalCustomerId);
    const availableCredit = selectedCustomer?.creditStatus?.storeCredit || 0;
    const isNetRefund = totals.grandTotal < 0;
    const payableAmount = Math.max(0, totals.grandTotal);
    const appliedStoreCredit = useStoreCredit ? Math.min(availableCredit, payableAmount) : 0;
    const remainingToPay = Math.max(0, payableAmount - appliedStoreCredit);

    if (!draft && remainingToPay > 0 && cashReceived === "") return toast.error("Please enter the received amount");
    if (!draft && remainingToPay > 0 && +cashReceived < remainingToPay)
      return toast.error("Amount received is less than remaining payable!");

    const result = await createOrder.mutateAsync({
      customerId: finalCustomerId,
      sourceWarehouseId: warehouseId,
      source: "pos",
      paymentMethod,
      bankAccountId: paymentMethod === 'bank_transfer' ? selectedBankId : undefined,
      appliedStoreCredit,
      creditToSave: Number(creditToSave) || 0,
      returnItems: returnItems.map((item) => ({
        productId: item.productId,
        quantity: item.qty,
        unitPrice: item.price,
        condition: item.condition,
        reason: item.reason,
        reasonDescription: item.reasonDescription,
        originalInvoiceId: item.originalInvoiceId,
      })),
      refundToCustomer: isNetRefund ? Math.abs(totals.grandTotal) : 0,
      refundMethod: isNetRefund ? exchangeRefundMethod : undefined,
      items: newItems.map((item) => ({
        productId: item.productId,
        orderedQuantity: item.qty,
        unitPrice: item.price,
        discountPercent: item.discountPercent || 0,
      })),
      orderDiscount:
        totals.orderDiscount > 0
          ? { type: "fixed", value: totals.orderDiscount }
          : undefined,
      promoCode: appliedPromoCode?._id,
      promoCodeApplied: appliedPromoCode
        ? { code: appliedPromoCode.code, discountAmount: totals.promoDiscount }
        : undefined,
      giftVoucher: appliedGiftVoucher?._id,
      giftVoucherApplied: appliedGiftVoucher
        ? { code: appliedGiftVoucher.code, discountAmount: totals.voucherDiscount }
        : undefined,
      promotion: appliedPromotion?._id,
      promotionApplied: appliedPromotion
        ? { name: appliedPromotion.name, discountAmount: totals.promotionDiscount }
        : undefined,
      status: draft ? "draft" : "approved",
      cashReceived: draft || remainingToPay === 0 ? undefined : +cashReceived,
      changeReturned: draft || remainingToPay === 0 ? undefined : Math.max(0, +cashReceived - remainingToPay - (Number(creditToSave) || 0)),
    });
    const receiptObj = {
      type: "invoice",
      id: result.invoiceId || result.data?._id,
      orderId: result.data?._id,
      order: result.data,
      invoice: result.invoice,
      invoiceNumber: result.invoiceNumber || result.invoice?.invoiceNumber || result.data?.orderNumber,
    };
    setCompletedReceipt(receiptObj);
    setLastReceipt(receiptObj);
    setCart([]);
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setDiscountPercent(0);
    setDiscountAmount(0);
    setCashReceived("");
    setPaymentMethod("cash");
    setSelectedBankId("");
    setUseStoreCredit(false);
    setCreditToSave("");
    setAppliedPromoCode(null);
    setPromoOverride("");
    setAppliedGiftVoucher(null);
    setVoucherOverride("");
    setAppliedPromotion(null);
    setCashModal(false);
    toast.success("Order & Payment completed successfully!");
  };
  const expected =
    (activeSession?.openingBalance || 0) +
    (activeSession?.cashSales || 0) -
    (activeSession?.cashExpenses || 0);
  if (loadingSession)
    return <div className="py-12 text-center">Loading POS...</div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">POS Terminal</h1>
          <p className="text-sm text-gray-500">
            Cash register and point-of-sale checkout
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastReceipt && !completedReceipt && (
            <Button
              variant="outline"
              onClick={() => setCompletedReceipt(lastReceipt)}
              className="flex items-center gap-1.5 border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-xs shadow-xs"
            >
              <FileText size={14} />
              Last Receipt
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setReturnExchangeModalOpen(true)}
            className="flex items-center gap-1.5 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300 font-semibold shadow-xs"
          >
            <RotateCcw size={15} />
            Return / Exchange
          </Button>
          <Link href="/pos-sessions">
            <Button variant="outline">POS Registers</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select
                label="Cashier"
                value={selectedCashierId}
                onChange={(event) => setSelectedCashierId(event.target.value)}
                options={usersList.map((u) => ({
                  value: u._id,
                  label: `${u.firstName} ${u.lastName}`,
                }))}
              />
              <Select
                label="Warehouse"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                options={warehouses.map((warehouse) => ({
                  value: warehouse._id,
                  label: `${warehouse.name} (${warehouse.warehouseCode})`,
                }))}
              />
              <Select
                label="Customer"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setCustomerName("");
                }}
                options={customers.map((customer) => ({
                  value: customer._id,
                  label: `${customer.displayName} (${customer.customerCode})`,
                }))}
              />
              {activeSession ? (
                <Button
                  variant="outline"
                  className="self-end"
                  onClick={() => setClosingModal(true)}
                >
                  Close Register
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="self-end"
                  onClick={() => setOpeningModal(true)}
                >
                  Open Cash Register
                </Button>
              )}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input
                label="Or type customer name"
                value={customerName}
                disabled={!!customerId}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <Input
                label="Customer phone"
                value={customerPhone}
                disabled={!!customerId}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="self-end"
                title="Quick Create Customer"
                onClick={() => setQuickCustomerModalOpen(true)}
              >
                <UserPlus size={16} />
              </Button>
            </div>
            {customerId && (() => {
              const selectedCustomer = customers.find(c => c._id === customerId);
              const storeCredit = selectedCustomer?.creditStatus?.storeCredit || 0;
              return (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-2 border border-indigo-200">
                  <span className="text-sm font-semibold text-indigo-900">Available Store Credit for {selectedCustomer?.displayName}</span>
                  <span className="text-lg font-bold text-indigo-700">{money(storeCredit)}</span>
                </div>
              );
            })()}
          </Card>
          <Card className="p-4">
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <Input
                className="pl-10"
                placeholder="Search products by name, code, or barcode..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.slice(0, 60).map((product) => {
                const available = Math.max(
                  0,
                  (stock.get(product._id)?.onHand || 0) -
                    (stock.get(product._id)?.reserved || 0),
                );
                const buyingPrice = product.purchasePrice || product.costs?.standardCost || 0;
                const wholesalePrice = product.tierPricing?.[0]?.price || 0;
                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className={`rounded-lg border p-4 text-left transition-all hover:shadow-lg hover:border-primary-400 hover:bg-gradient-to-br hover:from-primary-50 hover:to-white disabled:opacity-50 ${!available ? 'bg-gray-50' : 'bg-white'}`}
                    disabled={!available}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500">
                          <span className="font-mono text-primary-600">{product.productCode}</span>
                          {product.sku && <span>• SKU: {product.sku}</span>}
                          {product.categoryId?.name && <span>• {product.categoryId.name}</span>}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {available}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-gray-50 p-2">
                        <p className="text-gray-500">Buying</p>
                        <p className="font-semibold text-gray-700">{money(buyingPrice)}</p>
                      </div>
                      <div className="rounded bg-primary-50 p-2">
                        <p className="text-primary-600">Selling</p>
                        <p className="font-semibold text-primary-700">{money(product.basePrice)}</p>
                      </div>
                      {wholesalePrice > 0 && (
                        <div className="rounded bg-amber-50 p-2">
                          <p className="text-amber-600">Wholesale</p>
                          <p className="font-semibold text-amber-700">{money(wholesalePrice)}</p>
                        </div>
                      )}
                      {product.callPrice > 0 && (
                        <div className="rounded bg-purple-50 p-2">
                          <p className="text-purple-600">Call</p>
                          <p className="font-semibold text-purple-700">{money(product.callPrice)}</p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
        {completedReceipt ? (
          <PosReceiptPanel
            receiptInfo={completedReceipt}
            onNewSale={() => setCompletedReceipt(null)}
          />
        ) : (
          <Card className="h-fit p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <ShoppingCart size={18} />
              Cart
            </h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Your cart is empty.
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                if (item.isReturn) {
                  return (
                    <div
                      key={`return-${item.productId}-${item.originalInvoiceId || 'ret'}`}
                      className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/70 via-rose-50/30 to-amber-50/30 p-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                              Exchange Return
                            </span>
                            {item.originalInvoiceNumber && (
                              <span className="font-mono text-[10px] text-gray-500 font-semibold">
                                Ref: {item.originalInvoiceNumber}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-semibold text-gray-900 text-sm">
                            {item.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>{money(item.price)} each</span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                item.condition === "resellable"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {item.condition === "resellable" ? "🟢 Resellable" : "🔴 Damaged"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-rose-600 text-sm">
                            -{money(item.qty * item.price)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-rose-200/50 pt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0 bg-white"
                            onClick={() => updateQty(item.productId, item.qty - 1, true)}
                          >
                            <Minus size={12} />
                          </Button>
                          <span className="w-7 text-center font-bold text-sm text-rose-900">
                            {item.qty}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0 bg-white"
                            onClick={() => updateQty(item.productId, item.qty + 1, true)}
                          >
                            <Plus size={12} />
                          </Button>
                        </div>

                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, 0, true)}
                          className="text-rose-600 hover:bg-rose-100/70 p-1 rounded-md transition-colors"
                          title="Remove return item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                }

                const itemDiscounts = totals.breakdown?.filter(d => d.type === 'item' && d.productId === item.productId) || [];
                const itemDiscountAmount = itemDiscounts.reduce((sum, d) => sum + d.amount, 0);
                
                return (
                <div key={item.productId} className="border-b pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(item.isBag ||
                        bagProducts.some((b) => b._id === item.productId)) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          <ShoppingBag size={11} /> Bag
                        </span>
                      )}
                      <p className="font-medium">{item.name}</p>
                    </div>
                    <p className="font-semibold text-right">
                      {itemDiscountAmount > 0 || item.discountPercent > 0 ? (
                        <>
                          <span className="line-through text-gray-400 text-xs mr-2">{money(item.qty * item.price)}</span>
                          <span className="text-emerald-600">{money((item.qty * item.price) - itemDiscountAmount - (item.qty * item.price * (item.discountPercent || 0)) / 100)}</span>
                        </>
                      ) : (
                        money(item.qty * item.price)
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">{money(item.price)} each</p>
                  
                  {itemDiscounts.map((d, i) => (
                    <p key={i} className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                      <Tag size={12} /> {d.name} {d.description ? `(${d.description})` : ''} -{money(d.amount)}
                    </p>
                  ))}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQty(item.productId, item.qty - 1, false)}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center">{item.qty}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQty(item.productId, item.qty + 1, false)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative w-20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Disc %"
                          value={item.discountPercent === undefined ? "" : item.discountPercent}
                          onChange={(e) => updateItemDiscount(item.productId, e.target.value)}
                          className="w-full rounded border border-gray-200 py-1 pl-2 pr-6 text-xs outline-none transition-colors focus:border-indigo-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateQty(item.productId, 0, false)}
                        className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
              <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
                <div className="border-b border-indigo-100/50 bg-indigo-50/50 px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                    <Tag size={16} className="text-indigo-600" />
                    Offers & Discounts
                  </h3>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Promo Code */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <Ticket size={14} className="text-emerald-500" />
                        Promo Code
                      </label>
                      {!appliedPromoCode ? (
                        <div className="flex rounded-lg shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
                          <input
                            placeholder="Enter code"
                            value={promoCode}
                            onChange={(event) => setPromoCode(event.target.value)}
                            className="w-full min-w-0 rounded-l-lg border border-r-0 border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-emerald-500 uppercase"
                          />
                          <button 
                            type="button" 
                            onClick={applyPromoCode}
                            className="flex items-center rounded-r-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                              <span className="text-sm font-bold tracking-wide text-emerald-800">{appliedPromoCode.code}</span>
                            </div>
                            <button type="button" onClick={clearPromoCode} className="rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-800">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between border-t border-emerald-200/60 pt-2">
                            <span className="text-xs font-semibold text-emerald-700">Deduct Amount:</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-semibold">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                value={promoOverride !== "" ? promoOverride : (calculationResult?.breakdown?.find(b => b.type === 'promo')?.amount || "")}
                                onChange={(e) => setPromoOverride(e.target.value)}
                                className="w-full max-w-[120px] rounded-md border border-emerald-200 bg-white pl-7 pr-2 py-1 text-sm font-semibold text-emerald-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder="Amount"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gift Voucher */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <Gift size={14} className="text-blue-500" />
                        Gift Voucher
                      </label>
                      {!appliedGiftVoucher ? (
                        <div className="flex rounded-lg shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                          <input
                            placeholder="Enter voucher"
                            value={giftVoucher}
                            onChange={(event) => setGiftVoucher(event.target.value)}
                            className="w-full min-w-0 rounded-l-lg border border-r-0 border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 uppercase"
                          />
                          <button 
                            type="button" 
                            onClick={applyGiftVoucher}
                            className="flex items-center rounded-r-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-blue-500" />
                              <span className="text-sm font-bold tracking-wide text-blue-800">{appliedGiftVoucher.code}</span>
                            </div>
                            <button type="button" onClick={clearGiftVoucher} className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between border-t border-blue-200/60 pt-2">
                            <span className="text-xs font-semibold text-blue-700">Deduct Amount:</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-500 text-xs font-semibold">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                value={voucherOverride !== "" ? voucherOverride : (calculationResult?.breakdown?.find(b => b.type === 'voucher')?.amount || "")}
                                onChange={(e) => setVoucherOverride(e.target.value)}
                                className="w-full max-w-[120px] rounded-md border border-blue-200 bg-white pl-7 pr-2 py-1 text-sm font-semibold text-blue-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Amount"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <Percent size={14} className="text-indigo-500" />
                        Manual Discount (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={(event) => setDiscountPercent(event.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <Minus size={14} className="text-indigo-500" />
                        Flat Discount (LKR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={discountAmount}
                          onChange={(event) => setDiscountAmount(event.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {applicablePromotions.length > 0 && !appliedPromotion && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 p-3 shadow-sm">
                      <p className="mb-2 text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <Tag size={14} /> Available Auto-Promotions
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {applicablePromotions.slice(0, 4).map((promo) => (
                          <button
                            key={promo._id}
                            type="button"
                            onClick={() => setAppliedPromotion(promo)}
                            className="group relative flex flex-col items-start overflow-hidden rounded-lg border border-amber-200/60 bg-white/80 px-3 py-2 text-left text-xs transition-all hover:border-amber-400 hover:bg-white hover:shadow-md"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/0 to-amber-400/10 opacity-0 transition-opacity group-hover:opacity-100" />
                            <span className="font-bold text-amber-950">{promo.name}</span>
                            {promo.type === "percentage_discount" && <span className="mt-0.5 font-medium text-amber-700">{promo.discountPercent}% off</span>}
                            {promo.type === "fixed_discount" && <span className="mt-0.5 font-medium text-amber-700">{money(promo.discountValue)} off</span>}
                            {promo.type === "buy_x_get_y" && <span className="mt-0.5 font-medium text-amber-700">Buy {promo.buyQuantity} Get {promo.getQuantity} Free</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {appliedPromotion && (
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-50 px-4 py-3 text-sm shadow-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-amber-600" />
                        <span className="font-bold text-amber-900">{appliedPromotion.name}</span>
                      </div>
                      <button type="button" onClick={() => setAppliedPromotion(null)} className="rounded-full bg-white/50 p-1.5 text-amber-700 hover:bg-white hover:text-amber-900 transition-colors shadow-sm">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {/* Shopping Bags Cart Bar */}
                  {bagProducts.length > 0 && (
                    <div className="mt-2.5 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <ShoppingBag size={16} className="text-indigo-600 shrink-0" />
                        <div>
                          {totalBagsInCart > 0 ? (
                            <span className="font-semibold text-indigo-950">
                              {totalBagsInCart} Bag(s) added
                            </span>
                          ) : (
                            <span className="text-gray-600">Shopping Bags</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalBagsInCart > 0 && (
                          <button
                            type="button"
                            onClick={handleRemoveBags}
                            className="text-gray-400 hover:text-rose-600 p-0.5 transition-colors"
                            title="Remove bags"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={openBagModal}
                          className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {totalBagsInCart > 0 ? "Change" : "+ Issue Bags"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1 border-t pt-3 text-sm">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(totals.subtotal)}</span>
                </p>
                {totals.orderDiscount > 0 && (
                  <p className="flex justify-between text-gray-600">
                    <span>Order Discount</span>
                    <span>-{money(totals.orderDiscount)}</span>
                  </p>
                )}
                {totals.breakdown?.map((item, idx) => (
                  <p key={idx} className={`flex justify-between ${item.type === 'voucher' ? 'text-blue-600' : 'text-amber-600'}`}>
                    <span>{item.name}</span>
                    <span>{item.amount === 0 ? item.description : `-${money(item.amount)}`}</span>
                  </p>
                ))}
                {(!totals.breakdown || totals.breakdown.length === 0) && totals.promoDiscount > 0 && (
                  <p className="flex justify-between text-green-600">
                    <span>Promo Code</span>
                    <span>-{money(totals.promoDiscount)}</span>
                  </p>
                )}
                {(!totals.breakdown || totals.breakdown.length === 0) && totals.voucherDiscount > 0 && (
                  <p className="flex justify-between text-blue-600">
                    <span>Gift Voucher</span>
                    <span>-{money(totals.voucherDiscount)}</span>
                  </p>
                )}
                {(!totals.breakdown || totals.breakdown.length === 0) && totals.promotionDiscount > 0 && (
                  <p className="flex justify-between text-amber-600">
                    <span>Promotion</span>
                    <span>-{money(totals.promotionDiscount)}</span>
                  </p>
                )}
                {totals.returnCreditTotal > 0 && (
                  <p className="flex justify-between text-rose-600 font-semibold">
                    <span>Return / Exchange Credit</span>
                    <span>-{money(totals.returnCreditTotal)}</span>
                  </p>
                )}
                <p className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>
                    {totals.grandTotal < 0
                      ? "Net Refund Due"
                      : totals.grandTotal === 0
                      ? "Net Total (Even Swap)"
                      : "Net Total"}
                  </span>
                  <span
                    className={
                      totals.grandTotal < 0
                        ? "text-rose-600"
                        : totals.grandTotal === 0
                        ? "text-emerald-600"
                        : "text-indigo-900"
                    }
                  >
                    {money(Math.abs(totals.grandTotal))}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => submitOrder(true)}
                  disabled={createOrder.isPending}
                >
                  Draft
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCheckoutClick}
                  disabled={createOrder.isPending}
                >
                  Checkout
                </Button>
              </div>
            </div>
          )}
        </Card>
        )}
      </div>
      <QuickCreateCustomerModal
        isOpen={quickCustomerModalOpen}
        onClose={() => setQuickCustomerModalOpen(false)}
        onCreated={(customer) => {
          setCustomerId(customer._id);
          setCustomerName("");
          setCustomerPhone("");
        }}
        isPosMode
      />
      <Modal
        isOpen={openingModal}
        onClose={() => setOpeningModal(false)}
        title="Open Cash Register"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-gray-500">
            Please enter the opening cash balance in the drawer to start
            selling.
          </p>
          <Input
            label="Opening Balance (LKR)"
            type="number"
            required
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
          />
          <Textarea
            label="Notes (Optional)"
            value={openingNotes}
            onChange={(event) => setOpeningNotes(event.target.value)}
          />
          <Button
            fullWidth
            variant="primary"
            loading={openSession.isPending}
            onClick={async () => {
              await openSession.mutateAsync({
                cashierId: selectedCashierId || user?._id,
                openingBalance: openingBalance || 0,
                notes: openingNotes,
              });
              setOpeningModal(false);
            }}
          >
            Open Register
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={closingModal}
        onClose={() => setClosingModal(false)}
        title="Close Cash Register (Handover)"
      >
        <div className="space-y-4 p-5">
          <div className="rounded-lg border bg-gray-50 p-4 text-sm">
            <p>Opening Balance: {money(activeSession?.openingBalance)}</p>
            <p>Cash Sales: +{money(activeSession?.cashSales)}</p>
            <p>Cash Expenses: -{money(activeSession?.cashExpenses)}</p>
            <p className="mt-2 border-t pt-2 font-bold">
              Expected Cash in Drawer: {money(expected)}
            </p>
          </div>
          <Input
            label="Actual Cash in Drawer (LKR)"
            type="number"
            required
            value={actualBalance}
            onChange={(event) => setActualBalance(event.target.value)}
          />
          <p className="font-bold">
            Difference: {money((+actualBalance || 0) - expected)}
          </p>
          <Textarea
            label="Closing Notes / Handover Details"
            value={closingNotes}
            onChange={(event) => setClosingNotes(event.target.value)}
          />
          <Button
            fullWidth
            variant="primary"
            loading={closeSession.isPending}
            onClick={async () => {
              await closeSession.mutateAsync({
                cashierId: selectedCashierId || user?._id,
                actualClosingBalance: actualBalance || 0,
                notes: closingNotes,
              });
              setClosingModal(false);
            }}
          >
            Close Register
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={cashModal}
        onClose={() => setCashModal(false)}
        title={totals.grandTotal < 0 ? "POS Exchange Refund" : totals.grandTotal === 0 ? "POS Even Exchange" : "POS Checkout"}
      >
        <div className="space-y-4 p-5">
          {totals.grandTotal < 0 ? (
            /* NET REFUND SCENARIO */
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50/50 p-4 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Refund Due to Customer
                </span>
                <p className="mt-1 text-3xl font-black text-rose-600">
                  {money(Math.abs(totals.grandTotal))}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Returned goods value exceeds newly purchased items.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Select Refund Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExchangeRefundMethod("cash")}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      exchangeRefundMethod === "cash"
                        ? "border-rose-500 bg-rose-50/50 shadow-xs ring-1 ring-rose-500"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">💵 Cash Refund</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Payout from POS Cash Drawer
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExchangeRefundMethod("store_credit")}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      exchangeRefundMethod === "store_credit"
                        ? "border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">💳 Store Credit</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Save to customer&apos;s account balance
                    </p>
                  </button>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="primary"
                className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
                loading={createOrder.isPending}
                onClick={() => {
                  setCashModal(false);
                  submitOrder(false);
                }}
              >
                Confirm & Refund {money(Math.abs(totals.grandTotal))}
              </Button>
            </div>
          ) : totals.grandTotal === 0 ? (
            /* EVEN SWAP SCENARIO */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-base font-bold text-emerald-900">Direct Even Exchange</p>
                <p className="mt-1 text-xs text-emerald-700">
                  New items value matches returned credit exactly. No additional payment or cash payout needed.
                </p>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="primary"
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                loading={createOrder.isPending}
                onClick={() => {
                  setCashModal(false);
                  submitOrder(false);
                }}
              >
                Confirm Exchange & Complete
              </Button>
            </div>
          ) : (
            /* NET PAYABLE SCENARIO */
            <>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Net Bill Amount:</span>
                <span className="text-2xl text-indigo-700">{money(totals.grandTotal)}</span>
              </div>

              {(() => {
                const selectedCustomer = customers.find((c) => c._id === customerId);
                const availableCredit = selectedCustomer?.creditStatus?.storeCredit || 0;
                const appliedStoreCredit = useStoreCredit
                  ? Math.min(availableCredit, totals.grandTotal)
                  : 0;
                const remainingToPay = Math.max(0, totals.grandTotal - appliedStoreCredit);

                return (
                  <>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Available Store Credit</p>
                        <p className="text-lg font-bold text-indigo-700">{money(availableCredit)}</p>
                      </div>
                      {availableCredit > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600"
                            checked={useStoreCredit}
                            onChange={(e) => setUseStoreCredit(e.target.checked)}
                          />
                          <span className="text-sm font-medium text-indigo-900">Use Credit</span>
                        </label>
                      )}
                    </div>

                    {useStoreCredit && (
                      <div className="flex items-center justify-between text-md font-semibold text-gray-700 border-t pt-2">
                        <span>Remaining Payable:</span>
                        <span className="text-xl text-red-600">{money(remainingToPay)}</span>
                      </div>
                    )}

                    {remainingToPay > 0 ? (
                      <>
                        <div className="pt-2">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Payment Method
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant={paymentMethod === "cash" ? "primary" : "outline"}
                              onClick={() => setPaymentMethod("cash")}
                              className="py-3"
                            >
                              Cash
                            </Button>
                            <Button
                              variant={paymentMethod === "card" ? "primary" : "outline"}
                              onClick={() => setPaymentMethod("card")}
                              className="py-3"
                            >
                              Card
                            </Button>
                            <Button
                              variant={paymentMethod === "bank_transfer" ? "primary" : "outline"}
                              onClick={() => setPaymentMethod("bank_transfer")}
                              className="py-3"
                            >
                              Bank
                            </Button>
                          </div>
                        </div>

                        {paymentMethod === "bank_transfer" && (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mt-2 mb-2">
                            <Select
                              label="Select Bank Account"
                              value={selectedBankId}
                              onChange={(e) => setSelectedBankId(e.target.value)}
                              options={[
                                { value: "", label: "Select Bank..." },
                                ...bankAccounts.map((bank) => ({
                                  value: bank._id,
                                  label: `${bank.bankName} - ${bank.accountName} (${bank.accountNumber})`,
                                })),
                              ]}
                            />
                          </div>
                        )}

                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4 mt-2">
                          <Input
                            label={
                              paymentMethod === "cash"
                                ? "Cash Received (LKR)"
                                : "Amount Received (LKR)"
                            }
                            type="number"
                            autoFocus
                            value={cashReceived}
                            onChange={(event) => setCashReceived(event.target.value)}
                          />
                          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-700">
                                {paymentMethod === "cash" ? "Change to Return:" : "Overpaid Amount:"}
                              </span>
                              <span className="text-xl font-bold text-emerald-600">
                                {money(Math.max(0, (+cashReceived || 0) - remainingToPay))}
                              </span>
                            </div>
                            {(+cashReceived || 0) > remainingToPay && (
                              <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <span className="text-sm font-semibold text-amber-900">
                                  Add to Store Credit:
                                </span>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-600 text-xs font-semibold">
                                    Rs.
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={(+cashReceived || 0) - remainingToPay}
                                    value={creditToSave}
                                    onChange={(e) => {
                                      const val = Math.min(
                                        Number(e.target.value),
                                        (+cashReceived || 0) - remainingToPay
                                      );
                                      setCreditToSave(e.target.value === "" ? "" : val);
                                    }}
                                    className="w-full max-w-[120px] rounded-md border border-amber-300 bg-white pl-7 pr-2 py-1 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            )}
                            {Number(creditToSave) > 0 && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                                <span className="font-bold text-gray-800">
                                  {paymentMethod === "cash"
                                    ? "Final Handover Change:"
                                    : "Remaining Refund:"}
                                </span>
                                <span className="text-2xl font-black text-emerald-600">
                                  {money(
                                    Math.max(
                                      0,
                                      (+cashReceived || 0) -
                                        remainingToPay -
                                        Number(creditToSave)
                                    )
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center mt-2">
                        <p className="text-emerald-700 font-semibold">
                          Bill is fully covered by Store Credit.
                        </p>
                      </div>
                    )}

                    <Button
                      fullWidth
                      size="lg"
                      variant="primary"
                      className="mt-4"
                      loading={createOrder.isPending}
                      onClick={() => {
                        if (
                          remainingToPay > 0 &&
                          paymentMethod === "bank_transfer" &&
                          !selectedBankId
                        ) {
                          return toast.error("Please select a bank account");
                        }
                        setCashModal(false);
                        submitOrder(false);
                      }}
                      disabled={
                        remainingToPay > 0 &&
                        ((+cashReceived || 0) < remainingToPay ||
                          (paymentMethod === "bank_transfer" && !selectedBankId))
                      }
                    >
                      Confirm & Pay
                    </Button>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </Modal>
      <PosReturnExchangeModal
        isOpen={returnExchangeModalOpen}
        onClose={() => setReturnExchangeModalOpen(false)}
        warehouseId={warehouseId}
        onAddExchangeToCart={handleAddExchangeToCart}
        onReturnCompleted={(returnData) => {
          if (returnData?.returnId) {
            const returnReceiptObj = {
              type: "return",
              id: returnData.returnId,
              rmaNumber: returnData.rmaNumber,
            };
            setCompletedReceipt(returnReceiptObj);
            setLastReceipt(returnReceiptObj);
          }
        }}
      />
    </div>
  );
}
