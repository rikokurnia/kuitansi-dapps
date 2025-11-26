import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("🔵 [API] Fetching receipts...");

    const receipts = await prisma.receipt.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        category: true,
        items: true,
        blockchain_record: true,
        ipfs_record: true,
        user: {
          select: { wallet_address: true }
        }
      }
    });

    // Kita pakai 'any' di parameter map dulu biar TypeScript gak rewel
    // (Ini cara cepat hackathon, idealnya pake type definition lengkap)
    const formattedData = receipts.map((r: any) => ({
      id: r.id,
      vendor: r.vendor_name || "Unknown Vendor", // Fallback biar search gak error
      date: r.receipt_date, // Ini akan jadi string ISO di JSON
      total: Number(r.total_amount) || 0, // Pastikan jadi Angka
      status: (r.status || "pending").toLowerCase(), // Paksa huruf kecil biar filter status jalan
      category: r.category?.name || "Uncategorized",
      
      // Data untuk Tombol UI
      ipfsUrl: r.ipfs_record?.cid ? `https://gateway.pinata.cloud/ipfs/${r.ipfs_record.cid}` : null,
      
      blockchain: {
        txHash: r.blockchain_record?.tx_hash || null,
        explorerUrl: r.blockchain_record?.tx_hash 
          ? `https://sepolia-blockscout.lisk.com/tx/${r.blockchain_record.tx_hash}` 
          : null
      }
    }));

    return NextResponse.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error("❌ [API] Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}