"use client";

import React from "react";

// Official/high-quality SVG Bank & Payment Logos

export function QrisLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="120" height="45" rx="6" fill="#EE3124" />
      <path d="M12 11H27V15H16V22H27V26H16V34H12V11Z" fill="white" />
      <path d="M30 11H44C47.5 11 50 13.5 50 17C50 20 48 22 45 22.5L51 34H46L40.5 23H34V34H30V11ZM34 15V19H43C45 19 46 18 46 17C46 16 45 15 43 15H34Z" fill="white" />
      <path d="M53 11H57V34H53V11Z" fill="white" />
      <path d="M60 29C60 26 63 24.5 68 24C73 23.5 75 22.5 75 20.5C75 19 73.5 17.5 70 17.5C66.5 17.5 64.5 19 64.5 21H60.5C60.5 17 64 14 70 14C76.5 14 79 17 79 20.5C79 25 75 26.5 70 27C66 27.5 64.5 28.5 64.5 30.5C64.5 32 66.5 33 70 33C74 33 76 31.5 76 29.5H80C80 33.5 76 36 70 36C63.5 36 60 33 60 29Z" fill="white" />
      <rect x="85" y="11" width="22" height="22" rx="3" fill="white" />
      <rect x="88" y="14" width="6" height="6" fill="#EE3124" />
      <rect x="98" y="14" width="6" height="6" fill="#EE3124" />
      <rect x="88" y="24" width="6" height="6" fill="#EE3124" />
      <rect x="98" y="24" width="6" height="6" fill="#EE3124" />
    </svg>
  );
}

export function BriLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#00529C" />
      <path d="M15 10H38C46 10 50 14 50 19.5C50 23 48 25.5 44 27C49 28.5 52 31.5 52 35.5C52 41 47 44 38 44H15V10ZM25 17V23H36C40 23 41.5 22 41.5 20C41.5 18 40 17 36 17H25ZM25 29V37H37C41 37 42.5 35.5 42.5 33C42.5 30.5 41 29 37 29H25Z" fill="white" />
      <path d="M56 10H78C86 10 90 13.5 90 18.5C90 22 88 24.5 84 26L92 44H81L74 27H66V44H56V10ZM66 17V21.5H76C79.5 21.5 81 20.5 81 19.2C81 17.8 79.5 17 76 17H66Z" fill="white" />
      <path d="M96 10H106V44H96V10Z" fill="white" />
      <path d="M110 10H128V16H110V10ZM110 38H128V44H110V38Z" fill="#F37023" />
    </svg>
  );
}

export function MandiriLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#0A2540" />
      <path d="M12 28C12 28 17 21 28 21C39 21 44 28 44 28" stroke="#FFC72C" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 19C18 19 23 13 32 13C41 13 46 19 46 19" stroke="#FFC72C" strokeWidth="4" strokeLinecap="round" />
      <text x="50" y="30" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="19">mandiri</text>
    </svg>
  );
}

export function BniLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="130" height="45" rx="6" fill="#F26522" />
      <text x="12" y="32" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="28" letterSpacing="1">BNI</text>
      <path d="M92 10L115 35H102L85 10H92Z" fill="#00667e" />
      <circle cx="114" cy="14" r="5" fill="#00667e" />
    </svg>
  );
}

export function BsiLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="130" height="45" rx="6" fill="#00A39D" />
      <path d="M22 13L24.5 19.5L31 20L26 24.5L27.5 31L22 27.5L16.5 31L18 24.5L13 20L19.5 19.5L22 13Z" fill="#F8A61A" />
      <text x="36" y="32" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="26" letterSpacing="1">BSI</text>
    </svg>
  );
}

export function CimbLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#8B0000" />
      <path d="M12 12H30L22 33H12L12 12Z" fill="#ED1C24" />
      <path d="M24 12H34L26 33H16L24 12Z" fill="#FFFFFF" />
      <text x="36" y="31" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="22" letterSpacing="0.5">CIMB</text>
    </svg>
  );
}

export function PermataLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#00875A" />
      <polygon points="20,12 32,22.5 20,33 8,22.5" fill="#85C441" />
      <polygon points="20,16 28,22.5 20,29 12,22.5" fill="#FFFFFF" />
      <text x="38" y="30" fill="white" fontFamily="sans-serif" fontWeight="800" fontSize="18">Permata</text>
    </svg>
  );
}

export function BjbLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="130" height="45" rx="6" fill="#005596" />
      <path d="M12 12H28C32 12 35 14 35 17.5C35 20 33 21.5 30 22.5C34 23.5 36 25.5 36 29.5C36 33.5 32 35 28 35H12V12ZM20 17V21H27C28.5 21 29.5 20.5 29.5 19C29.5 17.5 28.5 17 27 17H20ZM20 26V30H28C29.5 30 30.5 29.5 30.5 28C30.5 26.5 29.5 26 28 26H20Z" fill="#FDB913" />
      <text x="42" y="32" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="24">bjb</text>
    </svg>
  );
}

export function SampoernaLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#3F51B5" />
      <circle cx="24" cy="22.5" r="11" fill="#FFC107" />
      <text x="40" y="28" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="16">Sampoerna</text>
    </svg>
  );
}

export function ShopeePayLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#EE4D2D" />
      <path d="M16 14H32V32H16V14Z" fill="none" />
      <path d="M24 14C20.5 14 18 16.5 18 20V32H30V20C30 16.5 27.5 14 24 14ZM24 17C25.5 17 27 18 27 20H21C21 18 22.5 17 24 17Z" fill="white" />
      <text x="36" y="30" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="18">ShopeePay</text>
    </svg>
  );
}

export function AstraPayLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#0054A6" />
      <text x="14" y="30" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="20" letterSpacing="-0.5">AstraPay</text>
    </svg>
  );
}

export function CreditCardLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="130" height="45" rx="6" fill="#1A1F71" />
      <circle cx="35" cy="22.5" r="10" fill="#EB001B" fillOpacity="0.9" />
      <circle cx="47" cy="22.5" r="10" fill="#F79E1B" fillOpacity="0.9" />
      <text x="64" y="29" fill="white" fontFamily="sans-serif" fontWeight="800" fontSize="16">VISA/MC</text>
    </svg>
  );
}

export function IndomaretLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="140" height="45" rx="6" fill="#005DAA" />
      <rect x="10" y="8" width="120" height="8" fill="#E31E24" />
      <rect x="10" y="29" width="120" height="8" fill="#FFF100" />
      <text x="18" y="26" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="17">INDOMARET</text>
    </svg>
  );
}

export function OtherBankLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="130" height="45" rx="6" fill="#4A5568" />
      <text x="14" y="29" fill="white" fontFamily="sans-serif" fontWeight="800" fontSize="16">Bank Lain</text>
    </svg>
  );
}

export function BankLogo({ id, className = "h-6 w-auto" }: { id: string; className?: string }) {
  switch (id) {
    case "QRIS":
      return <QrisLogo className={className} />;
    case "BRI_VA":
      return <BriLogo className={className} />;
    case "MANDIRI_VA":
      return <MandiriLogo className={className} />;
    case "BNI_VA":
      return <BniLogo className={className} />;
    case "BSI_VA":
      return <BsiLogo className={className} />;
    case "CIMB_VA":
      return <CimbLogo className={className} />;
    case "PERMATA_VA":
      return <PermataLogo className={className} />;
    case "BJB_VA":
      return <BjbLogo className={className} />;
    case "SAMPOERNA_VA":
      return <SampoernaLogo className={className} />;
    case "SHOPEEPAY":
      return <ShopeePayLogo className={className} />;
    case "ASTRAPAY":
      return <AstraPayLogo className={className} />;
    case "CC":
      return <CreditCardLogo className={className} />;
    case "INDOMARET":
      return <IndomaretLogo className={className} />;
    default:
      return <OtherBankLogo className={className} />;
  }
}
