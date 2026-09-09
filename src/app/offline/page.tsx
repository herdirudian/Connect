"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-emerald-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-emerald-900/60 p-6 rounded-full border border-emerald-700/50 mb-6 animate-pulse">
        <WifiOff className="w-16 h-16 text-emerald-300" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Anda sedang Offline
      </h1>

      <p className="text-emerald-200/80 max-w-md mb-8 text-sm sm:text-base leading-relaxed">
        Koneksi internet Anda tampaknya terputus. Beberapa halaman mungkin memerlukan koneksi aktif untuk memperbarui data terbaru.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          onClick={() => window.location.reload()}
          className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold gap-2 shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </Button>

        <Link href="/" className="w-full">
          <Button
            variant="outline"
            className="border-emerald-700 text-emerald-100 hover:bg-emerald-900/80 w-full"
          >
            Kembali ke Beranda
          </Button>
        </Link>
      </div>

      <p className="mt-12 text-xs text-emerald-400/60">
        The Lodge Connect &bull; Offline Mode
      </p>
    </div>
  );
}
