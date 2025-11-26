// Konfigurasi URL Backend Next.js
const API_BASE_URL = "http://localhost:3000/api";

/**
 * 1. Upload Receipt (Create)
 * Mengirim file & address ke Backend untuk diproses (AI -> IPFS -> DB)
 */
export const uploadReceipt = async (file, auditorAddress) => {
  const formData = new FormData();
  formData.append("file", file);
  // Default address jika tidak ada wallet yang connect
  formData.append("auditorAddress", auditorAddress || "0xGuestAuditor");

  try {
    const response = await fetch(`${API_BASE_URL}/receipts/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Gagal upload ke server");
    }

    return result;
  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
};

/**
 * 2. Get All Receipts (Read List)
 * Mengambil semua data kwitansi untuk Dashboard
 */
export const getReceipts = async () => {
  try {
    // Tambahkan timestamp agar tidak di-cache oleh browser
    const response = await fetch(`${API_BASE_URL}/receipts?t=${Date.now()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Gagal mengambil data list");
    }

    return result.data; // Mengembalikan array receipts
  } catch (error) {
    console.error("Fetch List Error:", error);
    throw error;
  }
};

/**
 * 3. Get Single Receipt (Read Detail)
 * (Persiapan untuk langkah selanjutnya: Halaman Detail)
 */
export const getReceiptById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
      method: "GET",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Gagal mengambil detail data");
    }

    return result.data;
  } catch (error) {
    console.error("Fetch Detail Error:", error);
    throw error;
  }
};



// TAMBAHAN BARU:
export const getDashboardStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/stats?t=${Date.now()}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Gagal mengambil statistik");
    }

    return result.data;
  } catch (error) {
    console.error("Stats Error:", error);
    throw error;
  }
};