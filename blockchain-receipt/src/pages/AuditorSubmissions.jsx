import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import Navbar from "../components/common/Navbar";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { getReceipts } from "../services/api"; // Import API Service

// Helper Format Uang
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper Format Tanggal
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AuditorSubmissions = () => {
  const navigate = useNavigate();
  const pageRef = useRef(null);

  // --- STATE ---
  const [receipts, setReceipts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter & Sort State
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  // Stats State
  const [stats, setStats] = useState({
    total: 0, verified: 0, pending: 0, failed: 0, totalAmount: 0,
  });

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getReceipts();
        setReceipts(data);
        calculateStats(data);
      } catch (err) {
        console.error(err);
        setError("Gagal koneksi ke Backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateStats = (data) => {
    const newStats = data.reduce(
      (acc, curr) => {
        acc.total++;
        acc.totalAmount += Number(curr.total) || 0;
        const status = (curr.status || "pending").toLowerCase();
        if (status === "verified") acc.verified++;
        else if (status === "pending") acc.pending++;
        else if (status === "failed") acc.failed++;
        return acc;
      },
      { total: 0, verified: 0, pending: 0, failed: 0, totalAmount: 0 }
    );
    setStats(newStats);
  };

  // --- LOGIC FILTER & SEARCH (PERBAIKAN UTAMA) ---
  const filteredSubmissions = receipts
    .filter((sub) => {
      // 1. Filter Status (Case Insensitive)
      if (selectedStatus !== "all") {
        if (sub.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }

      // 2. Filter Search (Vendor OR ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const vendorMatch = (sub.vendor || "").toLowerCase().includes(query);
        const idMatch = (sub.id || "").toLowerCase().includes(query);
        if (!vendorMatch && !idMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // 3. Logic Sorting
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const amountA = Number(a.total);
      const amountB = Number(b.total);

      if (sortBy === "date-desc") return dateB - dateA;
      if (sortBy === "date-asc") return dateA - dateB;
      if (sortBy === "amount-desc") return amountB - amountA;
      if (sortBy === "amount-asc") return amountA - amountB;
      return 0;
    });

  // --- UI HELPERS ---
  const getStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "verified") return "success";
    if (s === "failed") return "error";
    return "warning";
  };

  // Animation
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".table-row", { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.05 });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-cyan-500/30" ref={pageRef}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        
        {/* Header & Stats (Tetap Sama) */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6 border-b border-white/5 pb-6">
           <div>
            <h1 className="text-4xl font-bold text-white">My Submissions</h1>
            <p className="text-slate-400 mt-2">Track verification status and manage your receipt uploads.</p>
          </div>
          <Button variant="primary" onClick={() => navigate("/upload")}>+ Upload New Receipt</Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 p-4">
            <div className="text-xs text-slate-400 uppercase font-bold">Total Uploads</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </Card>
          <Card className="bg-emerald-900/10 border-emerald-500/20 p-4">
            <div className="text-xs text-emerald-400 uppercase font-bold">Verified</div>
            <div className="text-2xl font-bold text-white">{stats.verified}</div>
          </Card>
          <Card className="bg-amber-900/10 border-amber-500/20 p-4">
            <div className="text-xs text-amber-400 uppercase font-bold">Pending</div>
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
          </Card>
           <Card className="bg-slate-800/50 border-white/5 p-4">
            <div className="text-xs text-slate-400 uppercase font-bold">Total Value</div>
            <div className="text-xl font-bold text-cyan-400 truncate">{formatCurrency(stats.totalAmount)}</div>
          </Card>
        </div>

        {/* --- FILTERS TOOLBAR (FIXED) --- */}
        <div className="filter-bar mb-6 bg-slate-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-sm flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by ID or Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-transparent focus:border-cyan-500/50 rounded-xl text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-transparent hover:bg-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-transparent hover:bg-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-300 outline-none cursor-pointer"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="amount-desc">Highest Value</option>
              <option value="amount-asc">Lowest Value</option>
            </select>
          </div>
        </div>

        {/* --- TABLE (FIXED UI) --- */}
        <Card className="bg-slate-900/50 border-white/5 overflow-hidden p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-20 text-slate-500">Loading data...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/30 text-xs uppercase text-slate-500">
                    <th className="py-4 px-6 font-bold">ID / Vendor</th>
                    <th className="py-4 px-6 font-bold">Date</th>
                    <th className="py-4 px-6 font-bold text-right">Amount</th>
                    <th className="py-4 px-6 font-bold text-center">Category</th>
                    <th className="py-4 px-6 font-bold text-center">Proof & Chain</th>
                    <th className="py-4 px-6 font-bold text-center">Status</th>
                    <th className="py-4 px-6 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="table-row group hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/receipt/${sub.id}`)}
                    >
                      {/* ID & Vendor */}
                      <td className="py-4 px-6">
                        <div className="font-medium text-white">{sub.vendor}</div>
                        <div className="font-mono text-xs text-cyan-500/70 mt-1">{sub.id.substring(0, 8)}...</div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-slate-400 text-sm">
                        {formatDate(sub.date)}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 text-right font-mono text-emerald-400 font-medium">
                        {formatCurrency(sub.total)}
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2 py-1 rounded-md text-xs bg-slate-800 text-slate-400 border border-slate-700">
                          {sub.category}
                        </span>
                      </td>

                      {/* Proof Buttons (Fixing UI Issue #4) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* IPFS Button */}
                          {sub.ipfsUrl ? (
                            <a
                              href={sub.ipfsUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                              title="View Receipt on IPFS"
                            >
                              📄
                            </a>
                          ) : (
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-600 border border-slate-700 opacity-50 cursor-not-allowed">📄</span>
                          )}

                          {/* Chain Button */}
                          {sub.blockchain?.txHash ? (
                            <a
                              href={sub.blockchain.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                              title="Verify Transaction"
                            >
                              🔗
                            </a>
                          ) : (
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-600 border border-slate-700 opacity-50 cursor-not-allowed">🔗</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <Badge variant={getStatusBadge(sub.status)} size="sm" dot>
                          {sub.status ? sub.status.toUpperCase() : "UNKNOWN"}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <button className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
                          Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        No receipts match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuditorSubmissions;