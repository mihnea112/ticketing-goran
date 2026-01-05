"use client";

import React, { useState, useEffect } from "react";
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminScanPage() {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const router = useRouter();

  // --- 1. VERIFICARE LOGIN ---
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    }
  }, []);

  const handleScan = async (detectedCodes: any[]) => {
    if (paused || loading) return;
    
    const rawValue = detectedCodes[0]?.rawValue;
    if (!rawValue || rawValue === lastScan) return;

    setLastScan(rawValue);
    setLoading(true);
    setPaused(true);

    try {
      const audio = new Audio('/beep.mp3'); 
      audio.play().catch(() => {}); 

      // --- 2. TRIMITEM TOKEN-UL ÎN HEADER ---
      const token = localStorage.getItem("adminToken");

      const res = await fetch(`${API_URL}/api/admin/scan`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": token || "" // Aici trimitem parola secretă (token)
        },
        body: JSON.stringify({ qrCode: rawValue }),
      });

      // Dacă serverul zice 401 (Unauthorized), îl trimitem la login
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        router.push("/admin/login");
        return;
      }

      const data = await res.json();
      setScanResult(data);

    } catch (err) {
      console.error(err);
      setScanResult({ valid: false, message: "Eroare conexiune server" });
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setLastScan(null);
    setPaused(false);
  };

  // Buton Logout
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#14120c]">
        <h1 className="font-bold text-yellow-500 text-xl">Scanner Acces</h1>
        <button onClick={handleLogout} className="text-xs text-red-500 font-bold uppercase border border-red-900/50 px-3 py-1 rounded hover:bg-red-900/20">
            Log Out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {!scanResult && (
          <div className="w-full max-w-md aspect-square relative border-2 border-yellow-500/30 rounded-3xl overflow-hidden bg-gray-900">
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
              </div>
            )}
            
            <Scanner 
              onScan={handleScan}
              components={{ audio: false, finder: false }} 
              styles={{ container: { width: '100%', height: '100%' } }}
            />

            <div className="absolute inset-0 border-[40px] border-black/50 z-10 pointer-events-none">
                <div className="w-full h-full border-2 border-yellow-500/50 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-yellow-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-yellow-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-yellow-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-yellow-500"></div>
                </div>
            </div>
            
            <p className="absolute bottom-4 left-0 w-full text-center text-sm font-bold text-white z-20 shadow-black drop-shadow-md">
                Încadrează codul QR
            </p>
          </div>
        )}

        {scanResult && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-200 ${
            scanResult.valid ? 'bg-green-600' : 'bg-red-600'
          }`}>
            
            <div className="bg-white rounded-full p-6 mb-6 shadow-xl">
                <span className={`material-symbols-outlined text-6xl font-black ${
                    scanResult.valid ? 'text-green-600' : 'text-red-600'
                }`}>
                    {scanResult.valid ? 'check' : 'close'}
                </span>
            </div>

            <h2 className="text-4xl font-black uppercase mb-2 text-white drop-shadow-md">
                {scanResult.valid ? 'ACCES PERMIS' : 'ACCES REFUZAT'}
            </h2>

            {scanResult.valid ? (
                <div className="bg-black/20 p-6 rounded-xl w-full max-w-sm backdrop-blur-sm border border-white/20">
                    <p className="text-green-100 text-sm uppercase font-bold mb-1">Invitat</p>
                    <p className="text-2xl font-bold mb-4">{scanResult.customer}</p>
                    
                    <div className="flex justify-between border-t border-white/20 pt-4">
                        <div className="text-left">
                            <p className="text-green-100 text-xs uppercase">Categorie</p>
                            <p className="font-bold">{scanResult.category}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-green-100 text-xs uppercase">Bilet</p>
                            <p className="font-bold">{scanResult.ticketNumber}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-black/20 p-6 rounded-xl w-full max-w-sm backdrop-blur-sm border border-white/20">
                    <p className="text-red-100 font-bold text-lg">{scanResult.message}</p>
                </div>
            )}

            <button 
                onClick={resetScanner}
                className="mt-12 bg-white text-black font-black uppercase tracking-widest px-10 py-5 rounded-full shadow-2xl hover:scale-105 transition-transform"
            >
                Scanează Următorul
            </button>
          </div>
        )}

      </div>
    </div>
  );
}