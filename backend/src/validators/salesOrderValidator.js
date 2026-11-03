import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');
const optionalObjectId = z.union([objectId, z.literal(''), z.null()]).optional().transform((val) => val || undefined);

const lineItemSchema = z.object({
    productId: objectId,
    orderedQuantity: z.coerce.number().min(0.01, 'Quantity must be > 0'),
    unitPrice: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    notes: z.string().optional(),
});

export const createSalesOrderSchema = z.object({
    customerId: objectId,
    sourceWarehouseId: optionalObjectId,
    source: z.enum(['direct', 'quotation', 'field_rep', 'phone', 'whatsapp', 'recurring', 'pos']).optional(),
    orderDate: z.string().optional(),
    requestedDeliveryDate: z.string().optional(),
    shippingAddressLabel: z.string().optional(),
    items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    orderDiscount: z.object({
        type: z.enum(['percentage', 'fixed']).optional(),
        value: z.coerce.number().min(0).optional(),
        reason: z.string().optional(),
    }).optional().nullable(),
    shippingCost: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    customerNotes: z.string().optional(),
    internalNotes: z.string().optional(),
    specialInstructions: z.string().optional(),
    status: z.enum(['draft', 'pending_approval', 'approved']).optional(),
    creditOverride: z.boolean().optional(),
    creditOverrideReason: z.string().optional(),
    cashReceived: z.coerce.number().min(0).optional(),
    changeReturned: z.coerce.number().min(0).optional(),
    paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'split', 'other']).optional(),
    splitPayments: z.object({
        cash: z.number().nonnegative().optional(),
        card: z.number().nonnegative().optional(),
        bank: z.number().nonnegative().optional(),
    }).optional(),
    transactionReference: z.string().optional(),
    bankName: z.string().optional(),
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankAccountId: optionalObjectId,
    loyaltyDiscount: z.object({
        pointsRedeemed: z.coerce.number().min(0).optional(),
        discountAmount: z.coerce.number().min(0).optional(),
    }).optional().nullable(),
    loyaltyPointsEarned: z.coerce.number().min(0).optional(),
    coupon: z.object({
        code: z.string().optional(),
        type: z.enum(['percentage', 'fixed', 'gift_card']).optional(),
        value: z.coerce.number().optional(),
        discountAmount: z.coerce.number().min(0).optional(),
    }).optional().nullable(),
});

export const updateSalesOrderSchema = createSalesOrderSchema.partial();