// Fungsi sanitasi HTML untuk mencegah XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

let namaPegawai = [];
let turnstileWidgetId = null;
let turnstileToken = '';

const searchInput = document.getElementById('search-pegawai');
const searchResults = document.getElementById('search-results');
const hiddenInput = document.getElementById('nama-pegawai');
const petaUrlInput = document.getElementById('peta-url');
const form = document.forms['presensi-form'];
const alamatTextarea = document.getElementById('alamat');
const reloadLocationButton = document.getElementById('reload-location');
const turnstileWidget = document.getElementById('turnstile-widget');

async function loadPegawaiData() {
    try {
        const response = await fetch(CONFIG.PEGAWAI_JSON_URL);
        if (!response.ok) throw new Error('Gagal memuat data pegawai');
        namaPegawai = await response.json();
        initSearch();
    } catch (error) {
        console.error('Error loading pegawai data:', error);
        Swal.fire({
            title: 'Error',
            text: 'Gagal memuat data pegawai. Silakan refresh halaman.',
            icon: 'error',
            confirmButtonColor: '#800000'
        });
    }
}

function initSearch() {
    const savedName = localStorage.getItem('lastSelectedEmployee');
    if (savedName && namaPegawai.includes(savedName)) {
        searchInput.value = savedName;
        hiddenInput.value = savedName;
    }
    updateResults();
}

loadPegawaiData();

const map = L.map('map', {
    dragging: !L.Browser.mobile,
    touchZoom: L.Browser.mobile ? 'center' : true
}).setView([-7.6035, 111.9011], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let marker;
const gpsStatus = document.getElementById('gps-status');
const scriptURL = CONFIG.APPS_SCRIPT_URL;

function updateGPSStatus(status, message) {
    if (!gpsStatus) return;

    if (status === 'searching') {
        gpsStatus.innerHTML = '<i class="fa-solid fa-satellite-dish fa-spin"></i>';
        gpsStatus.className = 'gps-status';
        gpsStatus.title = 'Mencari sinyal GPS';
        gpsStatus.setAttribute('aria-label', 'Mencari sinyal GPS');
    } else if (status === 'active') {
        gpsStatus.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
        gpsStatus.className = 'gps-status active';
        gpsStatus.title = 'GPS aktif. Lokasi terkunci';
        gpsStatus.setAttribute('aria-label', 'GPS aktif. Lokasi terkunci');
    } else if (status === 'error') {
        gpsStatus.innerHTML = '<i class="fa-solid fa-location-dot"></i>';
        gpsStatus.className = 'gps-status error';
        gpsStatus.title = message;
        gpsStatus.setAttribute('aria-label', message);
    }
}

async function getAddress(lat, lon) {
    try {
        alamatTextarea.value = 'Mengambil alamat...';
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (data && data.display_name) {
            alamatTextarea.value = escapeHTML(data.display_name);
        } else {
            alamatTextarea.value = 'Alamat tidak ditemukan.';
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        alamatTextarea.value = 'Gagal mengambil alamat.';
    }
}

const locationLoading = document.getElementById('location-loading');

function showLoading() {
    if (locationLoading) locationLoading.classList.add('active');
}

function hideLoading() {
    if (locationLoading) locationLoading.classList.remove('active');
}

function onLocationFound(e) {
    try {
        hideLoading();
        const latlng = e.latlng;
        if (marker) map.removeLayer(marker);

        marker = L.marker(latlng).addTo(map);
        map.setView(latlng, CONFIG.MAP_DEFAULT_ZOOM);
        getAddress(latlng.lat, latlng.lng);
        updateGPSStatus('active');

        if (petaUrlInput) {
            const offset = 0.002;
            const bbox = `${latlng.lng - offset},${latlng.lat - offset},${latlng.lng + offset},${latlng.lat + offset}`;
            petaUrlInput.value = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latlng.lat},${latlng.lng}`;
        }
    } catch (error) {
        console.error('Error in onLocationFound:', error);
        Swal.fire({
            title: 'Error',
            text: 'Gagal memproses lokasi Anda.',
            icon: 'error',
            confirmButtonColor: '#800000'
        });
    }
}

function onLocationError(e) {
    try {
        hideLoading();
        let errorMessage = 'Tidak bisa mendapatkan lokasi Anda.';
        let displayMessage = 'Gagal mendapatkan lokasi';

        if (e.code === e.PERMISSION_DENIED) {
            errorMessage = 'Mohon izinkan akses lokasi di browser Anda untuk melakukan presensi. Silakan refresh halaman dan berikan izin lokasi.';
            displayMessage = 'Izin lokasi ditolak';
        } else if (e.code === e.POSITION_UNAVAILABLE) {
            errorMessage = 'Informasi lokasi tidak tersedia. Pastikan GPS Anda aktif.';
            displayMessage = 'GPS tidak tersedia';
        } else if (e.code === e.TIMEOUT) {
            errorMessage = 'Waktu permintaan lokasi habis. Silakan coba lagi.';
            displayMessage = 'Waktu habis';
        }

        updateGPSStatus('error', displayMessage);
        Swal.fire({
            title: 'Gagal',
            text: escapeHTML(errorMessage),
            icon: 'error',
            confirmButtonColor: '#800000'
        });
        alamatTextarea.value = 'Lokasi tidak dapat diakses.';
    } catch (error) {
        console.error('Error in onLocationError:', error);
    }
}

function locateUser() {
    try {
        showLoading();
        alamatTextarea.value = 'Mendeteksi lokasi...';
        updateGPSStatus('searching');
        map.locate({
            setView: true,
            maxZoom: CONFIG.MAP_DEFAULT_ZOOM,
            timeout: CONFIG.GEOLOCATION_TIMEOUT
        });
    } catch (error) {
        console.error('Error in locateUser:', error);
    }
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);
reloadLocationButton.addEventListener('click', locateUser);
document.addEventListener('DOMContentLoaded', locateUser);

const updateResults = () => {
    try {
        const query = searchInput.value.toUpperCase();
        const filteredNames = namaPegawai.filter(name => name.toUpperCase().includes(query));
        searchResults.innerHTML = '';
        if (filteredNames.length > 0) {
            filteredNames.forEach(name => {
                const item = document.createElement('div');
                item.classList.add('search-item');
                item.textContent = name;
                item.addEventListener('click', () => {
                    searchInput.value = name;
                    hiddenInput.value = name;
                    localStorage.setItem('lastSelectedEmployee', name);
                    searchResults.style.display = 'none';
                });
                searchResults.appendChild(item);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in updateResults:', error);
    }
};

searchInput.addEventListener('focus', updateResults);
searchInput.addEventListener('click', () => {
    if (hiddenInput.value && searchInput.value === hiddenInput.value) {
        searchInput.value = '';
        hiddenInput.value = '';
    }
    updateResults();
});
searchInput.addEventListener('input', () => {
    if (searchInput.value.toUpperCase() !== hiddenInput.value.toUpperCase()) hiddenInput.value = '';
    updateResults();
});

searchInput.addEventListener('change', () => {
    try {
        const selectedName = searchInput.value.trim();
        if (selectedName && namaPegawai.includes(selectedName)) {
            localStorage.setItem('lastSelectedEmployee', selectedName);
            hiddenInput.value = selectedName;
        }
    } catch (error) {
        console.error('Error in change event:', error);
    }
});

document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) searchResults.style.display = 'none';
});

function initializeTurnstile() {
    if (!turnstileWidget || turnstileWidgetId !== null) return;

    if (typeof window.turnstile === 'undefined') {
        window.setTimeout(initializeTurnstile, 100);
        return;
    }

    turnstileWidgetId = window.turnstile.render(turnstileWidget, {
        sitekey: CONFIG.TURNSTILE_SITE_KEY,
        theme: 'auto',
        callback: (token) => {
            turnstileToken = token;
        },
        'expired-callback': () => {
            turnstileToken = '';
        },
        'error-callback': () => {
            turnstileToken = '';
        }
    });
}

initializeTurnstile();

function resetTurnstile() {
    turnstileToken = '';
    if (turnstileWidgetId !== null && typeof window.turnstile !== 'undefined') {
        window.turnstile.reset(turnstileWidgetId);
    }
}

async function getSessionToken() {
    const response = await fetch(`${scriptURL}?action=session&_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error('Gagal mendapatkan session token.');
    }

    const result = await response.json();

    if (!result || result.result !== 'success' || !result.token) {
        throw new Error(result?.error || 'Session token tidak tersedia.');
    }

    return result.token;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data['nama-pegawai']) {
        Swal.fire({ title: 'Peringatan', text: 'Silakan pilih nama pegawai dari daftar.', icon: 'warning', confirmButtonColor: '#800000' });
        return;
    }
    if (!data['kehadiran']) {
        Swal.fire({ title: 'Peringatan', text: 'Silakan pilih status kehadiran.', icon: 'warning', confirmButtonColor: '#800000' });
        return;
    }
    if (!data['alamat'] || data['alamat'] === 'Mendeteksi lokasi...' || data['alamat'] === 'Lokasi tidak dapat diakses.') {
        Swal.fire({ title: 'Peringatan', text: 'Lokasi belum berhasil dideteksi. Mohon tunggu atau muat ulang lokasi.', icon: 'warning', confirmButtonColor: '#800000' });
        return;
    }
    if (!turnstileToken) {
        Swal.fire({ title: 'Peringatan', text: 'Silakan selesaikan verifikasi keamanan terlebih dahulu.', icon: 'warning', confirmButtonColor: '#800000' });
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';

    try {
        const sessionToken = await getSessionToken();
        formData.append('session-token', sessionToken);
        formData.append('turnstile-token', turnstileToken);

        const response = await fetch(scriptURL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server merespons HTTP ${response.status}.`);
        }

        const result = await response.json();

        if (result && result.result === 'success') {
            localStorage.setItem('lastSelectedEmployee', data['nama-pegawai']);
            resetTurnstile();
            Swal.fire({
                title: 'Selesai!',
                text: 'Data presensi Anda telah terekam...',
                icon: 'success',
                confirmButtonColor: '#800000'
            }).then(() => {
                window.location.href = 'rekap.html';
            });
        } else {
            resetTurnstile();
            const errorMessage = result?.error || 'Gagal mengirim presensi. Coba lagi.';
            Swal.fire({
                title: 'Gagal',
                text: escapeHTML(errorMessage),
                icon: 'error',
                confirmButtonColor: '#800000'
            });
        }
    } catch (error) {
        console.error('Error!', error.message);
        resetTurnstile();
        Swal.fire({
            title: 'Gagal',
            text: error.message || 'Gagal mengirim presensi karena masalah koneksi.',
            icon: 'error',
            confirmButtonColor: '#800000'
        });
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim';
    }
});

document.getElementById('current-year').textContent = new Date().getFullYear();
