// =================================================================
// 1. KONFIGURASI SUPABASE
// =================================================================
const SUPABASE_URL = 'https://oisrtlcxdwgvzrxrlzpb.supabase.co'; 
// Gunakan Key Anon Public Anda
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc3J0bGN4ZHdndnpyeHJsenBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzM3OTEsImV4cCI6MjA3ODYwOTc5MX0.aI162olkIydnJrRxLnC0NsBU9umySmd2nWSTt8Hc1ec'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// =================================================================
// 2. FUNGSI UTAMA: TRACK CLICK & BUKA LINK (HYBRID)
// =================================================================
async function trackClick(materialId, targetUrl) {
    
    // --- BAGIAN A: URUSAN MEMBUKA LINK (UX) ---
    // Kita jalankan duluan agar user tidak menunggu loading database
    
    if (targetUrl && targetUrl !== '#' && !targetUrl.startsWith('#')) {
        
        // Deteksi apakah ini file dokumen (PDF/PPT/Word/Zip)
        // Regex ini mengecek akhiran file (case insensitive)
        const isFile = /\.(pdf|ppt|pptx|doc|docx|xls|xlsx|zip|rar)$/i.test(targetUrl);
        
        // Trik: Membuat elemen <a> sementara secara gaib
        // Ini cara paling stabil untuk meniru perilaku tag <a>
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank'; // Selalu buka di tab baru
        
        if (isFile) {
            // Jika terdeteksi file, paksa browser untuk download
            link.setAttribute('download', ''); 
        }

        // Tempel ke body, klik otomatis, lalu hapus lagi
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- BAGIAN B: URUSAN DATABASE (LOGIKA AMAN) ---
    console.log(`Mencatat view untuk: ${materialId}...`);

    try {
        // 1. Cek dulu apakah data materi ini sudah ada?
        const { data: existingData, error: fetchError } = await _supabase
            .from('material_analytics')
            .select('click_count')
            .eq('material_name', materialId)
            .single();

        if (existingData) {
            // SKENARIO 1: Data SUDAH ADA -> Lakukan UPDATE (Tambah +1)
            await _supabase
                .from('material_analytics')
                .update({ click_count: existingData.click_count + 1 })
                .eq('material_name', materialId);
            
            console.log("Sukses update view (+1)");

        } else {
            // SKENARIO 2: Data BELUM ADA -> Lakukan INSERT (Isi 1)
            // Kita abaikan error 23505 (duplicate) kalau-kalau ada bentrok milidetik
            const { error: insertError } = await _supabase
                .from('material_analytics')
                .insert([{ material_name: materialId, click_count: 1 }]);
            
            if (!insertError) console.log("Sukses buat data baru");
        }

        // 2. Update tampilan angka di layar secara langsung (Realtime feel)
        if (typeof loadViews === 'function') {
            loadViews();
        }
        
        // Update juga list trending jika ada di halaman ini
        if (typeof loadTrending === 'function') {
            loadTrending();
        }

    } catch (err) {
        // Error kita log saja di console, jangan alert ke user agar tidak mengganggu
        console.error("Error sistem tracking:", err);
    }
}


// =================================================================
// 3. FUNGSI LOAD VIEW (TAMPILKAN JUMLAH MATA)
// =================================================================
async function loadViews() {
    // Cari semua elemen yang punya class 'view-counter'
    const counters = document.querySelectorAll('.view-counter');
    
    // Jika tidak ada counter di halaman ini, berhenti
    if (counters.length === 0) return;

    // Ambil semua ID materi dari atribut data-id
    const materialNames = Array.from(counters).map(c => c.dataset.id);

    // Minta data ke Supabase (Bulk Fetch biar hemat request)
    const { data, error } = await _supabase
        .from('material_analytics')
        .select('material_name, click_count')
        .in('material_name', materialNames);

    if (data) {
        // Loop setiap counter di HTML dan isi angkanya
        counters.forEach(counter => {
            const id = counter.getAttribute('data-id');
            // Cari data yang cocok
            const record = data.find(item => item.material_name === id);
            
            // Jika ketemu pakai angkanya, jika tidak pakai 0
            const count = record ? record.click_count : 0;
            
            // Update HTML (Tetap pertahankan Icon Mata)
            counter.innerHTML = `<i class="fas fa-eye me-1"></i> ${count}`;
        });
    }
}


// =================================================================
// 4. FUNGSI TRENDING (MATERI TERPOPULER)
// =================================================================
async function loadTrending() {
    const listContainer = document.getElementById('trendingList');
    
    // Jika tidak ada elemen trending di halaman ini (misal di halaman detail), skip
    if (!listContainer) return;

    // Ambil 5 data tertinggi dari Supabase
    const { data, error } = await _supabase
        .from('material_analytics')
        .select('material_name, click_count')
        .order('click_count', { ascending: false })
        .limit(5);

    if (data) {
        listContainer.innerHTML = ''; // Bersihkan tulisan "Loading..."
        
        data.forEach((item, index) => {
            // Rapikan nama ID menjadi Judul yang enak dibaca
            let judul = formatNamaMateri(item.material_name); 
            
            let html = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div class="text-truncate" style="max-width: 70%;">
                        <span class="badge bg-success rounded-circle me-2">${index + 1}</span>
                        <span class="fw-bold small">${judul}</span>
                    </div>
                    <span class="badge bg-light text-dark border">
                        ${item.click_count} <i class="fas fa-eye small ms-1"></i>
                    </span>
                </li>`;
            listContainer.innerHTML += html;
        });
    }
}

// Helper: Merapikan ID database menjadi teks (Opsional)
// Contoh: "k4_materi_1" -> "K4 MATERI 1"
function formatNamaMateri(id) {
    return id.replace(/_/g, ' ').toUpperCase(); 
}


// =================================================================
// 5. INISIALISASI
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadViews();      // Muat angka di kartu materi
    loadTrending();   // Muat sidebar trending (jika ada)
});