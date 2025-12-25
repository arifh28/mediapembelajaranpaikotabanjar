// Konfigurasi Supabase (GANTI DENGAN KUNCI ANDA)
const SUPABASE_URL = 'https://oisrtlcxdwgvzrxrlzpb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc3J0bGN4ZHdndnpyeHJsenBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzM3OTEsImV4cCI6MjA3ODYwOTc5MX0.aI162olkIydnJrRxLnC0NsBU9umySmd2nWSTt8Hc1ec'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi untuk menambah counter saat materi diklik
async function trackClick(materialName, urlTujuan) {
    try {
        // 1. Ambil data saat ini (opsional, untuk memastikan ada)
        // 2. Increment counter langsung via RPC atau update manual
        // Disini kita pakai cara sederhana: ambil dulu, lalu update
        
        const { data: currentData, error: fetchError } = await _supabase
            .from('material_analytics')
            .select('click_count')
            .eq('material_name', materialName)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching:', fetchError);
        }

        let newCount = 1;
        if (currentData) {
            newCount = currentData.click_count + 1;
        }

        // Update database
        const { error: updateError } = await _supabase
            .from('material_analytics')
            .upsert({ material_name: materialName, click_count: newCount });

        if (updateError) console.error('Error updating:', updateError);
        
        // Redirect setelah mencatat (tunda sedikit agar request terkirim)
        setTimeout(() => {
            if(urlTujuan) window.location.href = urlTujuan;
        }, 300);

    } catch (err) {
        console.error("System Error:", err);
        // Tetap redirect meski error tracking
        if(urlTujuan) window.location.href = urlTujuan; 
    }
}

// Fungsi untuk menampilkan jumlah views di halaman (Load saat halaman dibuka)
async function loadViews() {
    const counters = document.querySelectorAll('.view-counter');
    
    // Kumpulkan semua ID material dari DOM
    const materialNames = Array.from(counters).map(c => c.dataset.id);
    
    if (materialNames.length === 0) return;

    const { data, error } = await _supabase
        .from('material_analytics')
        .select('material_name, click_count')
        .in('material_name', materialNames);

    if (data) {
        data.forEach(item => {
            const el = document.querySelector(`.view-counter[data-id="${item.material_name}"]`);
            if (el) {
                el.innerText = `${item.click_count} Views`;
            }
        });
    }
}

// Fungsi untuk memuat Top 5 Materi
async function loadTrending() {
    const listContainer = document.getElementById('trendingList');
    if (!listContainer) return;

    // Ambil 5 data tertinggi dari Supabase
    const { data, error } = await _supabase
        .from('material_analytics')
        .select('material_name, click_count')
        .order('click_count', { ascending: false })
        .limit(5);

    if (data) {
        listContainer.innerHTML = ''; // Kosongkan loading
        data.forEach((item, index) => {
            // Mapping nama ID ke Judul yang Asli (Bisa dibuat manual atau function helper)
            let judul = formatNamaMateri(item.material_name); 
            
            let html = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-success rounded-circle me-2">${index + 1}</span>
                        ${judul}
                    </div>
                    <span class="badge bg-light text-dark border">${item.click_count} <i class="fas fa-eye small ms-1"></i></span>
                </li>`;
            listContainer.innerHTML += html;
        });
    }
}

// Helper sederhana merapikan nama ID (Opsional)
function formatNamaMateri(id) {
    // Ubah k4_materi_1 menjadi "Materi Kelas 4..." atau biarkan ID-nya
    // Bisa dikembangkan nanti
    return id.replace(/_/g, ' ').toUpperCase(); 
}

// Jalankan saat load
document.addEventListener('DOMContentLoaded', () => {
    loadViews();
    loadTrending();
});