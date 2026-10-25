import "server-only";
import Promotion from "../models/Promotion.js";
import GiftVoucher from "../models/GiftVoucher.js";
import PromoCode from "../models/PromoCode.js";
import Customer from "../models/Customer.js";

/**
 * Calculates discounts for a given cart based on active promotions and a voucher.
 * @param {Array} items - Array of cart items { productId, quantity, unitPrice, categoryId }
 * @param {String} customerId - Customer ID string
 * @param {String} paymentMethod - 'cash', 'card', 'any'
 * @param {String} promoCode - Applied promo code string
 * @param {String} voucherCode - Applied voucher code string
 * @returns {Object} { totalDiscount, discountBreakdown, items (with applied discounts), voucherDiscount }
 */
export async function calculateDiscounts(items, customerId, paymentMethod, promoCode, voucherCode) {
  let subtotal = 0;
  const enrichedItems = items.map(item => {
    const total = item.quantity * item.unitPrice;
    subtotal += total;
    return { ...item, lineTotal: total, discountPercent: 0, discountAmount: 0, freeQuantity: 0 };
  });

  const breakdown = [];
  let cartDiscount = 0;
  let voucherDiscount = 0;

  const now = new Date();

  // Fetch customer to check loyalty tags
  let customerObj = null;
  if (customerId) {
    customerObj = await Customer.findById(customerId);
  }

  // 1. Hardcoded Loyalty Discounts (Req 2)
  if (customerObj && customerObj.tags) {
    if (customerObj.tags.includes('VIP') || customerObj.tags.includes('vip') || customerObj.tags.includes('Regular') || customerObj.tags.includes('regular')) {
      const loyaltyDiscount = subtotal * 0.05;
      cartDiscount += loyaltyDiscount;
      breakdown.push({ name: "Loyalty Discount", amount: loyaltyDiscount, type: 'cart', description: '5% off' });
    }
  }

  // 2. Fetch Active Promotions
  const activePromos = await Promotion.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    status: "active"
  });

  // Filter promos
  const applicablePromos = activePromos.filter(promo => {
    // Payment method check
    if (promo.requiredPaymentMethod && promo.requiredPaymentMethod !== "any" && promo.requiredPaymentMethod !== paymentMethod) return false;
    // Min purchase amount
    if (promo.minPurchaseAmount && subtotal < promo.minPurchaseAmount) return false;
    // Promo code match
    if (promo.promoCode && promo.promoCode.toLowerCase() !== (promoCode || "").toLowerCase()) return false;
    // If promoCode is required but none provided
    if (promo.promoCode && !promoCode) return false;
    return true;
  });

  applicablePromos.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const promo of applicablePromos) {
    if (promo.type === "percentage_discount" || promo.type === "fixed_discount") {
      if (promo.applicableTo === "all") {
        const discountVal = promo.type === "percentage_discount" 
          ? (subtotal * promo.discountPercent / 100) 
          : promo.discountValue;
          
        const actualDiscount = promo.maxDiscountAmount ? Math.min(discountVal, promo.maxDiscountAmount) : discountVal;
        cartDiscount += actualDiscount;
        breakdown.push({ name: promo.name, amount: actualDiscount, type: 'cart' });
      } else {
        enrichedItems.forEach(item => {
          if ((promo.applicableTo === "products" && promo.applicableProducts?.includes(item.productId)) ||
              (promo.applicableTo === "categories" && promo.applicableCategories?.includes(item.categoryId))) {
            const discountVal = promo.type === "percentage_discount"
              ? (item.lineTotal * promo.discountPercent / 100)
              : (promo.discountValue * item.quantity);
              
            item.discountAmount += discountVal;
            breakdown.push({ name: promo.name, amount: discountVal, type: 'item', productId: item.productId });
          }
        });
      }
    } else if (promo.type === "buy_x_get_y") {
      enrichedItems.forEach(item => {
        if (promo.buyProducts?.includes(item.productId)) {
          const groupSize = promo.buyQuantity + promo.getQuantity;
          if (item.quantity >= groupSize) {
            const groups = Math.floor(item.quantity / groupSize);
            const freeQty = groups * promo.getQuantity;
            const discountVal = freeQty * item.unitPrice;
            item.discountAmount += discountVal;
            item.freeQuantity += freeQty;
            breakdown.push({ 
              name: promo.name, 
              amount: discountVal, 
              type: 'item', 
              productId: item.productId,
              description: `${freeQty} Free (BXGY)` 
            });
          }
        }
      });
    } else if (promo.type === "tiered_discount") {
      if (promo.tiers && promo.tiers.length > 0) {
        const sortedTiers = [...promo.tiers].sort((a, b) => b.minAmount - a.minAmount);
        const applicableTier = sortedTiers.find(t => subtotal >= t.minAmount);
        if (applicableTier) {
          const discountVal = (subtotal * applicableTier.discountPercent / 100);
          cartDiscount += discountVal;
          breakdown.push({ name: promo.name, amount: discountVal, type: 'cart', description: `Tier > ${applicableTier.minAmount}` });
        }
      }
    } else if (promo.type === "bundle_offer") {
      if (promo.bundleItems && promo.bundleItems.length > 0) {
        let possibleBundles = Infinity;
        const bundleItemMap = new Map();
        promo.bundleItems.forEach(bi => bundleItemMap.set(bi.productId.toString(), bi.quantity));
        
        bundleItemMap.forEach((reqQty, pId) => {
          const cartItem = enrichedItems.find(i => i.productId.toString() === pId);
          if (!cartItem) possibleBundles = 0;
          else {
            possibleBundles = Math.min(possibleBundles, Math.floor(cartItem.quantity / reqQty));
          }
        });
        
        if (possibleBundles > 0 && possibleBundles !== Infinity) {
          let normalPrice = 0;
          bundleItemMap.forEach((reqQty, pId) => {
            const cartItem = enrichedItems.find(i => i.productId.toString() === pId);
            normalPrice += (reqQty * cartItem.unitPrice);
          });
          
          const bundleDiscountPerSet = normalPrice - promo.bundlePrice;
          if (bundleDiscountPerSet > 0) {
            const totalBundleDiscount = bundleDiscountPerSet * possibleBundles;
            cartDiscount += totalBundleDiscount;
            breakdown.push({ name: promo.name, amount: totalBundleDiscount, type: 'bundle', description: `${possibleBundles}x Bundles` });
          }
        }
      }
    }
  }

  let finalTotal = subtotal - cartDiscount - enrichedItems.reduce((acc, item) => acc + item.discountAmount, 0);
  let promoDiscount = 0;
  
  if (promoCode) {
    const pCode = await PromoCode.findOne({ 
      code: promoCode.toUpperCase(), 
      status: "active",
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });
    if (pCode) {
      if (!pCode.usageLimit || pCode.usageCount < pCode.usageLimit) {
        if (!pCode.minPurchaseAmount || subtotal >= pCode.minPurchaseAmount) {
          if (pCode.applicableTo === "all" || (pCode.applicableTo === "customers" && customerId && pCode.applicableCustomers?.includes(customerId))) {
            const val = pCode.discountType === "percentage" ? (finalTotal * pCode.discountValue / 100) : pCode.discountValue;
            promoDiscount = pCode.maxDiscountAmount ? Math.min(val, pCode.maxDiscountAmount) : val;
            promoDiscount = Math.min(finalTotal, promoDiscount);
            cartDiscount += promoDiscount;
            finalTotal -= promoDiscount;
            breakdown.push({ name: `Promo (${pCode.code})`, amount: promoDiscount, type: 'promo' });
          }
        }
      }
    }
  }

  if (voucherCode) {
    const voucher = await GiftVoucher.findOne({ 
      code: voucherCode.toUpperCase(), 
      status: "active",
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });
    if (voucher && (!voucher.singleUse || !voucher.usedAt)) {
      if (!voucher.minPurchaseAmount || subtotal >= voucher.minPurchaseAmount) {
         let val = voucher.type === "percentage" ? (finalTotal * voucher.value / 100) : voucher.value;
         voucherDiscount = Math.min(finalTotal, val);
         finalTotal -= voucherDiscount;
         breakdown.push({ name: `Voucher (${voucher.code})`, amount: voucherDiscount, type: 'voucher' });
      }
    }
  }

  const totalItemDiscount = enrichedItems.reduce((acc, item) => acc + item.discountAmount, 0);

  return {
    subtotal,
    cartDiscount,
    itemDiscount: totalItemDiscount,
    voucherDiscount,
    totalDiscount: cartDiscount + totalItemDiscount + voucherDiscount,
    finalTotal: Math.max(0, finalTotal),
    breakdown,
    items: enrichedItems
  };
}
