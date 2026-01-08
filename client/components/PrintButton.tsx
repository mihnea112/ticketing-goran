// components/PrintButton.tsx
"use client";

import React from "react";

export default function PrintButton() {
  return (
    <button
      className="mt-4 bg-gray-800 text-white px-6 py-2 rounded hover:bg-black transition print:hidden shadow-lg font-bold"
      onClick={() => window.print()}
    >
      🖨️ Printează Biletele
    </button>
  );
}