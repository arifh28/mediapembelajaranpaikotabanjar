// =================================================================
// 1. KONFIGURASI SUPABASE
// =================================================================
const SUPABASE_URL = 'https://oisrtlcxdwgvzrxrlzpb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc3J0bGN4ZHdndnpyeHJsenBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzM3OTEsImV4cCI6MjA3ODYwOTc5MX0.aI162olkIydnJrRxLnC0NsBU9umySmd2nWSTt8Hc1ec'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// =================================================================
// 2. FUNGSI TRACK CLICK (HYBRID: LINK & DATABASE)
// =================================================================

async function logPageView() {
    // Ambil nama file halaman saat ini (misal: index.html atau kelas1.html)
    let pageName = window.location.pathname.split("/").pop();
    if (pageName === "") pageName = "index.html"; // Jika root

    try {
        await _supabase.from('analytics_logs').insert([
            { event_type: 'page_view', event_name: pageName }
        ]);
        console.log("Kunjungan tercatat:", pageName);
    } catch (err) {
        console.error("Gagal catat kunjungan", err);
    }
}

async function trackClick(materialId, targetUrl) {
    
    // A. BUKA LINK DULUAN (Supaya user tidak menunggu)
    if (targetUrl && targetUrl !== '#' && !targetUrl.startsWith('#')) {
        const isFile = /\.(pdf|ppt|pptx|doc|docx|xls|xlsx|zip|rar)$/i.test(targetUrl);
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank'; 
        if (isFile) link.setAttribute('download', ''); 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // B. PEREKAMAN DATA (BACKGROUND PROCESS)
    try {
        // 1. Catat ke LOG (Untuk hitungan Hari/Minggu/Bulan)
        await _supabase.from('analytics_logs').insert([
            { event_type: 'click_material', event_name: materialId }
        ]);

        // 2. Update Total Counter (Untuk tampilan kartu materi yang cepat)
        const { data: existingData } = await _supabase
            .from('material_analytics')
            .select('click_count')
            .eq('material_name', materialId)
            .single();

        if (existingData) {
            await _supabase
                .from('material_analytics')
                .update({ click_count: existingData.click_count + 1 })
                .eq('material_name', materialId);
        } else {
            // Jika materi baru belum ada di tabel analytics
            await _supabase
                .from('material_analytics')
                .insert([{ material_name: materialId, click_count: 1 }]);
        }

    } catch (err) {
        console.error("Error tracking:", err);
    }
}

// =================================================================
// 3. FUNGSI LOAD VIEW & TRENDING
// =================================================================
async function loadViews() {
    const counters = document.querySelectorAll('.view-counter');
    if (counters.length === 0) return;

    const ids = Array.from(counters).map(c => c.dataset.id);
    const { data } = await _supabase
        .from('material_analytics')
        .select('material_name, click_count')
        .in('material_name', ids);

    if (data) {
        counters.forEach(counter => {
            const id = counter.getAttribute('data-id');
            const record = data.find(item => item.material_name === id);
            const count = record ? record.click_count : 0;
            counter.innerHTML = `<i class="fas fa-eye me-1"></i> ${count}`;
        });
    }
}

async function loadTrending() {
    const listContainer = document.getElementById('trendingList');
    if (!listContainer) return;

    const { data } = await _supabase
        .from('material_analytics')
        .select('material_name, click_count')
        .order('click_count', { ascending: false })
        .limit(5);

    if (data) {
        listContainer.innerHTML = '';
        data.forEach((item, index) => {
            let judul = item.material_name.replace(/_/g, ' ').toUpperCase(); 
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


// =================================================================
// 4. LOGIKA PENCARIAN (BARU)
// =================================================================

// Toggle (Buka/Tutup) Search Bar
function toggleSearchBar() {
    const container = document.getElementById('searchBarContainer');
    const input = document.getElementById('navSearchInput');
    
    if (container.classList.contains('d-none')) {
        container.classList.remove('d-none');
        input.focus(); 
    } else {
        container.classList.add('d-none');
    }
}

// Redirect ke search.html
function doSearch() {
    const input = document.getElementById('navSearchInput');
    const query = input.value.trim();
    
    if (query.length > 0) {
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
}

// Handle tombol Enter
function handleEnter(event) {
    if (event.key === 'Enter') {
        doSearch();
    }
}

// =================================================================
// LOGIKA PENCARIAN (UPDATE: PINTAR & CARD BERGAMBAR)
// =================================================================

// 1. Fungsi Normalisasi Teks (Agar "Al-Qur'an" == "Alquran")
function normalizeText(text) {
    if (!text) return "";
    return text
        .toLowerCase()              // Ubah ke huruf kecil
        .replace(/[^a-z0-9]/g, ''); // Hapus SEMUA karakter kecuali huruf & angka
        // Contoh: "Al-Qur'an" -> "alquran"
}

// 2. Render Hasil Pencarian (Khusus search.html)
async function renderSearchResults() {
    const container = document.getElementById('resultsContainer');
    const keywordSpan = document.getElementById('searchKeyword');
    
    if (!container) return; // Stop jika bukan halaman search

    const urlParams = new URLSearchParams(window.location.search);
    const rawQuery = urlParams.get('q'); // Query asli user (misal: "Al-Qur'an")

    if (!rawQuery) {
        keywordSpan.innerText = "-";
        container.innerHTML = '<div class="alert alert-warning">Masukkan kata kunci pencarian.</div>';
        return;
    }

    keywordSpan.innerText = `"${rawQuery}"`;
    container.innerHTML = '<div class="col-12 text-center"><i class="fas fa-spinner fa-spin"></i> Memuat...</div>';

    try {
        const response = await fetch('assets/pencarian.json');
        const allData = await response.json();

        // Query yang sudah dinormalisasi (bersih)
        const cleanQuery = normalizeText(rawQuery);

        const filtered = allData.filter(item => {
            // Kita bersihkan juga data di database saat pencocokan
            const cleanJudul = normalizeText(item.judul);
            const cleanKeyword = normalizeText(item.keyword);
            const cleanBab = normalizeText(item.bab);

            // Cek apakah mengandung kata kunci
            return cleanJudul.includes(cleanQuery) || 
                   cleanKeyword.includes(cleanQuery) ||
                   cleanBab.includes(cleanQuery);
        });

        if (filtered.length > 0) {
            let html = '';
            filtered.forEach(item => {
                const link = `${item.url}?highlight=${item.id_element}`;
                
                // Tentukan Warna Placeholder Gambar berdasarkan Kelas
                let imgColor = '4ECDC4'; // Default Hijau (Kelas Atas)
                if (item.kelas.includes('1') || item.kelas.includes('2') || item.kelas.includes('3')) {
                    imgColor = 'FFE66D'; // Kuning (Kelas Bawah)
                }

                // Placeholder Image (Judul + Warna)
                const encodedTitle = encodeURIComponent(item.judul);
                const imgSrc = `https://placehold.co/600x350/${imgColor}/333?text=${encodedTitle}`;

                html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm custom-card border-0 overflow-hidden">
                        
                        <div class="position-relative">
                            <img src="${imgSrc}" class="card-img-top" alt="${item.judul}" style="height: 200px; object-fit: cover;">
                            <div class="position-absolute top-0 start-0 m-2">
                                <span class="badge bg-white text-dark shadow-sm">${item.kelas}</span>
                            </div>
                        </div>

                        <div class="card-body d-flex flex-column">
                            <small class="text-muted mb-1"><i class="fas fa-bookmark text-success me-1"></i> ${item.bab}</small>
                            <h5 class="card-title fw-bold text-dark">${item.judul}</h5>
                            
                            <div class="alert alert-light border mt-2 py-2 px-3 small text-muted flex-grow-1">
                                <i class="fas fa-tags me-1 text-secondary"></i> 
                                ${item.keyword}
                            </div>
                            
                            <hr class="opacity-25 my-3">
                            <a href="${link}" class="btn btn-outline-success btn-sm w-100 rounded-pill mt-auto">
                                Buka Materi <i class="fas fa-arrow-right ms-1"></i>
                            </a>
                        </div>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <img src="https://placehold.co/200x200/f0f0f0/ccc?text=404" class="mb-3 rounded-circle opacity-50" width="150">
                    <h5 class="text-muted">Materi tidak ditemukan.</h5>
                    <p class="small text-muted">Kami tidak menemukan hasil untuk "${rawQuery}". <br>Coba kata kunci lain.</p>
                </div>`;
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="alert alert-danger">Gagal memuat data pencarian.</div>';
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // Cek apakah user pernah menutup widget ini sebelumnya?
    if (sessionStorage.getItem('hideIFPWidget') === 'true') {
        const widget = document.getElementById('floatingIFP');
        if (widget) {
            widget.classList.add('d-none'); // Sembunyikan permanen
            widget.classList.remove('d-lg-flex');
        }
    }
});

// =================================================================
// 5. INISIALISASI (MAIN)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Load Data Awal
    logPageView();
    loadViews();
    loadTrending();
    
    // B. Cek apakah ini halaman Search?
    renderSearchResults();

    // C. Animasi Menu Hamburger (X to Bars)
    const myOffcanvas = document.getElementById('offcanvasNavbar');
    const menuIcon = document.getElementById('menuIcon');
    if(myOffcanvas && menuIcon) {
        myOffcanvas.addEventListener('show.bs.offcanvas', () => {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times', 'fa-spin');
            setTimeout(() => menuIcon.classList.remove('fa-spin'), 300);
        });
        myOffcanvas.addEventListener('hide.bs.offcanvas', () => {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars', 'fa-spin');
            setTimeout(() => menuIcon.classList.remove('fa-spin'), 300);
        });
    }

    // D. Auto Scroll (Highlight) jika dari Pencarian
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('highlight');

    if (targetId) {
        const targetElement = document.querySelector(`[data-id="${targetId}"]`);
        if (targetElement) {
            const cardElement = targetElement.closest('.card');
            if (cardElement) {
                // Scroll & Highlight Effect
                setTimeout(() => {
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    cardElement.style.transition = "all 0.5s";
                    cardElement.classList.add('border', 'border-warning', 'border-5');
                }, 500);
                
                // Hapus Highlight setelah 3 detik
                setTimeout(() => {
                    cardElement.classList.remove('border', 'border-warning', 'border-5');
                }, 3500);
            }
        }
    }

    // E. CEK SESSION STORAGE (WIDGET IFP)
    // Logika: Jika user pernah close, kita pastikan class d-lg-flex dibuang dan d-none dipasang
    if (sessionStorage.getItem('hideIFPWidget') === 'true') {
        const widget = document.getElementById('floatingIFP');
        if (widget) {
            widget.classList.remove('d-lg-flex'); // Hapus display flex (penting!)
            widget.classList.add('d-none');        // Tambah display none
        }
    }
});

function closeIFPWidget() {
    const widget = document.getElementById('floatingIFP');
    
    if (widget) {
        // 1. Animasi Keluar (Geser ke kanan via CSS)
        widget.classList.add('hide-widget');

        // 2. Simpan di memori browser
        sessionStorage.setItem('hideIFPWidget', 'true');
        
        // 3. Hapus elemen secara permanen setelah animasi selesai (0.5 detik)
        setTimeout(() => {
            // Kita gunakan cara yang sama dengan di atas (konsisten)
            widget.classList.remove('d-lg-flex'); // Matikan Flexbox
            widget.classList.add('d-none');        // Sembunyikan total
            
            // Opsional: hapus style inline jika ada
            widget.style.display = ''; 
        }, 500);
    } else {
        console.log("Widget tidak ditemukan/sudah hilang");
    }
}