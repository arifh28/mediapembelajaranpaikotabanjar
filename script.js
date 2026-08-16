// =================================================================
// 1. KONFIGURASI SUPABASE (Hanya untuk Analytics & Form Saran)
// =================================================================
const SUPABASE_URL = 'https://oisrtlcxdwgvzrxrlzpb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pc3J0bGN4ZHdndnpyeHJsenBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzM3OTEsImV4cCI6MjA3ODYwOTc5MX0.aI162olkIydnJrRxLnC0NsBU9umySmd2nWSTt8Hc1ec'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =================================================================
// 2. LOGIKA LOGIN GOOGLE APPS SCRIPT (GAS)
// =================================================================

// GANTI DENGAN URL DEPLOYMENT APPS SCRIPT ANDA SENDIRI
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyq3ZQuaBMK4HNycPWu86pt2fSu7z7eZzi6N5s6V7KrCAC0fB33pyfNfJbExEjv61Xj/exec'; 

// Tangani Form Submit Login
const loginForm = document.getElementById('gasLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('usernameInput').value.trim();
        const password = document.getElementById('passwordInput').value.trim();
        const btnSubmit = document.getElementById('btnLoginSubmit');
        const alertBox = document.getElementById('loginAlert');
        
        // Ubah UI Tombol menjadi Loading
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Memverifikasi...';
        alertBox.classList.add('d-none');

        // Susun payload sesuai dengan doPost di Code.gs
        const payload = {
            action: "login",
            username: username,
            password: password
        };

        try {
            // Karena GAS menggunakan CORS, gunakan fetch POST
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.status === "success" || result.status === "sukses") {
                // 1. SIMPAN SESI KE LOCAL STORAGE
                localStorage.setItem('user_session', JSON.stringify(result.user));
                
                // 2. Tutup Modal & Refresh Tampilan
                const modalElement = document.getElementById('loginModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if(modalInstance) modalInstance.hide();
                
                // Cek ulang sesi untuk mengubah UI
                checkUserSessionGAS();
                
            } else {
                // Tampilkan pesan error dari server
                alertBox.innerText = result.message || "Gagal login. Periksa username dan password.";
                alertBox.classList.remove('d-none');
            }
        } catch (error) {
            console.error("Login Error:", error);
            alertBox.innerText = "Terjadi kesalahan koneksi ke server.";
            alertBox.classList.remove('d-none');
        } finally {
            // Kembalikan Tombol
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Masuk Sekarang';
        }
    });
}

// Fungsi Logout
function logoutGAS() {
    localStorage.removeItem('user_session');
    window.location.reload();
}

// Fungsi untuk menangkap sesi lemparan dari Netlify
function tangkapSesiLintasDomain() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenSesi = urlParams.get('token_sesi');

    if (tokenSesi) {
        try {
            // Decode (terjemahkan kembali) Base64 menjadi JSON string
            const decodedSession = decodeURIComponent(atob(tokenSesi));
            
            // Simpan ke localStorage Vercel
            localStorage.setItem('user_session', decodedSession);
            
            // Bersihkan URL agar token_sesi hilang dari address bar (lebih rapi & aman)
            const urlBersih = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: urlBersih}, '', urlBersih);
            
        } catch (error) {
            console.error("Gagal membaca sesi lintas domain", error);
        }
    }
}

// Cek Sesi User (Berbasis LocalStorage)
function checkUserSessionGAS() {
    const sessionData = localStorage.getItem('user_session');
    const authContainer = document.getElementById('authContainer');

    const authOnlyElements = document.querySelectorAll('.auth-only');
    const guestOnlyElements = document.querySelectorAll('.guest-only');

    if (sessionData) {
        // --- USER SUDAH LOGIN ---
        const user = JSON.parse(sessionData);
        
        // Ambil nama (Utamakan Nama Lengkap, jika tidak ada pakai username)
        const displayName = user.Nama_Lengkap || user.nama_lengkap || user.Username || "Guru";
        
        // Buat Avatar Inisial
        const avatarUrl = user.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0d6efd&color=fff`;

        // Render Dropdown Profil di Navbar
        if(authContainer) {
            authContainer.innerHTML = `
            <div class="dropdown">
                <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle text-dark fw-bold" data-bs-toggle="dropdown">
                    <img src="${avatarUrl}" alt="Profile" class="user-profile-img me-2 shadow-sm" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-green);">
                    <span class="d-none d-lg-inline">${displayName}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2">
                    <li><h6 class="dropdown-header text-primary"><i class="fas fa-id-badge me-1"></i> ${user.Role || 'Guru'}</h6></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="logoutGAS()"><i class="fas fa-sign-out-alt me-2"></i> Keluar</a></li>
                </ul>
            </div>`;
        }

        // Tampilkan elemen khusus member
        authOnlyElements.forEach(el => el.classList.remove('d-none'));
        guestOnlyElements.forEach(el => el.classList.add('d-none'));

    } else {
        // --- USER BELUM LOGIN ---
        if(authContainer) {
            // Tampilkan tombol pemanggil Modal Login
            authContainer.innerHTML = `
            <button class="btn btn-outline-primary rounded-pill px-4 fw-bold w-100" data-bs-toggle="modal" data-bs-target="#loginModal">
                <i class="fas fa-sign-in-alt me-2"></i> Masuk
            </button>`;
        }

        authOnlyElements.forEach(el => el.classList.add('d-none'));
        guestOnlyElements.forEach(el => el.classList.remove('d-none'));
    }
}

// Panggil fungsi penangkap DULU sebelum mengecek sesi
tangkapSesiLintasDomain();

// Panggil cek sesi saat script dimuat
checkUserSessionGAS();

// =================================================================
// 3. FUNGSI PENCARIAN DARI HERO SECTION
// =================================================================
function doSearch() {
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
// 4. FUNGSI RENDER POSTS (BLOG)
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

    // 2. Tangani Form Submit Saran ke Supabase
    const formSaran = document.getElementById('formKritikSaran');
    if (formSaran) {
        formSaran.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nama = document.getElementById('fs-nama').value;
            const saran = document.getElementById('fs-saran').value;
            const btnSubmit = document.getElementById('btnSubmitSaran');
            
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mengirim...';

            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                const ip_address = ipData.ip;

                const { error } = await _supabase.from('kritik_saran').insert([
                    { nama: nama, saran: saran, ip_address: ip_address }
                ]);

                if (error) throw error;
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
// 5. FUNGSI TRACK CLICK (HYBRID: LINK & DATABASE SUPABASE)
// =================================================================

async function logPageView() {
    let pageName = window.location.pathname.split("/").pop();
    if (pageName === "") pageName = "index.html"; 

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
    
    // A. BUKA LINK DULUAN
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

    // B. PEREKAMAN DATA
    try {
        await _supabase.from('analytics_logs').insert([
            { event_type: 'click_material', event_name: materialId }
        ]);

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
            await _supabase
                .from('material_analytics')
                .insert([{ material_name: materialId, click_count: 1 }]);
        }

    } catch (err) {
        console.error("Error tracking:", err);
    }
}

// =================================================================
// 6. FUNGSI LOAD VIEW & TRENDING
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
// 7. LOGIKA PENCARIAN & AUTOCOMPLETE
// =================================================================

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

function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase().replace(/[^a-z0-9]/g, ''); 
}

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

let searchDataCache = null;

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

async function showRecommendations(query) {
    const list = document.getElementById('searchRecommendations');
    if (!list) return;

    if (query.trim().length === 0) {
        list.classList.add('d-none');
        return;
    }

    const data = await fetchSearchData();
    const cleanQuery = standardizeText(query);
    
    const filtered = data.filter(item => {
        return standardizeText(item.judul).includes(cleanQuery) || 
               standardizeText(item.keyword).includes(cleanQuery) || 
               standardizeText(item.bab).includes(cleanQuery);
    }).slice(0, 5); 

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

document.addEventListener('click', (e) => {
    const input = document.getElementById('mainSearchInput');
    const list = document.getElementById('searchRecommendations');
    if (input && list && !input.contains(e.target) && !list.contains(e.target)) {
        list.classList.add('d-none');
    }
});

// =================================================================
// 8. EVENT LISTENER AWAL DOM
// =================================================================

document.addEventListener("DOMContentLoaded", function() {
    if (sessionStorage.getItem('hideIFPWidget') === 'true') {
        const widget = document.getElementById('floatingIFP');
        if (widget) {
            widget.classList.add('d-none'); 
            widget.classList.remove('d-lg-flex');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    logPageView();
    loadViews();
    loadTrending();
    renderSearchResults();   

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

    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('highlight');

    if (targetId) {
        const targetElement = document.querySelector(`[data-id="${targetId}"]`);
        if (targetElement) {
            const cardElement = targetElement.closest('.card');
            if (cardElement) {
                setTimeout(() => {
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    cardElement.style.transition = "all 0.5s";
                    cardElement.classList.add('border', 'border-warning', 'border-5');
                }, 500);
                
                setTimeout(() => {
                    cardElement.classList.remove('border', 'border-warning', 'border-5');
                }, 3500);
            }
        }
    }

    if (sessionStorage.getItem('hideIFPWidget') === 'true') {
        const widget = document.getElementById('floatingIFP');
        if (widget) {
            widget.classList.remove('d-lg-flex'); 
            widget.classList.add('d-none');        
        }
    }
});

function closeIFPWidget() {
    const widget = document.getElementById('floatingIFP');
    
    if (widget) {
        widget.classList.add('hide-widget');
        sessionStorage.setItem('hideIFPWidget', 'true');
        
        setTimeout(() => {
            widget.classList.remove('d-lg-flex'); 
            widget.classList.add('d-none');        
            widget.style.display = ''; 
        }, 500);
    } else {
        console.log("Widget tidak ditemukan/sudah hilang");
    }
}