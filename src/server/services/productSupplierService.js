import "server-only";
import ProductSupplier from "../models/ProductSupplier.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";

export const getProductSuppliers = async (productId) => {
  const productSuppliers = await ProductSupplier.find({
    productId,
    status: "active",
  })
    .populate("supplierId", "displayName supplierCode status")
    .sort({ isPrimary: -1, buyingPrice: 1 });

  return productSuppliers;
};

export const addProductSupplier = async (data) => {
  const { productId, supplierId, buyingPrice, isPrimary, ...rest } = data;

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const existing = await ProductSupplier.findOne({
    productId,
    supplierId,
    deletedAt: null,
  });

  if (existing) {
    throw new Error("Product-Supplier mapping already exists");
  }

  if (isPrimary) {
    await ProductSupplier.updateMany(
      { productId, isPrimary: true },
      { isPrimary: false },
    );
  }

  const productSupplier = await ProductSupplier.create({
    productId,
    productCode: product.productCode,
    productName: product.name,
    supplierId,
    supplierCode: supplier.supplierCode,
    supplierName: supplier.displayName,
    buyingPrice,
    isPrimary,
    ...rest,
  });

  return productSupplier;
};

export const updateProductSupplier = async (id, data) => {
  const productSupplier = await ProductSupplier.findById(id);
  if (!productSupplier) {
    throw new Error("Product-Supplier mapping not found");
  }

  if (data.isPrimary && !productSupplier.isPrimary) {
    await ProductSupplier.updateMany(
      { productId: productSupplier.productId, isPrimary: true },
      { isPrimary: false },
    );
  }

  Object.assign(productSupplier, data);
  await productSupplier.save();

  return productSupplier;
};

export const deleteProductSupplier = async (id) => {
  const productSupplier = await ProductSupplier.findById(id);
  if (!productSupplier) {
    throw new Error("Product-Supplier mapping not found");
  }

  productSupplier.deletedAt = new Date();
  await productSupplier.save();

  return productSupplier;
};

export const getPrimarySupplier = async (productId) => {
  const primary = await ProductSupplier.findOne({
    productId,
    isPrimary: true,
    status: "active",
  }).populate("supplierId");

  return primary;
};

export const getBestBuyingPrice = async (productId) => {
  const productSuppliers = await ProductSupplier.find({
    productId,
    status: "active",
  })
    .sort({ buyingPrice: 1 })
    .limit(1);

  return productSuppliers[0] || null;
};
