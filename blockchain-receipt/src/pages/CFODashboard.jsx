import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import Navbar from "../components/common/Navbar";
// --- PERBAIKAN: IMPORT YANG TADI HILANG ---
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
// ------------------------------------------
import { getReceipts } from "../services/api";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

// --- HELPERS ---
const formatCurrency = (val) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const CFODashboard = () => {
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  
  // Default "all" agar grafik tahun terlihat di awal
  const [timeRange, setTimeRange] = useState("all"); 

  const [allReceipts, setAllReceipts] = useState([]);
  const [displayStats, setDisplayStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getReceipts();
        setAllReceipts(data);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- 2. LOGIC FILTER & GROUPING ---
  useEffect(() => {
    if (!allReceipts) return;

    const now = new Date();
    let startDate = new Date("1970-01-01"); // Default ALL

    // Logic Filter Tanggal
    if (timeRange === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === "quarter") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (timeRange === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const filtered = allReceipts.filter(r => new Date(r.date) >= startDate);

    // Logic Statistik
    let totalSpend = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    const catMap = {};
    const trendMap = {};

    filtered.forEach(r => {
      const amount = Number(r.total) || 0;
      const status = (r.status || "").toLowerCase();
      const dateObj = new Date(r.date);

      if (status === "verified") {
        totalSpend += amount;
        verifiedCount++;
      } else if (status === "pending") {
        pendingCount++;
      }

      const cat = r.category || "Uncategorized";
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat] += amount;

      // --- LOGIC GROUPING GRAFIK DINAMIS ---
      let key = "";
      
      if (timeRange === "all") {
        // Group by TAHUN (2010, 2016, 2025)
        key = dateObj.getFullYear().toString();
      } else if (timeRange === "year") {
        // Group by BULAN (Jan, Feb)
        key = dateObj.toLocaleString('default', { month: 'short' });
      } else {
        // Group by TANGGAL (01 Nov, 24 Nov)
        key = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;
      }

      if (!trendMap[key]) trendMap[key] = 0;
      trendMap[key] += amount;
    });

    const compliance = filtered.length > 0 ? ((verifiedCount / filtered.length) * 100).toFixed(1) : 0;

    // Format Charts
    const categories = Object.keys(catMap)
      .map(k => ({ name: k, value: catMap[k] }))
      .sort((a,b) => b.value - a.value);

    // Sorting Trend
    let trends = [];
    const keys = Object.keys(trendMap);

    if (timeRange === "year") {
      // Sort Bulan
      const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      trends = keys.sort((a, b) => monthsOrder.indexOf(a) - monthsOrder.indexOf(b))
                   .map(k => ({ name: k, amount: trendMap[k] }));
    } else {
      // Sort Tahun/Tanggal (Ascending)
      trends = keys.sort((a, b) => {
         // Trik sort string angka/tahun
         return a.localeCompare(b, undefined, { numeric: true });
      }).map(k => ({ name: k, amount: trendMap[k] }));
    }

    if (trends.length === 0) trends.push({ name: "No Data", amount: 0 });

    setDisplayStats({
      summary: {
        total: totalSpend,
        processed: filtered.length,
        compliance: compliance,
        pending: pendingCount
      },
      categories,
      trends,
      recent: filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
    });

  }, [timeRange, allReceipts]);

  // --- ANIMATION ---
  useEffect(() => {
    if (!displayStats) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".stat-card", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.1 });
    }, dashboardRef);
    return () => ctx.revert();
  }, [displayStats]);

  if (loading) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-cyan-500">Loading Financial Data...</div>;
  if (!displayStats) return <div className="min-h-screen bg-[#0B0F19] p-20 text-center text-slate-500">No data found.</div>;

  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-cyan-500", "bg-orange-500"];
  const maxCatVal = Math.max(...displayStats.categories.map(c => c.value), 1);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-cyan-500/30" ref={dashboardRef}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        
        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Financial Overview</h1>
            <p className="text-slate-400">Real-time analytics based on blockchain ledger.</p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            {["month", "quarter", "year", "all"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  timeRange === range ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {range === 'all' ? 'All Time' : range === 'year' ? 'This Year' : range === 'month' ? 'This Month' : 'This Quarter'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <div className="stat-card bg-[#0F1623] border border-white/5 p-5 rounded-2xl">
              <div className="text-slate-500 text-xs font-bold uppercase mb-2">Total Verified Spend</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(displayStats.summary.total)}</div>
           </div>
           <div className="stat-card bg-[#0F1623] border border-white/5 p-5 rounded-2xl">
              <div className="text-slate-500 text-xs font-bold uppercase mb-2">Receipts Processed</div>
              <div className="text-2xl font-bold text-white">{displayStats.summary.processed}</div>
           </div>
           <div className="stat-card bg-[#0F1623] border border-white/5 p-5 rounded-2xl">
              <div className="text-slate-500 text-xs font-bold uppercase mb-2">Compliance Rate</div>
              <div className="text-2xl font-bold text-white">{displayStats.summary.compliance}%</div>
           </div>
           <div className="stat-card bg-[#0F1623] border border-white/5 p-5 rounded-2xl">
              <div className="text-slate-500 text-xs font-bold uppercase mb-2">Pending Review</div>
              <div className="text-2xl font-bold text-amber-400">{displayStats.summary.pending}</div>
           </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Spending Distribution */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
             <h3 className="font-bold text-white text-lg mb-6">Spending Distribution</h3>
             <div className="space-y-4">
               {displayStats.categories.map((cat, idx) => (
                 <div key={idx} className="group">
                   <div className="flex justify-between text-sm mb-1.5">
                     <span className="text-slate-300">{cat.name}</span>
                     <span className="text-white font-mono">{formatCurrency(cat.value)}</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                     <div className={`h-full rounded-full ${colors[idx % colors.length]}`} style={{ width: `${(cat.value / maxCatVal) * 100}%` }}></div>
                   </div>
                 </div>
               ))}
               {displayStats.categories.length === 0 && <div className="text-center text-slate-500 mt-10">No data available.</div>}
             </div>
          </div>

          {/* Trend Analysis (Line Chart) */}
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
            <h3 className="font-bold text-white text-lg mb-6">Trend Analysis</h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayStats.trends}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                   <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill:'#64748b', fontSize:10}} 
                      dy={10}
                   />
                   <Tooltip 
                     cursor={{stroke: '#06b6d4', strokeWidth: 1}}
                     contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px', color:'#fff'}}
                   />
                   <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#06b6d4" 
                      strokeWidth={3}
                      dot={{fill: '#06b6d4', r: 4}}
                      activeDot={{r: 6, fill: '#fff'}}
                   />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Tx Table */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Recent Transactions</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auditor/submissions")}>View Full Ledger →</Button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500 uppercase bg-slate-900/30">
                   <tr>
                      <th className="px-6 py-3">Vendor</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {displayStats.recent.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/receipt/${tx.id}`)}>
                         <td className="px-6 py-3 text-white">{tx.vendor}</td>
                         <td className="px-6 py-3 text-slate-400">{formatDate(tx.date)}</td>
                         <td className="px-6 py-3 text-right font-mono text-emerald-400">{formatCurrency(tx.total)}</td>
                         <td className="px-6 py-3 text-right">
                            <Badge variant={tx.status === 'verified' ? 'success' : 'warning'} size="sm" dot>{tx.status}</Badge>
                         </td>
                      </tr>
                   ))}
                   {displayStats.recent.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-500">No transactions.</td></tr>}
                </tbody>
             </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CFODashboard;