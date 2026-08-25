document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#rekap-table tbody');
  const loadingSpinner = document.getElementById('loading-spinner');
  const rekapTitle = document.getElementById('rekap-title');
  const currentYearSpan = document.getElementById('current-year');
  const scriptURL = 'https://script.google.com/macros/s/AKfycby6jn7djxi1VCPWeXjwr4nILG9gxIRS-L4W3UdOijfDvELXLr_iEenZFIrQ729ygKO0/exec';
  const modal = document.getElementById('petaModal');
  const modalFrame = document.getElementById('petaFrame');
  const closeModal = document.querySelector('.close-modal');
  
  // Filter elements
  const filterNama = document.getElementById('filter-nama');
  const filterJenis = document.getElementById('filter-jenis');
  const btnReload = document.getElementById('btn-reload');
  
  // Store original data
  let allData = [];
  
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

  // Function to populate filter dropdowns
  function populateFilters(data) {
    // Get unique names
    const uniqueNames = [...new Set(data.map(item => item.NAMA))].sort();
    
    // Clear existing options except the first one
    filterNama.innerHTML = '<option value="">Semua Pegawai</option>';
    
    // Add name options
    uniqueNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      filterNama.appendChild(option);
    });
  }

  // Function to render table with filters
  function renderTable(data) {
    tableBody.innerHTML = '';
    
    const selectedNama = filterNama.value;
    const selectedJenis = filterJenis.value;
    
    // Filter data
    const filteredData = data.filter(row => {
      const matchNama = selectedNama === '' || row.NAMA === selectedNama;
      const matchJenis = selectedJenis === '' || row.ABSENSI === selectedJenis;
      return matchNama && matchJenis;
    });
    
    if (filteredData.length > 0) {
      filteredData.forEach(row => {
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
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data yang sesuai dengan filter.</td></tr>';
    }
  }

  async function fetchRekapData() {
    try {
      loadingSpinner.style.display = 'flex';
      tableBody.innerHTML = '';
      
      const response = await fetch(scriptURL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      loadingSpinner.style.display = 'none';
      console.log(data);

      if (data.length > 0) {
        // Store original data
        allData = data;
        
        // Sort data chronologically
        allData.sort((a, b) => new Date(a.WAKTU) - new Date(b.WAKTU));

        // Populate filters
        populateFilters(allData);
        
        // Render table with current filters
        renderTable(allData);
      } else {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data untuk ditampilkan.</td></tr>';
      }
    } catch (error) {
      console.error('Error fetching rekap data:', error);
      loadingSpinner.style.display = 'none';
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data karena kesalahan: ${error.message}</td></tr>`;
    }
  }

  // Event listeners for filters
  if (filterNama) {
    filterNama.addEventListener('change', () => renderTable(allData));
  }
  
  if (filterJenis) {
    filterJenis.addEventListener('change', () => renderTable(allData));
  }
  
  // Event listener for reload button
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      btnReload.disabled = true;
      btnReload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
      fetchRekapData().then(() => {
        btnReload.disabled = false;
        btnReload.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Data';
      });
    });
  }

  fetchRekapData();
});
