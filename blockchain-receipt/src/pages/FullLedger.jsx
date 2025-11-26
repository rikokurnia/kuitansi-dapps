import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { getReceipts } from "../services/api";
import { formatCurrency, formatDate } from "../utils/helpers";

const FullLedger = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getReceipts();
        // Sort default: Paling baru di atas
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setReceipts(sorted);
      } catch (error) {
        console.error("Failed to load ledger:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Logic Filtering
  const filteredData = receipts.filter(item => {
    const matchSearch = item.vendor.toLowerCase().includes(search.toLowerCase()) || 
                        item.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    const matchStatus = statusFilter === "All" || (item.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchCat && matchStatus;
  });

  const categories = ["All", ...new Set(receipts.map(r => r.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-cyan-500/30">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 pb-6 border-b border-white/5 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">General Ledger</h1>
            <p className="text-slate-400">Complete history of all verified financial transactions.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>← Back to Dashboard</Button>
        </div>

        {/* Filters Toolbar */}
        <Card className="bg-slate-900/50 border-white/5 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Search Vendor or ID..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-300 outline-none cursor-pointer"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
          <select 
            className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-300 outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
          </select>
        </Card>

        {/* Table */}
        <Card className="bg-slate-900/50 border-white/5 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Proof</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-20 text-slate-500">Loading Ledger...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-20 text-slate-500">No transactions found.</td></tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.id.substring(0, 12)}...</td>
                      <td className="px-6 py-4 font-medium text-white">{row.vendor}</td>
                      <td className="px-6 py-4"><Badge variant="default" size="sm">{row.category}</Badge></td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">{formatCurrency(row.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                           {row.ipfsUrl && <a href={row.ipfsUrl} target="_blank" className="text-lg hover:scale-110 transition-transform" title="IPFS Receipt">📄</a>}
                           {row.blockchain?.txHash && <a href={row.blockchain.explorerUrl} target="_blank" className="text-lg hover:scale-110 transition-transform" title="Blockchain Tx">🔗</a>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={row.status === 'verified' ? 'success' : 'warning'} size="sm" dot>
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/5 bg-slate-950/30 text-xs text-slate-500 flex justify-between">
            <span>Showing {filteredData.length} records</span>
            <span>Total Volume: {formatCurrency(filteredData.reduce((sum, item) => sum + (item.total || 0), 0))}</span>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default FullLedger;