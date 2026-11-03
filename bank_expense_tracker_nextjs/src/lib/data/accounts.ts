import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { Account, type AccountDoc } from "@/models/account.model";
import { Transaction } from "@/models/transaction.model";
import { DB_SIGNED_PAISE } from "@/lib/data/aggregation";
import type { AccountDto } from "@/types/account";

/**
 * Every function here takes a `userId` that came from a verified session and
 * filters on it. There is no "find by id" variant that skips ownership.
 */

export async function getAccounts(userId: string): Promise<AccountDto[]> {
  await dbConnect();

  const accounts = (await Account.find({ userId })
    .sort({ createdAt: 1 })
    .lean()) as unknown as AccountDoc[];

  return accounts.map(toAccountDto);
}

export async function getPrimaryAccountDoc(
  userId: string,
): Promise<AccountDoc | null> {
  await dbConnect();

  return (await Account.findOne({ userId }).sort({ createdAt: 1 }).lean()) as
    unknown as AccountDoc | null;
}

export function toAccountDto(account: AccountDoc): AccountDto {
  const anchor = account.balanceAnchor;

  return {
    id: String(account._id),
    bankName: account.bankName,
    accountType: account.accountType,
    accountNumberLast4: last4(account.accountNumber),
    currency: "INR",
    currentBalancePaise: Math.round((account.currentBalance ?? 0) * 100),
    anchor: anchor
      ? {
          balancePaise: anchor.balancePaise,
          asOfDate: anchor.asOfDate.toISOString(),
          source: anchor.source,
          note: anchor.note ?? null,
        }
      : null,
    lastSyncedAt: account.lastSyncedAt
      ? account.lastSyncedAt.toISOString()
      : null,
  };
}

/** Never store or display more than the last four digits. */
export function last4(accountNumber: string | null | undefined): string {
  const digits = (accountNumber ?? "").replace(/\D/g, "");
  return digits.slice(-4);
}

/**
 * The cached `currentBalance` is a projection, not the truth. The truth is the
 * anchored-ledger formula, so it is recomputed on read rather than trusted.
 */
export async function currentBalancePaise(
  userId: string,
  account: AccountDoc,
): Promise<number> {
  await dbConnect();

  const anchor = account.balanceAnchor
    ? {
        balancePaise: account.balanceAnchor.balancePaise,
        asOfDate: account.balanceAnchor.asOfDate,
      }
    : null;

  const match: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    accountId: account._id,
    deletedAt: null,
  };

  if (anchor) {
    match.txnDate = { $gt: anchor.asOfDate };
  }

  const rows = await Transaction.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: DB_SIGNED_PAISE } } },
  ]);

  return (anchor?.balancePaise ?? 0) + (rows[0]?.total ?? 0);
}
