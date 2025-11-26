import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { getReceipts } from "../services/api"; // Kita butuh ini buat re-generate data
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatCurrency, formatDate } from "../utils/helpers";

const ReportHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [allReceipts, setAllReceipts] = useState([]);

  useEffect(() => {
    // Load History
    const saved = JSON.parse(localStorage.getItem("recentReports") || "[]");
    setHistory(saved);

    // Load Raw Data (untuk keperluan re-download)
    const fetchData = async () => {
      try {
        const data = await getReceipts();
        setAllReceipts(data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  const getReportStyle = (count) => {
    if (count === 1) return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    if (count > 1 && count <= 3) return "bg-red-500/20 text-red-500 border-red-500/30";
    if (count > 3 && count <= 8) return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    return "bg-purple-500/20 text-purple-500 border-purple-500/30";
  };

  // Re-use Filter & Export Logic
  const handleRedownload = (report) => {
    if (allReceipts.length === 0) return alert("Loading data... try again.");
    
    const filters = report.filters || { start: "2000-01-01", end: "2100-01-01", cats: [] };
    const data = allReceipts.filter((item) => {
      const itemDate = new Date(item.date);
      const startDate = new Date(filters.start);
      const endDate = new Date(filters.end);
      endDate.setHours(23, 59, 59, 999);
      
      const dateMatch = itemDate >= startDate && itemDate <= endDate;
      const catMatch = filters.cats.length === 0 || filters.cats.some(cat => (item.category || "").includes(cat));
      return dateMatch && catMatch;
    });

    const fname = `${report.name.replace(/[^a-zA-Z0-9]/g, "_")}_Copy.${report.type === 'PDF' ? 'pdf' : 'xlsx'}`;
    
    if (report.type === 'PDF') {
        const doc = new jsPDF();
        doc.text("Blockchain Audit Report", 14, 22);
        autoTable(doc, {
            head: [["Date", "Vendor", "Category", "Amount", "Tx Hash"]],
            body: data.map(i => [
                formatDate(i.date), i.vendor, i.category, formatCurrency(i.total),
                i.blockchain?.txHash ? `${i.blockchain.txHash.substring(0,8)}...` : "Pending"
            ]),
            startY: 35, theme: 'grid', headStyles: { fillColor: [6, 182, 212] }
        });
        doc.save(fname);
    } else {
        const ws = XLSX.utils.json_to_sheet(data.map(i => ({
            Date: formatDate(i.date), Vendor: i.vendor, Category: i.category, Amount: i.total, Status: i.status, TxHash: i.blockchain?.txHash || "-"
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, fname);
    }
  };

  const clearHistory = () => {
    if(window.confirm("Clear all history?")) {
      localStorage.removeItem("recentReports");
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-cyan-500/30">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-32 pb-20">
        
        <div className="flex justify-between items-end mb-8 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">File History</h1>
            <p className="text-slate-400 text-sm">Archive of all generated reports.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/reports")}>← Back to Generator</Button>
            <Button variant="secondary" onClick={clearHistory} className="text-red-400 hover:bg-red-500/10 border-red-500/20">Clear All</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((report) => (
            <Card key={report.id} className="bg-[#0F1623] border border-white/5 p-4 hover:border-cyan-500/30 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner ${getReportStyle(report.count || 0)}`}>
                  {report.type === "PDF" ? "📄" : "📊"}
                </div>
                <button onClick={() => handleRedownload(report)} className="text-slate-500 hover:text-cyan-400 p-2 rounded-lg hover:bg-white/5">
                  ⬇️
                </button>
              </div>
              <h3 className="text-white font-medium truncate mb-1">{report.name}</h3>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{report.date}</span>
                <span>{report.count || 0} Items</span>
              </div>
            </Card>
          ))}
        </div>

        {history.length === 0 && (
          <div className="text-center py-20 text-slate-500">No history found.</div>
        )}

      </div>
    </div>
  );
};

export default ReportHistory;