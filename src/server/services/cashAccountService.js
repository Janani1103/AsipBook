import "server-only";
import BankAccount from "../models/BankAccount.js";

/**
 * Returns the default system Cash in Hand / Petty Cash account.
 * If one does not already exist, it creates a default account.
 */
export async function getOrCreateCashAccount() {
  let cashAccount = await BankAccount.findOne({
    category: "cash",
    deletedAt: null,
  });

  if (!cashAccount) {
    cashAccount = await BankAccount.findOne({
      bankName: { $regex: /cash/i },
      deletedAt: null,
    });
  }

  if (!cashAccount) {
    cashAccount = await BankAccount.create({
      accountName: "Cash in Hand (Petty Cash)",
      accountNumber: "CASH-REGISTER-01",
      bankName: "Cash in Hand / පෙට්ටි කෑෂ්",
      branchName: "Main Cash Drawer",
      category: "cash",
      currentBalance: 0,
      currency: "LKR",
      isActive: true,
      notes: "Main cash drawer & petty cash balance register",
    });
  }

  return cashAccount;
}

/**
 * Adjusts cash account balance by a given delta amount (positive or negative).
 */
export async function adjustCashAccountBalance(amountChange, accountId = null) {
  let account;
  if (accountId) {
    account = await BankAccount.findById(accountId);
  }
  if (!account) {
    account = await getOrCreateCashAccount();
  }

  if (account) {
    account.currentBalance = +(
      Number(account.currentBalance || 0) + Number(amountChange || 0)
    ).toFixed(2);
    await account.save();
  }

  return account;
}
