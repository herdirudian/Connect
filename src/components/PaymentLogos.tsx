"use client";

import React from "react";

const LOGO_MAP: Record<string, string> = {
  QRIS: "/img/Logo-Bank/QRIS.png",
  BRI_VA: "/img/Logo-Bank/BRI.png",
  MANDIRI_VA: "/img/Logo-Bank/Bank_Mandiri_logo_2016.svg.webp",
  BNI_VA: "/img/Logo-Bank/BNI.webp",
  BSI_VA: "/img/Logo-Bank/BSI.webp",
  CIMB_VA: "/img/Logo-Bank/CIMB-Niaga.png",
  PERMATA_VA: "/img/Logo-Bank/Permata_Bank_(2024).svg.webp",
  BJB_VA: "/img/Logo-Bank/BJB.png",
  SAMPOERNA_VA: "/img/Logo-Bank/sampoerna.png",
  SHOPEEPAY: "/img/Logo-Bank/Shopee-pay.png",
  ASTRAPAY: "/img/Logo-Bank/astrapay.png",
  CC: "/img/Logo-Bank/Visa-mastercard.jpg",
  INDOMARET: "/img/Logo-Bank/indomaret.png",
};

export function BankLogo({
  id,
  alt = "Logo Pembayaran",
  className = "max-h-full max-w-full object-contain",
}: {
  id: string;
  alt?: string;
  className?: string;
}) {
  const logoUrl = LOGO_MAP[id];

  if (!logoUrl) {
    return (
      <div className="text-[10px] font-black text-gray-500 uppercase">
        {id.replace("_VA", "")}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
