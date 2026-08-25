document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#rekap-table tbody');
  const loadingSpinner = document.getElementById('loading-spinner');
  const rekapTitle = document.getElementById('rekap-title');
  const currentYearSpan = document.getElementById('current-year');
  const modal = document.getElementById('petaModal');
  const modalFrame = document.getElementById('petaFrame');
  const modalTitle = document.getElementById('petaModalTitle');
  const closeModal = document.querySelector('.close-modal');
  const filterNama = document.getElementById('filter-nama');
  const filterJenis = document.getElementById('filter-jenis');
  const btnReload = document.getElementById('btn-reload');
  const scriptURL = CONFIG.REKAP_SCRIPT_URL;
  const mode = CONFIG.PRESENSI_MODE;
  let allData = [];

  if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

  function setDynamicTitle() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('id-ID', options);
    const parts = formattedDate.split(', ');
    rekapTitle.textContent = `Rekap Presensi Hari ${parts[0]} Tanggal ${parts[1]} KPU Kabupaten Nganjuk`;
  }

  setDynamicTitle();

  function closeMapModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modalFrame.src = '';
  }

  if (closeModal) closeModal.addEventListener('click', closeMapModal);
  window.addEventListener('click', event => {
    if (event.target === modal) closeMapModal();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.style.display === 'flex') closeMapModal();
  });

  function calculateJamPulang(waktuMulai, hariKe) {
    const modeOptions = CONFIG.PRESENSI_OPTIONS[mode] || CONFIG.PRESENSI_OPTIONS.REGULAR;
    const dayOptions = hariKe === 5 ? modeOptions.FRIDAY : modeOptions.NORMAL;
    const jamPulang = new Date(waktuMulai.getTime());
    const minPulangTime = new Date(waktuMulai.getTime());

    jamPulang.setHours(jamPulang.getHours() + dayOptions.offsetHours, jamPulang.getMinutes() + dayOptions.offsetMinutes);
    minPulangTime.setHours(dayOptions.minimumHour, dayOptions.minimumMinute, 0, 0);

    const estimatedTime = jamPulang < minPulangTime ? minPulangTime : jamPulang;
    return estimatedTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function populateFilters(data) {
    const uniqueNames = [...new Set(data.map(item => item.NAMA))].sort();
    filterNama.innerHTML = '<option value="">Semua Pegawai</option>';
    uniqueNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      filterNama.appendChild(option);
    });
  }

  function openMapModal(row) {
    modalTitle.textContent = `Lokasi Presensi : ${row.NAMA || '-'}`;
    modalFrame.src = row.PETA_URL;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }

  function renderTable(data) {
    tableBody.innerHTML = '';
    const selectedNama = filterNama.value;
    const selectedJenis = filterJenis.value;
    const filteredData = data.filter(row => {
      const matchNama = selectedNama === '' || row.NAMA === selectedNama;
      const matchJenis = selectedJenis === '' || row.ABSENSI === selectedJenis;
      return matchNama && matchJenis;
    });

    if (filteredData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data yang sesuai dengan filter.</td></tr>';
      return;
    }

    filteredData.forEach(row => {
      const newRow = tableBody.insertRow();
      const waktuMulaiObj = new Date(row.WAKTU);
      const formattedWaktu = !isNaN(waktuMulaiObj.getTime())
        ? waktuMulaiObj.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')
        : row.WAKTU;

      newRow.insertCell().textContent = formattedWaktu;
      newRow.insertCell().textContent = row.ABSENSI;
      newRow.insertCell().textContent = row.NAMA;
      newRow.insertCell().textContent = row.LOKASI;

      const lkhCell = newRow.insertCell();
      if (row.LKH && row.LKH.trim().toLowerCase() === 'sudah') {
        lkhCell.innerHTML = '<span class="badge badge-success">Sudah</span>';
      } else {
        lkhCell.textContent = row.LKH || '-';
      }

      const petaCell = newRow.insertCell();
      if (row.PETA_URL) {
        const btn = document.createElement('button');
        btn.className = 'btn-peta';
        btn.type = 'button';
        btn.title = `Lihat lokasi presensi ${row.NAMA || ''}`.trim();
        btn.setAttribute('aria-label', btn.title);
        btn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i>';
        btn.addEventListener('click', () => openMapModal(row));
        petaCell.appendChild(btn);
      } else {
        petaCell.textContent = '-';
      }

      const jamPulangCell = newRow.insertCell();
      let jamPulangStr = '-';
      const jenisMulai = row.ABSENSI === 'DATANG' || row.ABSENSI === 'WFH/ WFA MULAI';
      if (jenisMulai && !isNaN(waktuMulaiObj.getTime())) {
        jamPulangStr = calculateJamPulang(waktuMulaiObj, waktuMulaiObj.getDay());
      }
      jamPulangCell.textContent = jamPulangStr;
    });
  }

  async function fetchRekapData() {
    try {
      loadingSpinner.style.display = 'flex';
      tableBody.innerHTML = '';
      const response = await fetch(scriptURL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      loadingSpinner.style.display = 'none';

      if (data.length > 0) {
        allData = data.sort((a, b) => new Date(a.WAKTU) - new Date(b.WAKTU));
        populateFilters(allData);
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

  filterNama.addEventListener('change', () => renderTable(allData));
  filterJenis.addEventListener('change', () => renderTable(allData));

  btnReload.addEventListener('click', () => {
    btnReload.disabled = true;
    btnReload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    fetchRekapData().finally(() => {
      btnReload.disabled = false;
      btnReload.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Data';
    });
  });

  fetchRekapData();
});
