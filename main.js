// Fungsi sanitasi HTML untuk mencegah XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

let namaPegawai = [];
const searchInput = document.getElementById('search-pegawai');
const searchResults = document.getElementById('search-results');
const hiddenInput = document.getElementById('nama-pegawai');
const petaUrlInput = document.getElementById('peta-url');
const form = document.forms['presensi-form'];
const alamatTextarea = document.getElementById('alamat');
const reloadLocationButton = document.getElementById('reload-location');

// FASE 6: Load data pegawai dari file JSON terpisah
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

// FASE 4: Local Storage - Memuat nama pegawai terakhir yang dipilih
function initSearch() {
    const savedName = localStorage.getItem('lastSelectedEmployee');
    if (savedName && namaPegawai.includes(savedName)) {
        searchInput.value = savedName;
        hiddenInput.value = savedName;
    }
    
    updateResults();
}

loadPegawaiData();

// Initialize map
const map = L.map('map', {
    dragging: !L.Browser.mobile,          // Matikan geser peta (panning) hanya di HP
    touchZoom: L.Browser.mobile ? 'center' : true // Zoom selalu fokus ke tengah di HP
}).setView([-7.6035, 111.9011], 13); // Default view (Nganjuk)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let marker;

const gpsStatus = document.getElementById('gps-status');
const scriptURL = CONFIG.APPS_SCRIPT_URL;

function updateGPSStatus(status, message) {
  if (!gpsStatus) return;
  
  if (status === 'searching') {
    gpsStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Mencari sinyal GPS...';
    gpsStatus.className = 'gps-status';
  } else if (status === 'active') {
    gpsStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> GPS Aktif - Lokasi terkunci';
    gpsStatus.className = 'gps-status active';
  } else if (status === 'error') {
    gpsStatus.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + escapeHTML(message);
    gpsStatus.className = 'gps-status error';
  }
}

async function getAddress(lat, lon) {
    try {
        alamatTextarea.value = "Mengambil alamat...";
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (data && data.display_name) {
            alamatTextarea.value = escapeHTML(data.display_name);
        } else {
            alamatTextarea.value = "Alamat tidak ditemukan.";
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        alamatTextarea.value = "Gagal mengambil alamat.";
    }
}

const locationLoading = document.getElementById('location-loading');

function showLoading() {
    if (locationLoading) {
        locationLoading.classList.add('active');
    }
}

function hideLoading() {
    if (locationLoading) {
        locationLoading.classList.remove('active');
    }
}

function onLocationFound(e) {
    try {
        hideLoading();
        const latlng = e.latlng;
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker(latlng).addTo(map).bindPopup("Lokasi Anda saat ini").openPopup();
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
        alamatTextarea.value = "Lokasi tidak dapat diakses.";
    } catch (error) {
        console.error('Error in onLocationError:', error);
    }
}

function locateUser() {
    try {
        showLoading();
        alamatTextarea.value = "Mendeteksi lokasi...";
        updateGPSStatus('searching');
        map.locate({setView: true, maxZoom: CONFIG.MAP_DEFAULT_ZOOM});
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
                item.textContent = escapeHTML(name);
                item.addEventListener('click', () => {
                    searchInput.value = escapeHTML(name);
                    hiddenInput.value = escapeHTML(name);
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
searchInput.addEventListener('input', () => {
    if (searchInput.value.toUpperCase() !== hiddenInput.value.toUpperCase()) {
        hiddenInput.value = '';
    }
    updateResults();
});

searchInput.addEventListener('change', () => {
    try {
        const selectedName = searchInput.value.trim();
        if (selectedName && namaPegawai.includes(selectedName)) {
            localStorage.setItem('lastSelectedEmployee', selectedName);
            hiddenInput.value = escapeHTML(selectedName);
        }
    } catch (error) {
        console.error('Error in change event:', error);
    }
});

document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.style.display = 'none';
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonContent = submitButton.innerHTML;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    console.log(formData)

    // Validation
    if (!data['nama-pegawai']) {
        Swal.fire({
            title: 'Peringatan',
            text: 'Silakan pilih nama pegawai dari daftar.',
            icon: 'warning',
            confirmButtonColor: '#800000'
        });
        return;
    }
    if (!data['kehadiran']) {
        Swal.fire({
            title: 'Peringatan',
            text: 'Silakan pilih status kehadiran.',
            icon: 'warning',
            confirmButtonColor: '#800000'
        });
        return;
    }
    if (!data['alamat'] || data['alamat'] === 'Mendeteksi lokasi...' || data['alamat'] === 'Lokasi tidak dapat diakses.') {
        Swal.fire({
            title: 'Peringatan',
            text: 'Lokasi belum berhasil dideteksi. Mohon tunggu atau muat ulang lokasi.',
            icon: 'warning',
            confirmButtonColor: '#800000'
        });
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';

    fetch(scriptURL, { method: 'POST', body: formData })
        .then(response => {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi';

            if (response.ok) {
                localStorage.setItem('lastSelectedEmployee', data['nama-pegawai']);
                
                Swal.fire({
                    title: 'Selesai!',
                    text: 'Data presensi Anda telah terekam...',
                    icon: 'success',
                    confirmButtonColor: '#800000'
                }).then(() => {
                    window.location.href = 'rekap.html';
                });
            } else {
                response.json().then(data => {
                    let errorMessage = 'Gagal mengirim presensi. Coba lagi.';
                    if (data && data.error) {
                        errorMessage += `\nDetail: ${escapeHTML(data.error)}`;
                    }
                    Swal.fire({
                        title: 'Gagal',
                        text: escapeHTML(errorMessage),
                        icon: 'error',
                        confirmButtonColor: '#800000'
                    });
                }).catch(() => {
                    Swal.fire({
                        title: 'Gagal',
                        text: 'Gagal mengirim presensi karena kesalahan server.',
                        icon: 'error',
                        confirmButtonColor: '#800000'
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error!', error.message);
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi';
            Swal.fire({
                title: 'Gagal',
                text: 'Gagal mengirim presensi karena masalah koneksi.',
                icon: 'error',
                confirmButtonColor: '#800000'
            });
        });
});

// Set current year in the footer
document.getElementById('current-year').textContent = new Date().getFullYear();
