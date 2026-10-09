import type { Loan } from "./types.ts";
import { round2 } from "./commitments.ts";

/** Where a loan stands, all derived from its repayments. */
export interface LoanBalance {
  repaid: number;
  outstanding: number;
  settled: boolean;
  /** Has a due date that has passed and is not yet settled. */
  overdue: boolean;
}

export function loanBalance(loan: Loan, today: string): LoanBalance {
  const repaid = round2(loan.repayments.reduce((sum, r) => sum + r.amount, 0));
  const outstanding = round2(Math.max(loan.amount - repaid, 0));
  const settled = outstanding === 0;
  return {
    repaid,
    outstanding,
    settled,
    overdue: !settled && loan.dueDate !== undefined && loan.dueDate < today,
  };
}

/** The key loans are grouped under, so "Kofi" and " kofi " are one person. */
export function personKey(person: string): string {
  return person.trim().replace(/\s+/g, " ").toLowerCase();
}

export interface PersonLoans {
  /** The name as most recently written, for display. */
  person: string;
  loans: Loan[];
  lent: number;
  repaid: number;
  outstanding: number;
  overdue: boolean;
}

/**
 * Loans gathered by person, the people owing the most first, then anyone fully
 * settled up. Each person's loans are oldest first, the order they are repaid.
 */
export function loansByPerson(loans: Loan[], today: string): PersonLoans[] {
  const groups = new Map<string, PersonLoans>();

  const byDate = [...loans].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const loan of byDate) {
    const key = personKey(loan.person);
    const group = groups.get(key) ?? {
      person: loan.person.trim(),
      loans: [],
      lent: 0,
      repaid: 0,
      outstanding: 0,
      overdue: false,
    };
    const balance = loanBalance(loan, today);
    group.person = loan.person.trim();
    group.loans.push(loan);
    group.lent = round2(group.lent + loan.amount);
    group.repaid = round2(group.repaid + balance.repaid);
    group.outstanding = round2(group.outstanding + balance.outstanding);
    group.overdue ||= balance.overdue;
    groups.set(key, group);
  }

  return [...groups.values()].sort(
    (a, b) => b.outstanding - a.outstanding || a.person.localeCompare(b.person),
  );
}
