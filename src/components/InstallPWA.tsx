"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-emerald-950/95 backdrop-blur-md border border-emerald-700/60 shadow-2xl rounded-2xl p-4 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700/50 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-emerald-100">Instal Aplikasi TLM Connect</h4>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Akses cepat &amp; fitur offline di perangkat Anda
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-400 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {deferredPrompt && (
        <div className="mt-3 flex justify-end">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold gap-2 text-xs h-9 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Instal Sekarang
          </Button>
        </div>
      )}

      {isIOS && !deferredPrompt && (
        <div className="mt-3 pt-2 border-t border-emerald-800/60 text-xs text-emerald-200/90 flex items-center gap-1.5">
          <span>Tekan</span>
          <Share className="w-3.5 h-3.5 inline text-emerald-400" />
          <span>lalu pilih &ldquo;Tambahkan ke Layar Utama&rdquo;</span>
        </div>
      )}
    </div>
  );
}
