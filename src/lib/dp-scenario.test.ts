import { test, expect } from "vitest";
import { shiftSummary } from "./billing-store";
const H = 3600_000, t0 = 1_000_000_000_000;
const shift: any = { id: "s1", cashierName: "Wildan", openedAt: t0, startCash: 100000 };
const rec = (at: number, total: number, payment: string): any => ({ id: String(at), paidAt: at, endAt: at, total, payment, rentalTotal: total, fnbTotal: 0 });
const ce = (at: number, amount: number, direction: "in"|"out", payment: string, payout: boolean): any => ({ id: "c"+at, createdAt: at, amount, direction, payment, payout, categoryName: "DP" });
test("hari 1: rental cash 13rb + QRIS 26rb + DP QRIS 10rb", () => {
  const s = shiftSummary(shift, [rec(t0+H,13000,"Cash"), rec(t0+2*H,26000,"QRIS")], [ce(t0+3*H,10000,"in","QRIS",true)], t0+5*H);
  console.log("HARI1", s); expect(s.expected).toBe(113000);
});
test("hari 1 varian DP tunai", () => {
  const s = shiftSummary(shift, [rec(t0+H,13000,"Cash"), rec(t0+2*H,26000,"QRIS")], [ce(t0+3*H,10000,"in","Cash",true)], t0+5*H);
  console.log("HARI1-TUNAI", s); expect(s.expected).toBe(123000);
});
test("hari 2: check-in pakai DP tunai 10rb, sisa 20rb tunai", () => {
  const sh2 = { ...shift, openedAt: t0+24*H };
  const s = shiftSummary(sh2, [{ ...rec(t0+25*H,30000,"Cash"), payments: [{method:"Cash",amount:10000},{method:"Cash",amount:20000}] }], [ce(t0+25*H,10000,"out","Cash",true)], t0+30*H);
  console.log("HARI2", s); expect(s.expected).toBe(120000);
});
