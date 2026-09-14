"use client";

import React from "react";
import { PAYMENT_METHODS, calculateFee } from "@/lib/fees";
import { BankLogo } from "./PaymentLogos";

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onSelectMethod: (methodId: string) => void;
  subtotal: number;
}

const GROUPS = [
  { key: "QR Code", title: "QRIS" },
  { key: "Virtual Accounts", title: "Transfer Bank (Virtual Account)" },
  { key: "E-Wallets", title: "E-Wallet" },
  { key: "Cards", title: "Kartu Kredit / Debit" },
  { key: "Retail", title: "Minimarket" },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  subtotal,
}: PaymentMethodSelectorProps) {
  const adminFee = selectedMethod ? calculateFee(subtotal, selectedMethod) : 0;
  const grandTotal = subtotal + adminFee;

  return (
    <div className="space-y-4 py-1">
      {/* Payment Method Groups */}
      <div className="space-y-4">
        {GROUPS.map((group) => {
          const methods = PAYMENT_METHODS.filter((pm) => pm.group === group.key);
          if (methods.length === 0) return null;

          return (
            <div key={group.key} className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 px-0.5">
                {group.title}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {methods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  const fee = calculateFee(subtotal, method.id);

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => onSelectMethod(method.id)}
                      className={`relative flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-brand bg-brand-50/60 shadow-2xs ring-1 ring-brand/30"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Logo Image Box */}
                        <div className="w-12 h-8 shrink-0 flex items-center justify-center bg-white rounded-md border border-gray-200/80 p-1">
                          <BankLogo id={method.id} alt={method.label} className="max-h-full max-w-full object-contain mx-auto" />
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-gray-900 truncate">
                            {method.label}
                          </div>
                          {fee > 0 ? (
                            <div className="text-[11px] text-gray-500 font-normal">
                              +Biaya Rp {fee.toLocaleString("id-ID")}
                            </div>
                          ) : (
                            <div className="text-[11px] text-brand font-medium">
                              Bebas Biaya Admin
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clean Radio Selection Indicator */}
                      <div className="ml-2 shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-brand bg-brand"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rincian Pembayaran */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 space-y-1.5 mt-3">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Subtotal</span>
          <span className="font-semibold text-gray-900">Rp {subtotal.toLocaleString("id-ID")}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Biaya Layanan Admin</span>
          <span className={`font-semibold ${adminFee > 0 ? "text-amber-700" : "text-brand"}`}>
            {adminFee > 0 ? `+Rp ${adminFee.toLocaleString("id-ID")}` : "Rp 0"}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Total Pembayaran</span>
          <span className="text-base font-black text-gray-900">
            Rp {grandTotal.toLocaleString("id-ID")}
          </span>
        </div>
      </div>
    </div>
  );
}
