import "server-only";
import PromoCode from "../models/PromoCode.js";

export const createPromoCode = async (req, res) => {
  const promoCode = await PromoCode.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: promoCode });
};

export const getPromoCodes = async (req, res) => {
  const { search, status } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }
  if (status) filter.status = status;

  const promoCodes = await PromoCode.find(filter)
    .populate("applicableProducts", "name productCode")
    .populate("applicableCategories", "name")
    .populate("applicableCustomers", "displayName customerCode")
    .populate("customerGroups", "name")
    .sort({ createdAt: -1 });

  res.json({ success: true, count: promoCodes.length, data: promoCodes });
};

export const getPromoCodeById = async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id)
    .populate("applicableProducts", "name productCode")
    .populate("applicableCategories", "name")
    .populate("applicableCustomers", "displayName customerCode")
    .populate("customerGroups", "name");
  if (!promoCode) {
    res.status(404);
    throw new Error("Promo code not found");
  }
  res.json({ success: true, data: promoCode });
};

export const validatePromoCode = async (req, res) => {
  const { code, customerId, cartTotal } = req.body;
  const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });

  if (!promoCode) {
    res.status(404);
    throw new Error("Invalid promo code");
  }

  if (!promoCode.isValid()) {
    res.status(400);
    throw new Error("Promo code is not valid or has expired");
  }

  if (cartTotal < promoCode.minPurchaseAmount) {
    res.status(400);
    throw new Error(`Minimum purchase amount is ${promoCode.minPurchaseAmount}`);
  }

  if (!promoCode.canBeUsedBy(customerId)) {
    res.status(400);
    throw new Error("This promo code is not applicable to this customer");
  }

  res.json({ success: true, data: promoCode });
};

export const updatePromoCode = async (req, res) => {
  const promoCode = await PromoCode.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!promoCode) {
    res.status(404);
    throw new Error("Promo code not found");
  }
  res.json({ success: true, data: promoCode });
};

export const deletePromoCode = async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id);
  if (!promoCode) {
    res.status(404);
    throw new Error("Promo code not found");
  }
  promoCode.deletedAt = new Date();
  await promoCode.save();
  res.json({ success: true, message: "Promo code deleted" });
};
