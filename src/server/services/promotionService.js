import "server-only";
import Promotion from "../models/Promotion.js";

export const createPromotion = async (req, res) => {
  const promotion = await Promotion.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: promotion });
};

export const getPromotions = async (req, res) => {
  const { search, status, type } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (status) filter.status = status;
  if (type) filter.type = type;

  const promotions = await Promotion.find(filter)
    .populate("buyProducts", "name productCode")
    .populate("buyCategories", "name")
    .populate("getProducts", "name productCode")
    .populate("getCategories", "name")
    .populate("applicableProducts", "name productCode")
    .populate("applicableCategories", "name")
    .populate("customerGroups", "name")
    .sort({ priority: -1, createdAt: -1 });

  res.json({ success: true, count: promotions.length, data: promotions });
};

export const getPromotionById = async (req, res) => {
  const promotion = await Promotion.findById(req.params.id)
    .populate("buyProducts", "name productCode")
    .populate("buyCategories", "name")
    .populate("getProducts", "name productCode")
    .populate("getCategories", "name")
    .populate("applicableProducts", "name productCode")
    .populate("applicableCategories", "name")
    .populate("customerGroups", "name");
  if (!promotion) {
    res.status(404);
    throw new Error("Promotion not found");
  }
  res.json({ success: true, data: promotion });
};

export const getApplicablePromotions = async (req, res) => {
  const { customerId, cartItems } = req.body;
  const filter = { status: "active" };
  const now = new Date();
  filter.validFrom = { $lte: now };
  filter.validUntil = { $gte: now };

  const promotions = await Promotion.find(filter)
    .populate("buyProducts", "name productCode")
    .populate("buyCategories", "name")
    .populate("getProducts", "name productCode")
    .populate("getCategories", "name")
    .populate("applicableProducts", "name productCode")
    .populate("applicableCategories", "name")
    .populate("customerGroups", "name")
    .sort({ priority: -1 });

  res.json({ success: true, data: promotions });
};

export const updatePromotion = async (req, res) => {
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!promotion) {
    res.status(404);
    throw new Error("Promotion not found");
  }
  res.json({ success: true, data: promotion });
};

export const deletePromotion = async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) {
    res.status(404);
    throw new Error("Promotion not found");
  }
  promotion.deletedAt = new Date();
  await promotion.save();
  res.json({ success: true, message: "Promotion deleted" });
};
