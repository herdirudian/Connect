"use client";

import React from "react";
import { PAYMENT_METHODS, calculateFee } from "@/lib/fees";
import { CheckCircle2, Circle, QrCode, CreditCard, Building2, Wallet, Store, ShieldCheck, Lock } from "lucide-react";
import { BankLogo } from "./PaymentLogos";

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onSelectMethod: (methodId: string) => void;
  subtotal: number;
}

const GROUPS = [
  { key: "QR Code", title: "QRIS / QR Code", icon: QrCode, desc: "Instant Scan & Bayar" },
  { key: "Virtual Accounts", title: "Virtual Account (Bank Transfer)", icon: Building2, desc: "Otomatis Verifikasi 24/7" },
  { key: "E-Wallets", title: "E-Wallet", icon: Wallet, desc: "Aplikasi e-wallet" },
  { key: "Cards", title: "Kartu Kredit / Debit", icon: CreditCard, desc: "Visa, Mastercard, JCB" },
  { key: "Retail", title: "Minimarket / Retail", icon: Store, desc: "Bayar di Kasir" },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  subtotal,
}: PaymentMethodSelectorProps) {
  const adminFee = selectedMethod ? calculateFee(subtotal, selectedMethod) : 0;
  const grandTotal = subtotal + adminFee;
  const selectedObj = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <div className="space-y-6">
      {/* Grouped Payment Methods */}
      <div className="space-y-4">
        {GROUPS.map((group) => {
          const methods = PAYMENT_METHODS.filter((pm) => pm.group === group.key);
          if (methods.length === 0) return null;
          const GroupIcon = group.icon;

          return (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 pt-1">
                <div className="w-6 h-6 rounded-md bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
                  <GroupIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 leading-tight">
                    {group.title}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {methods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  const fee = calculateFee(subtotal, method.id);
                  const isPopular = method.id === "QRIS";

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => onSelectMethod(method.id)}
                      className={`relative flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-150 ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-gray-200/90 bg-white hover:border-emerald-300 hover:bg-gray-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Bank Logo Image */}
                        <div className="w-14 h-10 shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200/80 p-1 shadow-2xs overflow-hidden">
                          <BankLogo id={method.id} alt={method.label} className="max-h-full max-w-full object-contain mx-auto" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {method.label}
                            </span>
                            {isPopular && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-700 uppercase tracking-tight">
                                Populer
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {fee === 0 ? (
                              <span className="text-emerald-600 font-bold">Bebas Admin Fee</span>
                            ) : (
                              <span>Biaya: +Rp {fee.toLocaleString("id-ID")}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selection Checkmark */}
                      <div className="ml-2 shrink-0">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rincian Pembayaran Summary Card */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
          <span>Subtotal Pesanan</span>
          <span className="font-bold text-gray-900">Rp {subtotal.toLocaleString("id-ID")}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
          <span className="flex items-center gap-1">
            Biaya Layanan Admin
            {selectedObj && <span className="text-[11px] text-gray-400">({selectedObj.label})</span>}
          </span>
          <span className={`font-bold ${adminFee > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {adminFee > 0 ? `+Rp ${adminFee.toLocaleString("id-ID")}` : "Rp 0"}
          </span>
        </div>

        <div className="pt-2.5 border-t border-emerald-200/70 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">
              Total Pembayaran
            </div>
            <div className="text-xl font-black text-emerald-950">
              Rp {grandTotal.toLocaleString("id-ID")}
            </div>
          </div>

          {selectedObj && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              {selectedObj.label}
            </span>
          )}
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
        <Lock className="w-3 h-3 text-emerald-600" />
        <span>Pembayaran aman &amp; otomatis terverifikasi oleh Xendit Payment Gateway</span>
      </div>
    </div>
  );
}
