import "server-only";
import BankAccount from "../models/BankAccount.js";
import Cheque from "../models/Cheque.js";

export async function createCheque(req, res) {
  const cheque = await Cheque.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: cheque });
}

export async function getCheques(req, res) {
  const { status, direction, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (direction) {
    filter.direction = direction;
  }
  if (search) {
    filter.$or = [
      { chequeNumber: { $regex: search, $options: "i" } },
      { bankName: { $regex: search, $options: "i" } },
      { payeeName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [cheques, total] = await Promise.all([
    Cheque.find(filter)
      .sort({ chequeDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("customerId", "displayName")
      .populate("supplierId", "displayName")
      .populate("paymentId", "paymentNumber")
      .populate("depositedBankAccountId", "accountName"),
    Cheque.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: cheques,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
  });
}

export async function updateChequeStatus(req, res) {
  const { status, clearedDate, bouncedDate, bouncedReason } = req.body;
  const cheque = await Cheque.findById(req.params.id);

  if (!cheque) {
    res.status(404);
    throw new Error("Cheque not found");
  }

  const oldStatus = cheque.status;
  cheque.status = status;

  if (clearedDate) {
    cheque.clearedDate = clearedDate;
  }
  if (bouncedDate) {
    cheque.bouncedDate = bouncedDate;
  }
  if (bouncedReason) {
    cheque.bouncedReason = bouncedReason;
  }
  if (req.body.depositedBankAccountId) {
    cheque.depositedBankAccountId = req.body.depositedBankAccountId;
  }

  await cheque.save();

  if (
    status === "cleared" &&
    oldStatus !== "cleared" &&
    cheque.depositedBankAccountId
  ) {
    const bankAccount = await BankAccount.findById(
      cheque.depositedBankAccountId,
    );

    if (bankAccount) {
      const amountChange =
        cheque.direction === "incoming" ? cheque.amount : -cheque.amount;
      bankAccount.currentBalance = +(
        bankAccount.currentBalance + amountChange
      ).toFixed(2);
      await bankAccount.save();
    }
  }

  res.json({ success: true, data: cheque });
}

export async function getChequeById(req, res) {
  const cheque = await Cheque.findById(req.params.id)
    .populate("customerId", "displayName customerCode phone email")
    .populate("supplierId", "displayName supplierCode phone email")
    .populate("paymentId", "paymentNumber direction amount")
    .populate("depositedBankAccountId", "accountName bankName accountNumber branchName category")
    .populate("createdBy", "firstName lastName email");

  if (!cheque || cheque.deletedAt) {
    res.status(404);
    throw new Error("Cheque not found");
  }

  res.json({ success: true, data: cheque });
}

export async function updateCheque(req, res) {
  const cheque = await Cheque.findById(req.params.id);

  if (!cheque || cheque.deletedAt) {
    res.status(404);
    throw new Error("Cheque not found");
  }

  const {
    chequeNumber,
    chequeDate,
    amount,
    currency,
    bankName,
    branchName,
    payeeName,
    direction,
    status,
    customerId,
    supplierId,
    depositedBankAccountId,
    notes,
  } = req.body;

  if (chequeNumber !== undefined) cheque.chequeNumber = chequeNumber;
  if (chequeDate !== undefined) cheque.chequeDate = new Date(chequeDate);
  if (amount !== undefined) cheque.amount = Number(amount);
  if (currency !== undefined) cheque.currency = currency;
  if (bankName !== undefined) cheque.bankName = bankName;
  if (branchName !== undefined) cheque.branchName = branchName;
  if (payeeName !== undefined) cheque.payeeName = payeeName;
  if (direction !== undefined) cheque.direction = direction;
  if (status !== undefined) cheque.status = status;
  if (customerId !== undefined) cheque.customerId = customerId || undefined;
  if (supplierId !== undefined) cheque.supplierId = supplierId || undefined;
  if (depositedBankAccountId !== undefined)
    cheque.depositedBankAccountId = depositedBankAccountId || undefined;
  if (notes !== undefined) cheque.notes = notes;

  await cheque.save();

  const populated = await Cheque.findById(cheque._id)
    .populate("customerId", "displayName")
    .populate("supplierId", "displayName")
    .populate("depositedBankAccountId", "accountName bankName");

  res.json({ success: true, data: populated });
}

export async function deleteCheque(req, res) {
  const cheque = await Cheque.findById(req.params.id);

  if (!cheque || cheque.deletedAt) {
    res.status(404);
    throw new Error("Cheque not found");
  }

  if (cheque.status === "cleared" && cheque.depositedBankAccountId) {
    const bankAccount = await BankAccount.findById(cheque.depositedBankAccountId);
    if (bankAccount) {
      const reverseChange = cheque.direction === "incoming" ? -cheque.amount : cheque.amount;
      bankAccount.currentBalance = +(
        Number(bankAccount.currentBalance || 0) + reverseChange
      ).toFixed(2);
      await bankAccount.save();
    }
  }

  cheque.deletedAt = new Date();
  cheque.status = "cancelled";
  await cheque.save();

  res.json({ success: true, message: "Cheque deleted" });
}
