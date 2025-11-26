import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { uploadReceipt } from "../services/api"; // Import API Service

// --- HELPERS ---
const formatThousand = (num) => {
  if (!num && num !== 0) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumber = (str) => {
  if (!str) return 0;
  return Number(str.toString().replace(/\./g, ""));
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- COMPONENT: CATEGORY SELECT ---
const CategorySelect = ({ value, onChange, options, onAddCategory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative font-sans" ref={containerRef}>
      <div
        className={`w-full px-4 py-3 bg-slate-900/50 backdrop-blur-sm border rounded-lg text-sm flex justify-between items-center cursor-pointer transition-all duration-300 ${
          isOpen
            ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            : "border-white/10 hover:border-white/20"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-slate-200" : "text-slate-500"}>
          {value || "Select category..."}
        </span>
        <span className="text-slate-500 text-[10px] transform transition-transform duration-300">
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-[#0B1120] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <input
              autoFocus
              type="text"
              placeholder="Filter..."
              className="w-full bg-slate-900/50 border border-transparent rounded px-3 py-2 text-xs text-white focus:border-cyan-500/50 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.map((option, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(option)}
                className="px-3 py-2 rounded text-xs cursor-pointer text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
const UploadReceipt = () => {
  const containerRef = useRef();
  
  // State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState(null);
  
  // Data Hasil Backend
  const [blockchainData, setBlockchainData] = useState(null); // Untuk menyimpan TxHash & CID

  // Validation
  const [mathValidation, setMathValidation] = useState({ isValid: true, diff: 0 });

  const [availableCategories, setAvailableCategories] = useState([
    "Meals & Entertainment", "Transport & Travel", "Office Supplies",
    "Software Subscription", "Hardware Equipment", "Utilities", "Professional Services"
  ]);

  const [formData, setFormData] = useState({
    vendor: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    items: [{ id: 1, description: "", quantity: 1, unitPrice: 0, total: 0 }],
    taxAmount: 0,
    extractedTotal: 0,
    notes: "",
  });

  // --- GSAP ANIMATIONS ---
  useGSAP(() => {
    gsap.fromTo(
      ".fade-in-entry",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
    );
  }, { scope: containerRef });

  // --- CALCULATIONS ---
  const calculateSubtotal = () => formData.items.reduce((acc, item) => acc + item.total, 0);
  const calculateGrandTotal = () => calculateSubtotal() + Number(formData.taxAmount);

  useEffect(() => {
    const calculated = calculateGrandTotal();
    const extracted = formData.extractedTotal;
    if (extracted > 0) {
      const diff = Math.abs(calculated - extracted);
      setMathValidation({ isValid: diff <= 100, diff });
    } else {
      setMathValidation({ isValid: true, diff: 0 });
    }
  }, [formData.items, formData.taxAmount, formData.extractedTotal]);

  // --- BACKEND INTEGRATION ---
  const processReceipt = async (imageFile) => {
    setIsScanning(true);
    setScanStatus("Uploading & Processing...");
    setScanError(null);
    setBlockchainData(null);

    try {
      // 1. Kirim ke Backend (File Handling -> AI -> IPFS -> Blockchain -> DB)
      // Gunakan alamat wallet dummy atau dari context
      const result = await uploadReceipt(imageFile, "0xAuditorFE");
      
      setScanStatus("Analyzing AI Result...");

      // 2. Ambil data dari response Backend
      const { extracted, ipfsCid, txHash, explorerUrl } = result.data;

      // 3. Simpan info blockchain
      setBlockchainData({ ipfsCid, txHash, explorerUrl });

      // 4. Mapping Data AI ke Form Frontend
      const mappedItems = extracted.items?.map((item, idx) => ({
        id: Date.now() + idx,
        description: item.itemName || "Item", // Sesuaikan dengan field backend 'itemName'
        quantity: Number(item.qty) || 1,      // Sesuaikan dengan field backend 'qty'
        unitPrice: Number(item.price) || 0,   // Sesuaikan dengan field backend 'price'
        total: Number(item.total) || 0,
      })) || [];

      // Cari kategori yang cocok (case insensitive logic sederhana)
      let finalCategory = availableCategories.find(
        (c) => c.toLowerCase().includes((extracted.category || "").toLowerCase())
      ) || extracted.category || "";

      // Update Form
      setFormData({
        vendor: extracted.vendorName || "",
        invoiceNumber: "", // AI kita belum ekstrak invoice number, biarkan kosong
        date: extracted.date || new Date().toISOString().split("T")[0],
        category: finalCategory,
        items: mappedItems.length ? mappedItems : [{ id: 1, description: "", quantity: 1, unitPrice: 0, total: 0 }],
        taxAmount: 0, // Backend AI simpel kita belum ekstrak tax terpisah
        extractedTotal: Number(extracted.amount) || 0,
        notes: `Stored on IPFS: ${ipfsCid?.substring(0, 6)}...`,
      });

    } catch (error) {
      console.error(error);
      setScanError(error.message || "Backend processing failed.");
    } finally {
      setIsScanning(false);
    }
  };

  // --- HANDLERS ---
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      // Trigger Backend Call
      processReceipt(selectedFile);
    }
  };

  const handleItemChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          let cleanValue = value;
          if (field === "quantity" || field === "unitPrice") {
            cleanValue = parseNumber(value);
          }
          const updated = { ...item, [field]: cleanValue };
          if (field === "quantity" || field === "unitPrice") {
            updated.total = Number(updated.quantity) * Number(updated.unitPrice);
          }
          return updated;
        }
        return item;
      }),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), description: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const removeItem = (id) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  // Tombol Submit di sini fungsinya hanya konfirmasi/reset, karena data sudah masuk DB saat upload
  const handleFinalize = () => {
    alert("Receipt processing complete! Ready for next upload.");
    window.location.reload(); // Reset simpel untuk demo
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050A14] text-slate-300 font-sans p-6 md:p-12 selection:bg-cyan-500/30">
      {/* BACKGROUND ACCENTS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 fade-in-entry">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center backdrop-blur-md">
              <span className="text-cyan-400 font-bold text-xl">⚡</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Receipt Verification</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${scanError ? "bg-red-500" : "bg-emerald-500"} animate-pulse`}></span>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">
                  {scanError ? "System Error" : "System Operational"}
                </p>
              </div>
            </div>
          </div>

          {blockchainData && (
            <div className="px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 flex items-center gap-2">
              <span>🔗</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Blockchain Recorded</span>
                <a href={blockchainData.explorerUrl} target="_blank" rel="noreferrer" className="text-xs font-bold hover:underline cursor-pointer">
                  View Transaction ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div className="space-y-4 mb-8">
          {scanError && (
            <div className="fade-in-entry p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <span className="text-red-400">🚫</span>
              <div className="text-red-400 text-sm">{scanError}</div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* LEFT: UPLOAD & METADATA */}
          <div className="lg:col-span-5 space-y-6 fade-in-entry">
            <div className="relative group perspective-1000">
              <div
                onClick={() => document.getElementById("fileInput").click()}
                className={`
                  relative border border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-500 overflow-hidden min-h-[360px] flex flex-col justify-center items-center bg-[#0B1120]
                  ${isScanning ? "border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "border-white/10 hover:border-cyan-500/30 hover:bg-[#0F1629]"}
                `}
              >
                <input id="fileInput" type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />

                {isScanning && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent w-full h-full animate-[scan_2s_linear_infinite] z-10 border-b border-cyan-500/50"></div>
                    <div className="z-20 flex flex-col items-center gap-3">
                      <div className="text-cyan-400 font-mono text-xs tracking-widest uppercase animate-pulse">{scanStatus}</div>
                    </div>
                  </>
                )}

                {preview ? (
                  <img src={preview} alt="Receipt" className="absolute inset-0 w-full h-full object-contain p-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5 group-hover:border-cyan-500/30 transition-colors">
                      <span className="text-2xl opacity-50">📷</span>
                    </div>
                    <div className="text-slate-400 text-sm font-medium">Drop receipt or click to upload</div>
                  </div>
                )}
              </div>
            </div>

            {/* FORM CARD */}
            <div className="bg-[#0B1120] border border-white/5 rounded-xl p-6 space-y-5 shadow-xl">
              <div className="pb-4 border-b border-white/5 mb-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">Receipt Details</h3>
              </div>

              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Vendor Name</label>
                <input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
                  placeholder="Waiting for AI..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:border-cyan-500/50 outline-none [color-scheme:dark]" />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Invoice Ref</label>
                  <input value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-3 text-sm text-white font-mono focus:border-cyan-500/50 outline-none" placeholder="#INV-000" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Expense Category</label>
                <CategorySelect options={availableCategories} value={formData.category} onChange={(val) => setFormData({ ...formData, category: val })} onAddCategory={(newCat) => setAvailableCategories((prev) => [...prev, newCat])} />
              </div>
            </div>
          </div>

          {/* RIGHT: ITEMS & TOTALS */}
          <div className="lg:col-span-7 fade-in-entry" style={{ animationDelay: "0.2s" }}>
            <div className="bg-[#0B1120] border border-white/5 rounded-xl p-6 h-full flex flex-col shadow-xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">Line Items breakdown</h3>
                <button onClick={addItem} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors">+ Add Line</button>
              </div>

              {/* LIST ITEMS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 min-h-[300px]">
                {formData.items.map((item) => (
                  <div key={item.id} className="bg-slate-900/30 border border-white/5 rounded-lg p-3 hover:border-white/10 transition-all group">
                    <div className="flex gap-3 mb-3">
                      <input value={item.description} onChange={(e) => handleItemChange(item.id, "description", e.target.value)} placeholder="Item description..." className="flex-1 bg-transparent text-sm text-white font-medium placeholder-slate-600 outline-none border-b border-transparent focus:border-cyan-500/30 pb-1 transition-colors" />
                      <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-400 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none">×</button>
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <label className="text-[9px] text-slate-600 uppercase block mb-1">Qty</label>
                        <input type="text" inputMode="numeric" value={formatThousand(item.quantity)} onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded px-2 py-1.5 text-xs text-white text-center focus:border-cyan-500/50 outline-none" />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[9px] text-slate-600 uppercase block mb-1">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">Rp</span>
                          <input type="text" inputMode="numeric" value={formatThousand(item.unitPrice)} onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded pl-7 pr-2 py-1.5 text-xs text-white text-right focus:border-cyan-500/50 outline-none" />
                        </div>
                      </div>
                      <div className="col-span-5 text-right">
                        <label className="text-[9px] text-slate-600 uppercase block mb-1">Total</label>
                        <div className="text-sm font-mono text-slate-300">{formatCurrency(item.total)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER TOTALS */}
              <div className="mt-6 pt-6 border-t border-white/10 bg-[#080d1a] -mx-6 -mb-6 px-6 py-6 rounded-b-xl">
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs text-slate-500"><span>Subtotal</span><span className="font-mono text-slate-400">{formatCurrency(calculateSubtotal())}</span></div>
                  <div className="flex justify-between text-xs text-slate-500 items-center"><span>Tax / VAT</span><input type="text" inputMode="numeric" value={formatThousand(formData.taxAmount)} onChange={(e) => setFormData({ ...formData, taxAmount: parseNumber(e.target.value) })} className="w-28 bg-slate-900 border border-white/10 rounded px-2 py-1 text-right text-white text-xs focus:border-cyan-500/50 outline-none" /></div>
                </div>

                <div className="flex justify-between items-end bg-slate-900 p-4 rounded-lg border border-white/5 relative overflow-hidden">
                  <div className="z-10">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Grand Total</div>
                    {formData.extractedTotal > 0 && (
                      <div className={`text-[10px] font-mono mt-1 ${mathValidation.isValid ? "text-slate-500" : "text-orange-400"}`}>AI Read: {formatCurrency(formData.extractedTotal)}</div>
                    )}
                  </div>
                  <div className={`z-10 text-2xl font-bold tracking-tight ${mathValidation.isValid ? "text-cyan-400" : "text-orange-400"}`}>{formatCurrency(calculateGrandTotal())}</div>
                  <div className={`absolute right-0 top-0 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none ${mathValidation.isValid ? "bg-cyan-500" : "bg-orange-500"}`}></div>
                </div>

                <button
                  disabled={isScanning || !blockchainData}
                  onClick={handleFinalize}
                  className={`
                    w-full mt-5 py-4 font-bold rounded-lg text-sm tracking-wide uppercase transition-all duration-300 flex justify-center items-center gap-2
                    ${!blockchainData ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5" : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/40 hover:shadow-cyan-500/20 hover:scale-[1.01]"}
                  `}
                >
                  {!blockchainData ? (
                    <span>{isScanning ? "⏳ Processing..." : "☁️ Upload Receipt to Start"}</span>
                  ) : (
                    <><span>✅</span> Process Complete (New Upload)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes scan { 0% { top: -100%; } 100% { top: 200%; } } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }`}</style>
    </div>
  );
};

export default UploadReceipt;