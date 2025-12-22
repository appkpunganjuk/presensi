document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#rekap-table tbody');
  const loadingSpinner = document.getElementById('loading-spinner');
  const rekapTitle = document.getElementById('rekap-title');
  const currentYearSpan = document.getElementById('current-year');
  const scriptURL = 'https://script.google.com/macros/s/AKfycby6jn7djxi1VCPWeXjwr4nILG9gxIRS-L4W3UdOijfDvELXLr_iEenZFIrQ729ygKO0/exec';
  const modal = document.getElementById('petaModal');
  const modalFrame = document.getElementById('petaFrame');
  const closeModal = document.querySelector('.close-modal');

  const mode = "REGULAR"; // Pilihan: "REGULAR" atau "RAMADHAN"

  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  function setDynamicTitle() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('id-ID', options);
    const parts = formattedDate.split(', ');
    const dayName = parts[0];
    const datePart = parts[1];
    rekapTitle.textContent = `Rekap Presensi Hari ${dayName} Tanggal ${datePart} KPU Kabupaten Nganjuk`;
  }

  setDynamicTitle();

  // Modal Logic
  if (closeModal) {
    closeModal.onclick = () => {
      modal.style.display = "none";
      modalFrame.src = "";
    };
  }
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
      modalFrame.src = "";
    }
  };

  function calculateJamPulang(waktuDatang, hariKe) {
    let jamPulang = new Date(waktuDatang.getTime());
    let minPulangTime = new Date(waktuDatang.getTime());
    minPulangTime.setSeconds(0);

    if (mode === 'REGULAR') {
      if (hariKe === 5) { // Jumat
        jamPulang.setHours(jamPulang.getHours() + 9);
        minPulangTime.setHours(16, 30, 0, 0);
      } else {
        jamPulang.setHours(jamPulang.getHours() + 8, jamPulang.getMinutes() + 30);
        minPulangTime.setHours(16, 0, 0, 0);
      }
    } else if (mode === 'RAMADHAN') {
      if (hariKe === 5) { // Jumat
        jamPulang.setHours(jamPulang.getHours() + 7, jamPulang.getMinutes() + 30);
        minPulangTime.setHours(15, 30, 0, 0);
      } else { // Hari kerja lain
        jamPulang.setHours(jamPulang.getHours() + 7);
        minPulangTime.setHours(15, 0, 0, 0);
      }
    }

    if (jamPulang < minPulangTime) {
      jamPulang = minPulangTime;
    }

    return jamPulang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  async function fetchRekapData() {
    try {
      const response = await fetch(scriptURL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      loadingSpinner.style.display = 'none';
      tableBody.innerHTML = '';
      console.log(data)

      if (data.length > 0) {
        // --- PERBAIKAN: Mengurutkan data secara kronologis (paling awal di atas) ---
        data.sort((a, b) => new Date(a.WAKTU) - new Date(b.WAKTU));

        data.forEach(row => {
          const newRow = tableBody.insertRow();
          const waktuDatangObj = new Date(row.WAKTU);

          const formattedWaktu = !isNaN(waktuDatangObj.getTime()) 
              ? waktuDatangObj.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':').replace(' ', ' ')
              : row.WAKTU;

          newRow.insertCell().textContent = formattedWaktu;
          newRow.insertCell().textContent = row.ABSENSI;
          newRow.insertCell().textContent = row.NAMA;
          newRow.insertCell().textContent = row.LOKASI;

          const lkhCell = newRow.insertCell();
          if (row.LKH && row.LKH.trim().toLowerCase() === 'sudah') {
            lkhCell.innerHTML = `<span class="badge badge-success">Sudah</span>`;
          } else {
            lkhCell.textContent = row.LKH;
          }
          
          const petaCell = newRow.insertCell();
          // Asumsi: Key JSON dari Google Sheet adalah 'PETA_URL'
          if (row.PETA_URL) {
            const btn = document.createElement('button');
            btn.className = 'btn-peta';
            btn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i>';
            btn.onclick = () => {
              modal.style.display = "flex";
              modalFrame.src = row.PETA_URL;
            };
            petaCell.appendChild(btn);
          } else {
            petaCell.textContent = '-';
          }

          const jamPulangCell = newRow.insertCell();
          let jamPulangStr = '-';

          if (row.ABSENSI === 'DATANG' && !isNaN(waktuDatangObj.getTime())) {
            const hariKe = waktuDatangObj.getDay();
            jamPulangStr = calculateJamPulang(waktuDatangObj, hariKe);
          }
          
          jamPulangCell.textContent = jamPulangStr;
        });
      } else {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada data untuk ditampilkan.</td></tr>';
      }
    } catch (error) {
      console.error('Error fetching rekap data:', error);
      loadingSpinner.style.display = 'none';
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Gagal memuat data karena kesalahan: ${error.message}</td></tr>`;
    }
  }

  fetchRekapData();
});
