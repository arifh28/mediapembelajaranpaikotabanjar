// =================================================================
// 1. KONFIGURASI SUPABASE
// =================================================================
const SUPABASE_URL = 'https://oisrtlcxdwgvzrxrlzpb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc3J0bGN4ZHdndnpyeHJsenBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzM3OTEsImV4cCI6MjA3ODYwOTc5MX0.aI162olkIydnJrRxLnC0NsBU9umySmd2nWSTt8Hc1ec'; 
// const SUPABASE_KEY = '';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Suntikkan HTML Floating Button dan Modal ke dalam halaman
    const feedbackHTML = `
    <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9998;">
        <button class="btn btn-success rounded-circle shadow-lg d-flex align-items-center justify-content-center" 
                data-bs-toggle="modal" data-bs-target="#modalSaran" 
                style="width: 60px; height: 60px; transition: transform 0.3s;"
                onmouseover="this.style.transform='scale(1.1)'" 
                onmouseout="this.style.transform='scale(1)'">
            <i class="fas fa-comment-dots fa-2x text-white"></i>
        </button>
    </div>

    <div class="modal fade" id="modalSaran" tabindex="-1" aria-labelledby="modalSaranLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-header bg-success text-white rounded-top-4">
                    <h5 class="modal-title fw-bold" id="modalSaranLabel"><i class="fas fa-envelope-open-text me-2"></i>Kirim Kritik & Saran</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="formKritikSaran">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Nama Anda</label>
                            <input type="text" class="form-control" id="fs-nama" placeholder="Masukkan nama Anda" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Kritik / Saran</label>
                            <textarea class="form-control" id="fs-saran" rows="4" placeholder="Tulis masukan Anda untuk media pembelajaran ini..." required></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light rounded-bottom-4">
                        <button type="button" class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Batal</button>
                        <button type="submit" class="btn btn-success rounded-pill px-4" id="btnSubmitSaran">
                            <i class="fas fa-paper-plane me-2"></i>Kirim Saran
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    // Pastikan tidak merender dua kali
    if(!document.getElementById('modalSaran')) {
        document.body.insertAdjacentHTML('beforeend', feedbackHTML);
    }

    // 2. Tangani Form Submit
    const formSaran = document.getElementById('formKritikSaran');
    if (formSaran) {
        formSaran.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nama = document.getElementById('fs-nama').value;
            const saran = document.getElementById('fs-saran').value;
            const btnSubmit = document.getElementById('btnSubmitSaran');
            
            // Ubah tombol jadi loading
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mengirim...';

            try {
                // Ambil IP Address publik user menggunakan API gratis (ipify)
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                const ip_address = ipData.ip;

                // Insert data ke Supabase
                const { error } = await _supabase.from('kritik_saran').insert([
                    { nama: nama, saran: saran, ip_address: ip_address }
                ]);

                if (error) throw error;

                // Redirect ke halaman saran.html jika berhasil
                window.location.href = 'saran.html';

            } catch (err) {
                console.error("Gagal kirim saran:", err);
                alert("Maaf, terjadi kesalahan saat mengirim saran. Coba lagi.");
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Kirim Saran';
            }
        });
    }
});

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

// 1. Fungsi Normalisasi Teks 1 (Menghapus tanda baca -)
function normalizeText(text) {
    if (!text) return "";
    return text
        .toLowerCase()              // Ubah ke huruf kecil
        .replace(/[^a-z0-9]/g, ''); // Hapus SEMUA karakter kecuali huruf & angka
        // Contoh: "Al-Qur'an" -> "alquran"
}

// 2. Fungsi Normalisasi Teks 2 (Agar "solat" == "salat")
function standardizeText(text) {
    if (!text) return "";
    let clean = text.toLowerCase();

    // 1. Kelompok SHALAT (Semua diubah jadi 'salat')
    clean = clean.replace(/sholat/g, 'salat');
    clean = clean.replace(/solat/g, 'salat');
    clean = clean.replace(/shalat/g, 'salat');
    
    // 2. Kelompok AL-QURAN
    clean = clean.replace(/alquran/g, "al-qur'an");
    clean = clean.replace(/quran/g, "al-qur'an");
    clean = clean.replace(/al quran/g, "al-qur'an");

    // 3. Kelompok HADIS
    clean = clean.replace(/hadist/g, 'hadis');
    clean = clean.replace(/hadits/g, 'hadis');

    // 4. Kelompok ALLAH
    clean = clean.replace(/alloh/g, 'allah');

    // 4. Kelompok RASUL
    clean = clean.replace(/rosul/g, 'rasul');

    // 5. Kelompok AKHLAK
    clean = clean.replace(/akhlaq/g, 'akhlak');
    clean = clean.replace(/ahlaq/g, 'akhlak');
    clean = clean.replace(/ahlak/g, 'akhlak');

    // 6. Kelompok ZIKIR
    clean = clean.replace(/dzikir/g, 'zikir');

    return clean;
}

async function renderSearchResults() {
    const container = document.getElementById('resultsContainer');
    const keywordSpan = document.getElementById('searchKeyword');
    
    // Stop jika elemen tidak ditemukan (bukan halaman search)
    if (!container) return; 

    const urlParams = new URLSearchParams(window.location.search);
    const rawQuery = urlParams.get('q'); // Query asli user

    // Jika tidak ada query
    if (!rawQuery) {
        if(keywordSpan) keywordSpan.innerText = "-";
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning text-center">Silakan masukkan kata kunci pencarian.</div></div>';
        return;
    }

    // Tampilkan keyword di header
    if(keywordSpan) keywordSpan.innerText = `"${rawQuery}"`;
    container.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-success"></i><p class="mt-2">Sedang mencari materi...</p></div>';

    try {
        // Ambil Database
        const response = await fetch('assets/pencarian.json'); // Pastikan path json benar
        const allData = await response.json();

        // 1. Bersihkan Query User pakai standar kita
        const cleanQuery = standardizeText(rawQuery);

        // 2. Filter Data
        const filtered = allData.filter(item => {
            // Bersihkan data database juga agar "apple to apple"
            const cleanJudul = standardizeText(item.judul);
            const cleanKeyword = standardizeText(item.keyword);
            const cleanBab = standardizeText(item.bab);

            // Cek kecocokan
            return cleanJudul.includes(cleanQuery) || 
                   cleanKeyword.includes(cleanQuery) ||
                   cleanBab.includes(cleanQuery);
        });

        // 3. Render HTML
        if (filtered.length > 0) {
            let html = '';
            filtered.forEach(item => {
                // --- LOGIKA GAMBAR PINTAR ---
                let imgSrc = '';
                
                // Cek 1: Apakah di JSON ada key "gambar" dan tidak kosong?
                if (item.gambar && item.gambar.trim() !== "") {
                    imgSrc = item.gambar;
                } else {
                    // Cek 2: Jika tidak ada, buat Placeholder Warna-Warni
                    let imgColor = '4ECDC4'; // Default Hijau (Kelas 4,5,6)
                    
                    // Jika Kelas 1, 2, 3 warnanya Kuning
                    if (item.kelas && (item.kelas.includes('1') || item.kelas.includes('2') || item.kelas.includes('3'))) {
                        imgColor = 'FFE66D'; 
                    }
                    
                    // Encode judul agar aman di URL gambar
                    const encodedTitle = encodeURIComponent(item.judul);
                    imgSrc = `https://placehold.co/600x350/${imgColor}/333?text=${encodedTitle}`;
                }

                // --- LOGIKA URL ---
                // Tambahkan highlight ID jika ada
                let finalUrl = item.url;
                if (item.id_element) {
                    finalUrl += `?highlight=${item.id_element}`;
                }

                html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 shadow-sm custom-card border-0 overflow-hidden hover-scale">
                        
                        <div class="position-relative">
                            <img src="${imgSrc}" class="card-img-top" alt="${item.judul}" style="height: 200px; object-fit: cover;">
                            <div class="position-absolute top-0 start-0 m-2">
                                <span class="badge bg-white text-dark shadow-sm fw-bold">${item.kelas}</span>
                            </div>
                        </div>

                        <div class="card-body d-flex flex-column">
                            <small class="text-muted mb-1 fw-bold">
                                <i class="fas fa-bookmark text-success me-1"></i> ${item.bab}
                            </small>
                            
                            <h5 class="card-title fw-bold text-dark mb-2">
                                <a href="${finalUrl}" class="text-decoration-none text-dark stretched-link">
                                    ${item.judul}
                                </a>
                            </h5>
                            
                            <div class="mt-2 mb-3">
                                <small class="text-muted bg-light px-2 py-1 rounded border">
                                    <i class="fas fa-tag me-1 text-secondary"></i> 
                                    ${item.keyword}
                                </small>
                            </div>

                            <div class="mt-auto">
                                <a href="${finalUrl}" class="btn btn-outline-success btn-sm w-100 rounded-pill">
                                    Buka Materi <i class="fas fa-arrow-right ms-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        } else {
            // JIKA HASIL KOSONG
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="mb-3">
                        <i class="fas fa-search fa-3x text-muted opacity-25"></i>
                    </div>
                    <h5 class="text-muted fw-bold">Materi tidak ditemukan.</h5>
                    <p class="text-muted small">
                        Kami tidak menemukan hasil untuk "<strong>${rawQuery}</strong>". <br>
                        Coba kata kunci lain atau gunakan sinonim.
                    </p>
                    <a href="index.html" class="btn btn-success rounded-pill px-4 mt-2">Kembali ke Beranda</a>
                </div>`;
        }

    } catch (error) {
        console.error("Error Search:", error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-danger d-inline-block">
                    <i class="fas fa-exclamation-triangle me-2"></i> Gagal memuat data pencarian.
                </div>
            </div>`;
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
// FUNGSI TRACK DOWNLOAD BUKU
// =================================================================
async function trackDownload(bookName) {
    console.log(`Mencatat download: ${bookName}`);
    
    try {
        await _supabase.from('analytics_logs').insert([
            { 
                event_type: 'download_buku', 
                event_name: bookName 
            }
        ]);
        console.log("Tracking sukses dikirim ke Supabase");
    } catch (err) {
        console.error("Gagal tracking download:", err);
    }
}

// =================================================================
// FUNGSI LOAD DATA DINAMIS (GURU & VIEW COUNT)
// =================================================================
async function loadDynamicData() {
    // Cek apakah ada elemen kartu materi di halaman ini
    if (!document.querySelector('.custom-card')) return; 

    console.log("Mengambil data guru & statistik dari Supabase...");

    try {
        // 1. Ambil data dari tabel 'material_analytics'
        // Kolom yang diambil: material_name (kunci), guru (nama), click_count (jumlah view)
        const { data, error } = await _supabase
            .from('material_analytics')
            .select('material_name, guru, click_count');

        if (error) throw error;

        // 2. Loop setiap baris data yang didapat
        if (data) {
            data.forEach(item => {
                // A. TEMPELKAN NAMA GURU
                // Mencari elemen dengan ID: guru-k1_materi_10, guru-k1_materi_1, dst.
                const elGuru = document.getElementById(`guru-${item.material_name}`);
                if (elGuru) {
                    // Jika nama guru kosong di database, tulis Admin
                    elGuru.innerText = item.guru || "Tim PAI"; 
                }

                // B. TEMPELKAN JUMLAH VIEW (Update view counter juga)
                // Mencari elemen dengan atribut: data-id="k1_materi_10"
                const elView = document.querySelector(`.view-counter[data-id="${item.material_name}"]`);
                if (elView) {
                    // Update isi html view counter (tetap pertahankan ikon mata)
                    elView.innerHTML = `<i class="fas fa-eye me-1"></i> ${item.click_count}`;
                }
            });
        }
    } catch (err) {
        console.error("Gagal load data dinamis:", err);
    }
}

// =================================================================
// 5. INISIALISASI (MAIN)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Load Data Awal
    logPageView();
    loadViews();
    loadTrending();
    loadDynamicData();
    
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

    // 1. Tangkap elemen popup
    const popupEl = document.getElementById('promoPopup');
    
    // 2. CEK: Apakah kita sedang berada di halaman yang memiliki popup? (Yaitu index.html)
    // Jika tidak ada popup (misal di halaman blog), abaikan saja agar tidak error
    if (popupEl) {
        const closeBtn = document.getElementById('closePromoBtn');
        const promoLink = document.getElementById('promoLink');

        // 3. Cek apakah popup belum pernah ditutup di sesi ini
        if (!sessionStorage.getItem('popupPromoClosed')) {
            // Tampilkan popup (hapus d-none, lalu beri opacity agar fade-in bekerja)
            popupEl.classList.remove('d-none');
            setTimeout(() => {
                popupEl.style.opacity = '1';
            }, 100);
        }

        // 4. Fungsi mematikan popup & mencatat ke Session Storage
        function closePopup() {
            popupEl.style.opacity = '0';
            setTimeout(() => {
                popupEl.classList.add('d-none');
            }, 400);
            
            // Catat di browser agar tidak muncul lagi saat user balik ke index
            sessionStorage.setItem('popupPromoClosed', 'true');
        }

        // 5. Pemicu (Trigger)
        // Jika klik tanda X, tutup popup
        if (closeBtn) {
            closeBtn.addEventListener('click', closePopup);
        }
        
        // Jika klik gambar, tab baru akan terbuka (karena ada target="_blank" di HTML),
        // dan di saat bersamaan, tutup popup ini agar tidak menghalangi web saat user kembali.
        if (promoLink) {
            promoLink.addEventListener('click', closePopup);
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