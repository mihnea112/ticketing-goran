"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Asigură-te că ai rulat: npm install recharts
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

// --- CONFIGURARE URL API ---
// Pe Vercel va folosi variabila de mediu, local va folosi localhost:4000
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- INTERFEȚE API ---
interface DashboardData {
  stats: {
    revenue: number;
    orders: number;
    ticketsSold: number;
    totalCapacity: number;
  };
  chart: { day: string; sales: number }[];
  inventory: {
    id: string;
    name: string;
    code: string;
    price: number;
    totalQuantity: number;
    soldQuantity: number;
  }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. VERIFICARE AUTH & FETCH DATA ---
  useEffect(() => {
    // Check Auth (Simplu, bazat pe localStorage)
    const isAuth = localStorage.getItem('admin_auth');
    if (!isAuth) {
      router.push('/admin/login');
      return;
    }

    // Fetch API
    const fetchData = async () => {
      try {
        // MODIFICARE: Folosim API_URL dinamic
        const res = await fetch(`${API_URL}/api/admin/stats`);
        
        if (!res.ok) throw new Error('Eroare server');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        // Opțional: Dacă API-ul dă eroare (ex: server jos), poți afișa un mesaj sau face logout
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // --- 2. LOGICĂ UI ---
  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    router.push('/admin/login');
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0905] flex items-center justify-center text-yellow-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Calculăm date derivate
  const availableSeats = data.stats.totalCapacity - data.stats.ticketsSold;
  
  // Formatare bani
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-[#0a0905]">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-[#14120c] p-8 rounded-3xl border border-yellow-900/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-900 via-yellow-500 to-yellow-900"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black mb-2 text-[#faeacc]">Panou Control</h1>
            <p className="text-yellow-100/40 flex items-center gap-4 text-sm font-bold uppercase tracking-wider">
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">verified_user</span> Administrator</span>
            </p>
          </div>
          <div className="flex gap-4 relative z-10">
            <button 
              onClick={handleLogout}
              className="h-12 px-6 border border-red-500/30 text-red-400 font-bold rounded-xl flex items-center gap-2 hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span> 
              Log out
            </button>
            <button className="h-12 px-6 bg-yellow-500 text-black font-bold rounded-xl flex items-center gap-2 hover:bg-[#faeacc] transition-colors shadow-lg shadow-yellow-500/20">
              <span className="material-symbols-outlined">refresh</span> 
              <span className="hidden sm:inline" onClick={() => window.location.reload()}>Actualizează</span>
            </button>
          </div>
        </div>

        {/* --- STATS CARDS (Dynamic) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Venit */}
          <StatCard 
            label="Venit Total" 
            value={formatCurrency(data.stats.revenue)} 
            icon="payments" 
            trend="Live" 
            isPositive={true} 
          />
          {/* Card Bilete */}
          <StatCard 
            label="Bilete Vândute" 
            value={data.stats.ticketsSold.toString()} 
            icon="confirmation_number" 
            trend={`${Math.round((data.stats.ticketsSold / data.stats.totalCapacity) * 100)}%`} 
            isPositive={true} 
            subLabel="grad de ocupare"
          />
          {/* Card Disponibile */}
          <StatCard 
            label="Locuri Disponibile" 
            value={availableSeats.toString()} 
            icon="event_seat" 
            trend={availableSeats < 100 ? "CRITIC" : "Normal"} 
            isPositive={availableSeats > 100} 
          />
          {/* Card Comenzi */}
          <StatCard 
            label="Total Comenzi" 
            value={data.stats.orders.toString()} 
            icon="receipt_long" 
            trend="Procesate" 
            isPositive={null} 
          />
        </div>

        {/* --- CHARTS & STATUS --- */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Chart (Dynamic) */}
          <div className="lg:col-span-2 bg-[#14120c] border border-yellow-900/20 rounded-3xl p-8 relative">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-[#faeacc]">Vânzări (7 zile)</h3>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#854d0e', fontSize: 12}} 
                    dy={10} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1a1810', border: '1px solid #854d0e', borderRadius: '12px', color: '#faeacc'}}
                    itemStyle={{color: '#eab308'}}
                    cursor={{stroke: '#eab308', strokeWidth: 1}}
                    formatter={(value: number) => [`${value} RON`, 'Vânzări']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#eab308" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Bars (Dynamic) */}
          <div className="bg-[#14120c] border border-yellow-900/20 rounded-3xl p-8 flex flex-col">
            <h3 className="text-2xl font-black mb-8 text-[#faeacc]">Status Categorii</h3>
            <div className="space-y-8 flex-1">
              {data.inventory.map((cat) => (
                <div key={cat.id} className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-yellow-100/80">{cat.name}</span>
                    <span className="text-yellow-600/60 font-mono">{cat.soldQuantity}/{cat.totalQuantity}</span>
                  </div>
                  <div className="h-2 bg-yellow-900/10 rounded-full overflow-hidden border border-yellow-900/10">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(234,179,8,0.2)] ${
                        cat.code === 'gold' ? 'bg-yellow-400' : cat.code === 'tribune' ? 'bg-[#faeacc]' : 'bg-yellow-700'
                      }`} 
                      style={{width: `${(cat.soldQuantity / cat.totalQuantity) * 100}%`}}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- INVENTORY TABLE (Dynamic) --- */}
        <div className="bg-[#14120c] border border-yellow-900/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-yellow-900/20 flex justify-between items-center bg-[#0f0e0a]">
            <h3 className="text-2xl font-black text-[#faeacc]">Inventar Detaliat</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-yellow-900/10 text-yellow-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Categorie</th>
                  <th className="px-8 py-5">Preț</th>
                  <th className="px-8 py-5">Total</th>
                  <th className="px-8 py-5">Vândute</th>
                  <th className="px-8 py-5">Venit Generat</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-900/10 text-sm">
                {data.inventory.map((row) => {
                   const percentage = (row.soldQuantity / row.totalQuantity) * 100;
                   let status = 'Activ';
                   if (percentage >= 100) status = 'Sold Out';
                   else if (percentage > 80) status = 'Critic';

                   return (
                    <tr key={row.id} className="hover:bg-yellow-500/5 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-bold text-[#faeacc]">{row.name}</p>
                        <p className="text-xs text-yellow-700 uppercase">{row.code}</p>
                      </td>
                      <td className="px-8 py-6 text-yellow-500 font-bold font-mono">{row.price} RON</td>
                      <td className="px-8 py-6 text-yellow-100/40">{row.totalQuantity}</td>
                      <td className="px-8 py-6 text-[#faeacc] font-bold">{row.soldQuantity}</td>
                      <td className="px-8 py-6 text-green-500 font-mono">
                         {formatCurrency(row.soldQuantity * row.price)}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          status === 'Sold Out' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          status === 'Activ' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Componentă mică pentru Carduri ---
function StatCard({ label, value, icon, trend, isPositive, subLabel }: any) {
    return (
        <div className="bg-[#14120c] p-8 rounded-3xl border border-yellow-900/20 group hover:border-yellow-500/50 transition-all hover:bg-yellow-900/5">
            <div className="flex justify-between items-start mb-4">
            <span className="text-yellow-600 font-bold uppercase tracking-widest text-[10px]">{label}</span>
            <span className="material-symbols-outlined text-yellow-500 group-hover:scale-110 transition-transform bg-yellow-500/10 p-2 rounded-lg">{icon}</span>
            </div>
            <p className="text-3xl font-black mb-2 text-[#faeacc]">{value}</p>
            <p className={`text-xs font-bold flex items-center gap-1 ${
                isPositive === true ? 'text-green-400' : 
                isPositive === false ? 'text-red-400' : 'text-gray-500'
            }`}>
            {trend} <span className="text-yellow-900/40 font-normal">{subLabel || ''}</span>
            </p>
        </div>
    )
}