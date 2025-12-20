const namaPegawai = ["KRISTANTO", "MUHAMMAD IMAM SUBKHI", "AMINODIN", "DWI RIYANTO YUWONO", "ANANG SUBEKTI", "IMAM WAHYUDI", "WIJI RAHAYU", "GILANG YAHYA NASRULLAH", "TITAN TAWANG ILAL BILLHAQQI", "ALFA ALFIN MAGHFIROH", "WISNU PURNAMA", "SYAHRINDRA DZAKY RAMADHAN", "ANITA ROSANTI", "FATKUR ROZIKIN", "HENI RIASTUTIK", "ANANG ASY'ARI", "JASWADI", "AFRAN EFFENDI", "SEPTYAN WAHYU NUGROHO", "M. MIRZA SULTHONI", "SATRIO ADI WINUGROHO", "SEPTIAN RENDY CHARISMA PUTRA", "BELLA ANGGRAINI PUSPITA SARI", "JADMIKO", "SUGIANTO", "AGUS PRAYITNO", "TRIYONO", "JARMO", "TONI NURHUDA", "MUHAMMAD NOVAL FAJRUL HUDA"];

const searchInput = document.getElementById('search-pegawai');
const searchResults = document.getElementById('search-results');
const hiddenInput = document.getElementById('nama-pegawai');
const form = document.forms['presensi-form'];
const alamatTextarea = document.getElementById('alamat');
const reloadLocationButton = document.getElementById('reload-location');
const scriptURL = 'https://script.google.com/macros/s/AKfycbyvxPCCJFv6QdD9BKsb2_DiL0UJG0wAQwlrHACafSP4BZhj7Z9Ilm13F9feeDxUMb0_IQ/exec';

// Initialize map
const map = L.map('map', {
    dragging: !L.Browser.mobile,          // Matikan geser peta (panning) hanya di HP
    touchZoom: L.Browser.mobile ? 'center' : true // Zoom selalu fokus ke tengah di HP
}).setView([-7.6035, 111.9011], 13); // Default view (Nganjuk)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let marker;

async function getAddress(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (data && data.display_name) {
            alamatTextarea.value = data.display_name;
        } else {
            alamatTextarea.value = "Alamat tidak ditemukan.";
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        alamatTextarea.value = "Gagal mengambil alamat.";
    }
}

function onLocationFound(e) {
    const latlng = e.latlng;
    if (marker) {
        map.removeLayer(marker);
    }
    marker = L.marker(latlng).addTo(map).bindPopup("Lokasi Anda saat ini").openPopup();
    map.setView(latlng, 16); // Zoom to user's location
    getAddress(latlng.lat, latlng.lng);
}

function onLocationError(e) {
    Swal.fire({
        title: 'Gagal',
        text: 'Tidak bisa mendapatkan lokasi Anda. Pastikan Anda mengizinkan akses lokasi.',
        icon: 'error',
        confirmButtonColor: '#800000'
    });
    alamatTextarea.value = "Lokasi tidak dapat diakses.";
}

function locateUser() {
    alamatTextarea.value = "Mendeteksi lokasi...";
    map.locate({setView: true, maxZoom: 16});
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);
reloadLocationButton.addEventListener('click', locateUser);
document.addEventListener('DOMContentLoaded', locateUser);

const updateResults = () => {
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
                searchResults.style.display = 'none';
            });
            searchResults.appendChild(item);
        });
        searchResults.style.display = 'block';
    } else {
        searchResults.style.display = 'none';
    }
};

searchInput.addEventListener('focus', updateResults);
searchInput.addEventListener('input', () => {
    if (searchInput.value.toUpperCase() !== hiddenInput.value.toUpperCase()) {
        hiddenInput.value = '';
    }
    updateResults();
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
        alert('Silakan pilih nama pegawai dari daftar.');
        return;
    }
    if (!data['kehadiran']) {
        alert('Silakan pilih status kehadiran.');
        return;
    }
    if (!data['alamat'] || data['alamat'] === 'Mendeteksi lokasi...' || data['alamat'] === 'Lokasi tidak dapat diakses.') {
        alert('Lokasi belum berhasil dideteksi. Mohon tunggu atau muat ulang lokasi.');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';

    fetch(scriptURL, { method: 'POST', body: formData })
        .then(response => {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi';

            if (response.ok) {
                Swal.fire({
                    title: 'Selesai!',
                    text: 'Data presensi Anda telah terekam...',
                    icon: 'success'
                    confirmButtonColor: '#800000'
                }).then(() => {
                    window.location.href = 'rekap.html';
                });
            } else {
                response.json().then(data => {
                    let errorMessage = 'Gagal mengirim presensi. Coba lagi.';
                    if (data && data.error) {
                        errorMessage += `\nDetail: ${data.error}`;
                    }
                    Swal.fire({
                    title: 'Gagal!',
                    text: errorMessage,
                    icon: 'error'
                    confirmButtonColor: '#800000'
                }).catch(() => {
                    Swal.fire({
                    title: 'Gagal!',
                    text: 'Gagal mengirim presensi karena kesalahan server...',
                    icon: 'error'
                    confirmButtonColor: '#800000'
                });
            }
        })
        .catch(error => {
            console.error('Error!', error.message);
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi';
            Swal.fire('Gagal', 'Gagal mengirim presensi karena masalah koneksi.', 'error');
        });
    });

// Set current year in the footer
document.getElementById('current-year').textContent = new Date().getFullYear();
