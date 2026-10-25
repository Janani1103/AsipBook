import "server-only";
import GiftVoucher from "../models/GiftVoucher.js";

export const createGiftVoucher = async (req, res) => {
  const giftVoucher = await GiftVoucher.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: giftVoucher });
};

export const getGiftVouchers = async (req, res) => {
  const { search, status, issuedTo } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }
  if (status) filter.status = status;
  if (issuedTo) filter.issuedTo = issuedTo;

  const giftVouchers = await GiftVoucher.find(filter)
    .populate("issuedTo", "displayName customerCode")
    .populate("usedBy", "displayName customerCode")
    .populate("usedInOrder", "orderNumber")
    .sort({ createdAt: -1 });

  res.json({ success: true, count: giftVouchers.length, data: giftVouchers });
};

export const getGiftVoucherById = async (req, res) => {
  const giftVoucher = await GiftVoucher.findById(req.params.id)
    .populate("issuedTo", "displayName customerCode")
    .populate("usedBy", "displayName customerCode")
    .populate("usedInOrder", "orderNumber");
  if (!giftVoucher) {
    res.status(404);
    throw new Error("Gift voucher not found");
  }
  res.json({ success: true, data: giftVoucher });
};

export const validateGiftVoucher = async (req, res) => {
  const { code, customerId, cartTotal } = req.body;
  const giftVoucher = await GiftVoucher.findOne({ code: code.toUpperCase() });

  if (!giftVoucher) {
    res.status(404);
    throw new Error("Invalid gift voucher");
  }

  if (!giftVoucher.isValid()) {
    res.status(400);
    throw new Error("Gift voucher is not valid or has expired");
  }

  if (cartTotal < giftVoucher.minPurchaseAmount) {
    res.status(400);
    throw new Error(`Minimum purchase amount is ${giftVoucher.minPurchaseAmount}`);
  }

  res.json({ success: true, data: giftVoucher });
};

export const updateGiftVoucher = async (req, res) => {
  const giftVoucher = await GiftVoucher.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!giftVoucher) {
    res.status(404);
    throw new Error("Gift voucher not found");
  }
  res.json({ success: true, data: giftVoucher });
};

export const deleteGiftVoucher = async (req, res) => {
  const giftVoucher = await GiftVoucher.findById(req.params.id);
  if (!giftVoucher) {
    res.status(404);
    throw new Error("Gift voucher not found");
  }
  giftVoucher.deletedAt = new Date();
  await giftVoucher.save();
  res.json({ success: true, message: "Gift voucher deleted" });
};
