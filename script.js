// =================================================================
// 1. KONFIGURASI SUPABASE & AUTH
// =================================================================
const SUPABASE_URL = 'https://oisrtlcxdwgvzrxrlzpb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc3J0bGN4ZHdndnpyeHJsenBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzM3OTEsImV4cCI6MjA3ODYwOTc5MX0.aI162olkIydnJrRxLnC0NsBU9umySmd2nWSTt8Hc1ec'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi Login Google
async function loginGoogle() {
    const { data, error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // Ini akan memastikan user dikembalikan persis ke halaman saat ini
            redirectTo: window.location.href 
        }
    });
    if (error) console.error("Login Error:", error.message);
}

// Fungsi Logout
async function logout() {
    const { error } = await _supabase.auth.signOut();
    if (!error) window.location.reload();
}

// Cek Sesi User saat halaman dimuat
async function checkUserSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    const authContainer = document.getElementById('authContainer');

    // Mengambil semua elemen yang mau disembunyikan/ditampilkan
    const authOnlyElements = document.querySelectorAll('.auth-only');
    const guestOnlyElements = document.querySelectorAll('.guest-only');

    if (session && session.user) {
        // --- USER SUDAH LOGIN ---
        const userMeta = session.user.user_metadata;
        const userEmail = session.user.email;
        
        // Perbaikan Foto: Cek avatar_url, lalu picture, jika tidak ada pakai inisial nama
        const avatarUrl = userMeta.avatar_url || userMeta.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userMeta.full_name)}&background=random`;

        // Render Dropdown Profil
        if(authContainer) {
            authContainer.innerHTML = `
            <div class="dropdown">
                <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle text-dark fw-bold" data-bs-toggle="dropdown">
                    <img src="${avatarUrl}" alt="Profile" class="user-profile-img me-2" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-green);">
                    <span class="d-none d-lg-inline">${userMeta.full_name}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2">
                    <li><a class="dropdown-item disabled" href="#"><i class="fas fa-envelope me-2"></i> ${userEmail}</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i> Keluar</a></li>
                </ul>
            </div>`;
        }

        // Tampilkan div khusus yang login, sembunyikan div guest
        authOnlyElements.forEach(el => el.classList.remove('d-none'));
        guestOnlyElements.forEach(el => el.classList.add('d-none'));

    } else {
        // --- USER BELUM LOGIN ---
        
        if(authContainer) {
            // Render ulang tombol login jika user logout
            authContainer.innerHTML = `
            <button onclick="loginGoogle()" class="btn btn-outline-primary rounded-pill px-4 fw-bold w-100">
                <i class="fab fa-google me-2"></i> Masuk
            </button>`;
        }

        // Tampilkan div guest, sembunyikan div khusus login
        authOnlyElements.forEach(el => el.classList.add('d-none'));
        guestOnlyElements.forEach(el => el.classList.remove('d-none'));
    }
}

// Panggil cek sesi
checkUserSession();

// =================================================================
// 2. FUNGSI PENCARIAN DARI HERO SECTION
// =================================================================
function doSearch() {
    // Ambil dari input baru di hero section
    const input = document.getElementById('mainSearchInput');
    if(!input) return;
    
    const query = input.value.trim();
    if (query.length > 0) {
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
}

function handleEnter(event) {
    if (event.key === 'Enter') {
        doSearch();
    }
}

// =================================================================
// 3. FUNGSI RENDER POSTS (BLOG)
// =================================================================
async function renderPosts() {
    const container = document.getElementById('postsContainer');
    if (!container) return; // Cuma jalan di posts.html

    try {
        const response = await fetch('posts.json');
        const posts = await response.json();
        
        container.innerHTML = ''; // Bersihkan loading

        posts.forEach(post => {
            container.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="bento-card p-0">
                    <img src="${post.gambar}" alt="${post.judul}" class="img-fluid w-100" style="height: 200px; object-fit: cover; border-radius: 1.5rem 1.5rem 0 0;">
                    <div class="p-4 d-flex flex-column flex-grow-1">
                        <span class="badge bg-light text-primary mb-2 align-self-start">${post.kategori}</span>
                        <h5 class="font-heading mb-2">${post.judul}</h5>
                        <p class="text-muted small mb-4">${post.ringkasan}</p>
                        <a href="${post.link}" class="btn btn-outline-primary mt-auto rounded-pill w-100 fw-bold">Baca Selengkapnya</a>
                    </div>
                </div>
            </div>`;
        });
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger w-100">Gagal memuat artikel.</div>`;
    }
}

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

// =================================================================
// LOGIKA PENCARIAN (PINTAR & CARD BERGAMBAR)
// =================================================================
function standardizeText(text) {
    if (!text) return "";
    let clean = text.toLowerCase();
    clean = clean.replace(/sholat|solat|shalat/g, 'salat');
    clean = clean.replace(/alquran|quran|al quran/g, "al-qur'an");
    clean = clean.replace(/hadist|hadits/g, 'hadis');
    clean = clean.replace(/alloh/g, 'allah');
    clean = clean.replace(/rosul/g, 'rasul');
    clean = clean.replace(/akhlaq|ahlaq|ahlak/g, 'akhlak');
    clean = clean.replace(/dzikir/g, 'zikir');
    return clean;
}

async function renderSearchResults() {
    const container = document.getElementById('resultsContainer');
    const keywordSpan = document.getElementById('searchKeyword');
    if (!container) return; 

    const urlParams = new URLSearchParams(window.location.search);
    const rawQuery = urlParams.get('q'); 

    if (!rawQuery) {
        if(keywordSpan) keywordSpan.innerText = "-";
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning text-center rounded-4 border-0 shadow-sm">Silakan masukkan kata kunci pencarian.</div></div>';
        return;
    }

    if(keywordSpan) keywordSpan.innerText = `"${rawQuery}"`;
    container.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-2 text-muted">Sedang mencari materi...</p></div>';

    try {
        const response = await fetch('assets/pencarian.json'); 
        const allData = await response.json();
        const cleanQuery = standardizeText(rawQuery);

        const filtered = allData.filter(item => {
            const cleanJudul = standardizeText(item.judul);
            const cleanKeyword = standardizeText(item.keyword);
            const cleanBab = standardizeText(item.bab);
            return cleanJudul.includes(cleanQuery) || cleanKeyword.includes(cleanQuery) || cleanBab.includes(cleanQuery);
        });

        if (filtered.length > 0) {
            let html = '';
            filtered.forEach(item => {
                let imgColor = '4ECDC4'; 
                if (item.kelas && (item.kelas.includes('1') || item.kelas.includes('2') || item.kelas.includes('3'))) {
                    imgColor = 'FFE66D'; 
                }
                const encodedTitle = encodeURIComponent(item.judul);
                let imgSrc = `https://placehold.co/600x350/${imgColor}/333?text=${encodedTitle}`;

                let finalUrl = item.url;
                if (item.id_element) finalUrl += `?highlight=${item.id_element}`;

                html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="bento-card p-0 d-flex flex-column h-100">
                        <div class="position-relative">
                            <img src="${imgSrc}" class="img-fluid w-100" style="height: 200px; object-fit: cover; border-radius: 1.5rem 1.5rem 0 0;">
                            <div class="position-absolute top-0 start-0 m-3">
                                <span class="badge bg-white text-primary shadow-sm fw-bold px-2 py-1 rounded-pill">${item.kelas}</span>
                            </div>
                        </div>
                        <div class="p-4 d-flex flex-column flex-grow-1">
                            <small class="text-success mb-1 fw-bold"><i class="fas fa-bookmark me-1"></i> ${item.bab}</small>
                            <h5 class="font-heading mb-2"><a href="${finalUrl}" class="text-decoration-none text-dark stretched-link">${item.judul}</a></h5>
                            <div class="mt-2 mb-4">
                                <small class="text-muted bg-light px-2 py-1 rounded-pill border-0"><i class="fas fa-tag me-1"></i> ${item.keyword}</small>
                            </div>
                            <a href="${finalUrl}" class="btn btn-outline-primary mt-auto rounded-pill w-100 fw-bold">Buka Materi <i class="fas fa-arrow-right ms-1"></i></a>
                        </div>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-search fa-3x text-muted opacity-25 mb-3"></i>
                    <h5 class="text-muted font-heading">Materi tidak ditemukan.</h5>
                    <p class="text-muted small">Kami tidak menemukan hasil untuk "<strong>${rawQuery}</strong>". <br>Coba kata kunci lain.</p>
                    <a href="index.html" class="btn btn-primary rounded-pill px-4 mt-2 fw-bold">Kembali ke Beranda</a>
                </div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="col-12 text-center py-5"><div class="alert alert-danger rounded-4 border-0 shadow-sm d-inline-block"><i class="fas fa-exclamation-triangle me-2"></i> Gagal memuat data pencarian.</div></div>`;
    }
}

// =================================================================
// 5. LOGIKA REKOMENDASI PENCARIAN (AUTOCOMPLETE)
// =================================================================
let searchDataCache = null; // Menyimpan data JSON agar tidak didownload berulang kali

// Fungsi untuk mengambil JSON
async function fetchSearchData() {
    if (!searchDataCache) {
        try {
            const res = await fetch('assets/pencarian.json');
            searchDataCache = await res.json();
        } catch (e) {
            console.error("Gagal memuat data pencarian", e);
            searchDataCache = [];
        }
    }
    return searchDataCache;
}

// Fungsi memunculkan rekomendasi saat mengetik
async function showRecommendations(query) {
    const list = document.getElementById('searchRecommendations');
    if (!list) return;

    // Jika inputan kosong, sembunyikan kotak
    if (query.trim().length === 0) {
        list.classList.add('d-none');
        return;
    }

    const data = await fetchSearchData();
    const cleanQuery = standardizeText(query);
    
    // Filter data yang cocok (Judul, Keyword, atau Bab), ambil 5 teratas
    const filtered = data.filter(item => {
        return standardizeText(item.judul).includes(cleanQuery) || 
               standardizeText(item.keyword).includes(cleanQuery) || 
               standardizeText(item.bab).includes(cleanQuery);
    }).slice(0, 5); 

    // Render HTML ke dalam kotak dropdown
    if (filtered.length > 0) {
        list.innerHTML = filtered.map(item => {
            let finalUrl = item.url;
            if (item.id_element) finalUrl += `?highlight=${item.id_element}`;
            
            return `
            <a href="${finalUrl}" class="list-group-item list-group-item-action border-0 border-bottom px-4 py-3 d-flex align-items-center">
                <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                    <i class="fas fa-book-open text-primary"></i>
                </div>
                <div>
                    <div class="fw-bold text-dark" style="font-size: 0.95rem;">${item.judul}</div>
                    <small class="text-success fw-bold" style="font-size: 0.75rem;">${item.kelas} &bull; ${item.bab}</small>
                </div>
            </a>`;
        }).join('');
        
        // Tambah tombol "Lihat semua hasil..." di paling bawah
        list.innerHTML += `
            <button onclick="doSearch()" class="list-group-item list-group-item-action text-center text-primary fw-bold py-2 border-0 bg-light" style="font-size: 0.85rem;">
                Lihat semua hasil untuk "${query}" <i class="fas fa-arrow-right ms-1"></i>
            </button>
        `;
        list.classList.remove('d-none');
    } else {
        list.innerHTML = `<li class="list-group-item text-muted text-center py-3 border-0"><i class="fas fa-search me-2 opacity-50"></i>Materi tidak ditemukan...</li>`;
        list.classList.remove('d-none');
    }
}

// Menutup kotak rekomendasi jika user mengklik di luar area pencarian
document.addEventListener('click', (e) => {
    const input = document.getElementById('mainSearchInput');
    const list = document.getElementById('searchRecommendations');
    if (input && list && !input.contains(e.target) && !list.contains(e.target)) {
        list.classList.add('d-none');
    }
});

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