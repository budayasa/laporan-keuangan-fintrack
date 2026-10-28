/**
 * FinTrack Pro — Sistem Pencatatan & Rekap Laporan Keuangan
 * Siap deploy di Vercel (vercel.app)
 */

const STORAGE_KEY = 'fintrack_pro_transactions_v1';
const THEME_KEY = 'fintrack_pro_theme';
const CLOUD_CONFIG_KEY = 'fintrack_pro_supabase_config';
const LAST_INPUTTER_KEY = 'fintrack_pro_last_inputter';
const CUSTOM_CAT_KEY = 'fintrack_pro_custom_categories';
const BUDGET_LIMIT_KEY = 'fintrack_pro_budget_limit';

const CATEGORIES = {
  income: [
    'Penjualan Produk / Jasa',
    'Dana Kas Masuk',
    'Gaji & Honorarium',
    'Investasi & Bagi Hasil',
    'Sponsor / Donasi Masuk',
    'Piutang Terbayar',
    'Pemasukan Lainnya'
  ],
  expense: [
    'Operasional & ATK Kantor',
    'Konsumsi & Rapat',
    'Transportasi & BBM',
    'Belanja Barang / Stok',
    'Tagihan Listrik, Air & Internet',
    'Gaji & Upah Tim',
    'Promosi & Pemasaran',
    'Perawatan & Perbaikan',
    'Pengeluaran Lainnya'
  ]
};

const AVATAR_COLORS = [
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
];

// State Aplikasi
let state = {
  transactions: [],
  currentType: 'income', // 'income' | 'expense'
  editingId: null,
  activeViewTab: 'all', // 'all' | 'tables' | 'charts' | 'recap'
  tableLayout: 'split', // 'split' | 'combined'
  filters: {
    search: '',
    inputter: 'ALL',
    period: 'ALL',
    customMonth: '',
    sort: 'NEWEST'
  },
  cloudConfig: null
};

// Chart Instances
let cashflowChartInstance = null;
let categoryChartInstance = null;
let inputterChartInstance = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRupiah(number) {
  const num = Number(number) || 0;
  const isNegative = num < 0;
  const formatted = Math.abs(num).toLocaleString('id-ID');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

function formatNumberDots(value) {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

function parseRawAmount(formattedStr) {
  const digits = String(formattedStr).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function getLocalDatetimeInputValue(dateObj = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateID(isoDateStr, includeTime = true) {
  if (!isoDateStr) return '-';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return isoDateStr;
  const datePart = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  if (!includeTime) return datePart;
  const timePart = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${datePart}, ${timePart}`;
}

function formatMonthYearID(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
  const [y, m] = yyyyMm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColorClass(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const colors = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    danger: 'bg-rose-600 text-white border-rose-500',
    info: 'bg-indigo-600 text-white border-indigo-500'
  };

  const icons = {
    success: 'check-circle-2',
    danger: 'alert-circle',
    info: 'info'
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border ${colors[type] || colors.info} text-xs font-bold animate-fade-in`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
    <span class="flex-1">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// ============================================================================
// DEMO DATA GENERATOR
// ============================================================================

function getDemoTransactions() {
  const now = new Date();
  const daysAgo = (n, h = 10, m = 30) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return getLocalDatetimeInputValue(d);
  };

  return [
    {
      id: 'TRX-1001',
      inputter: 'Budi Santoso',
      type: 'income',
      amount: 15000000,
      category: 'Dana Kas Masuk',
      method: 'Transfer Bank',
      note: 'Saldo kas awal operasional bulan ini',
      date: daysAgo(6, 9, 15)
    },
    {
      id: 'TRX-1002',
      inputter: 'Siti Rahma',
      type: 'income',
      amount: 8500000,
      category: 'Penjualan Produk / Jasa',
      method: 'Transfer Bank',
      note: 'Pembayaran proyek website & aplikasi klien PT Maju Jaya',
      date: daysAgo(5, 14, 20)
    },
    {
      id: 'TRX-1003',
      inputter: 'Andi Pratama',
      type: 'expense',
      amount: 1850000,
      category: 'Operasional & ATK Kantor',
      method: 'QRIS / E-Wallet',
      note: 'Pembelian kertas A4, tinta printer, dan perlengkapan kerja',
      date: daysAgo(4, 11, 10)
    },
    {
      id: 'TRX-1004',
      inputter: 'Siti Rahma',
      type: 'expense',
      amount: 950000,
      category: 'Tagihan Listrik, Air & Internet',
      method: 'Transfer Bank',
      note: 'Pembayaran WiFi bisnis kecepatan tinggi & listrik bulanan',
      date: daysAgo(3, 16, 5)
    },
    {
      id: 'TRX-1005',
      inputter: 'Budi Santoso',
      type: 'income',
      amount: 6200000,
      category: 'Penjualan Produk / Jasa',
      method: 'Transfer Bank',
      note: 'Pelunasan invoice layanan konsultasi & maintenance',
      date: daysAgo(2, 13, 45)
    },
    {
      id: 'TRX-1006',
      inputter: 'Dewi Lestari',
      type: 'expense',
      amount: 750000,
      category: 'Konsumsi & Rapat',
      method: 'Tunai (Cash)',
      note: 'Konsumsi rapat evaluasi mingguan seluruh tim',
      date: daysAgo(2, 15, 30)
    },
    {
      id: 'TRX-1007',
      inputter: 'Andi Pratama',
      type: 'expense',
      amount: 450000,
      category: 'Transportasi & BBM',
      method: 'Tunai (Cash)',
      note: 'Biaya operasional kurir & perjalanan dinas luar kota',
      date: daysAgo(1, 10, 0)
    },
    {
      id: 'TRX-1008',
      inputter: 'Dewi Lestari',
      type: 'income',
      amount: 4750000,
      category: 'Investasi & Bagi Hasil',
      method: 'Transfer Bank',
      note: 'Penerimaan bagi hasil kemitraan cabang',
      date: daysAgo(0, 9, 30)
    },
    {
      id: 'TRX-1009',
      inputter: 'Siti Rahma',
      type: 'expense',
      amount: 3200000,
      category: 'Gaji & Upah Tim',
      method: 'Transfer Bank',
      note: 'Insentif mingguan tim lapangan & admin',
      date: daysAgo(0, 11, 45)
    }
  ];
}

// ============================================================================
// STORAGE & OPTIONAL SUPABASE CLOUD SYNC
// ============================================================================

function loadCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (raw) {
      state.cloudConfig = JSON.parse(raw);
    }
  } catch (e) {
    state.cloudConfig = null;
  }
  updateStorageStatusUI();
}

function updateStorageStatusUI() {
  const label = document.getElementById('storageStatusLabel');
  const footerInfo = document.getElementById('footerStorageInfo');
  if (state.cloudConfig && state.cloudConfig.url && state.cloudConfig.key) {
    if (label) label.textContent = 'Cloud Aktif (Supabase)';
    if (footerInfo) footerInfo.textContent = 'Tersinkronisasi dengan Cloud Database & Perangkat Lokal';
  } else {
    if (label) label.textContent = 'Penyimpanan Lokal';
    if (footerInfo) footerInfo.textContent = 'Data tersimpan otomatis di browser perangkat Anda';
  }
}

async function loadTransactions() {
  // 1. Jika Cloud Supabase dikonfigurasi, coba ambil dari cloud
  if (state.cloudConfig && state.cloudConfig.url && state.cloudConfig.key) {
    try {
      const endpoint = `${state.cloudConfig.url.replace(/\/$/, '')}/rest/v1/transactions?select=*&order=date.desc`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: state.cloudConfig.key,
          Authorization: `Bearer ${state.cloudConfig.key}`
        }
      });
      if (res.ok) {
        const cloudData = await res.json();
        state.transactions = cloudData.map((item) => ({
          id: item.id,
          inputter: item.inputter,
          type: item.type,
          amount: Number(item.amount),
          category: item.category,
          method: item.method || 'Transfer Bank',
          note: item.note,
          date: item.date
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
        renderAll();
        return;
      }
    } catch (err) {
      console.warn('Gagal memuat dari cloud, beralih ke penyimpanan lokal:', err);
    }
  }

  // 2. Penyimpanan LocalStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) {
    // Pertama kali buka: muat contoh data agar langsung terlihat grafis & tabelnya
    state.transactions = getDemoTransactions();
    saveTransactionsToLocal();
  } else {
    try {
      state.transactions = JSON.parse(saved) || [];
    } catch (e) {
      state.transactions = [];
    }
  }
  renderAll();
}

function saveTransactionsToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

async function syncSingleToCloud(trx, action = 'UPSERT') {
  if (!state.cloudConfig || !state.cloudConfig.url || !state.cloudConfig.key) return;
  const baseUrl = `${state.cloudConfig.url.replace(/\/$/, '')}/rest/v1/transactions`;
  const headers = {
    apikey: state.cloudConfig.key,
    Authorization: `Bearer ${state.cloudConfig.key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates'
  };

  try {
    if (action === 'UPSERT') {
      await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(trx)
      });
    } else if (action === 'DELETE') {
      await fetch(`${baseUrl}?id=eq.${encodeURIComponent(trx.id)}`, {
        method: 'DELETE',
        headers
      });
    }
  } catch (err) {
    console.warn('Cloud sync warning:', err);
  }
}

// ============================================================================
// REALTIME CLOCK & AUTOMATIC DATE
// ============================================================================

function initRealtimeClock() {
  const clockEl = document.getElementById('liveClockDisplay');
  const dateInput = document.getElementById('transactionDate');
  const autoToggle = document.getElementById('autoDateToggle');
  const autoBadge = document.getElementById('autoBadge');

  function updateClock() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' • ' + now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    // Jika mode "Otomatis Realtime" aktif dan tidak sedang mengedit transaksi lama
    if (autoToggle && autoToggle.checked && !state.editingId && dateInput) {
      dateInput.value = getLocalDatetimeInputValue(now);
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  if (autoToggle && dateInput) {
    autoToggle.addEventListener('change', () => {
      if (autoToggle.checked) {
        dateInput.readOnly = true;
        dateInput.classList.add('cursor-not-allowed', 'bg-slate-100/90', 'dark:bg-slate-800/70');
        dateInput.classList.remove('bg-white', 'dark:bg-slate-900/90');
        dateInput.value = getLocalDatetimeInputValue(new Date());
        if (autoBadge) autoBadge.classList.remove('hidden');
      } else {
        dateInput.readOnly = false;
        dateInput.classList.remove('cursor-not-allowed', 'bg-slate-100/90', 'dark:bg-slate-800/70');
        dateInput.classList.add('bg-white', 'dark:bg-slate-900/90');
        if (autoBadge) autoBadge.classList.add('hidden');
      }
    });
  }
}

// ============================================================================
// FORM HANDLING (PEMASUKAN / PENGELUARAN)
// ============================================================================

function setTransactionType(type) {
  state.currentType = type;
  const btnIncome = document.getElementById('btnTypeIncome');
  const btnExpense = document.getElementById('btnTypeExpense');
  const submitBtn = document.getElementById('btnSubmitTransaction');
  const submitText = document.getElementById('submitBtnText');

  if (type === 'income') {
    btnIncome.classList.add('active');
    btnExpense.classList.remove('active');
    submitBtn.className = 'btn-income-solid w-full py-3 px-5 font-semibold text-sm flex items-center justify-center gap-2';
    submitText.textContent = state.editingId ? 'Perbarui Data Pemasukan' : 'Simpan Pemasukan (+)';
  } else {
    btnExpense.classList.add('active');
    btnIncome.classList.remove('active');
    submitBtn.className = 'btn-expense-solid w-full py-3 px-5 font-semibold text-sm flex items-center justify-center gap-2';
    submitText.textContent = state.editingId ? 'Perbarui Data Pengeluaran' : 'Simpan Pengeluaran (-)';
  }

  populateCategorySelect(type);
}

function getCategoriesForType(type) {
  let custom = { income: [], expense: [] };
  try {
    const saved = localStorage.getItem(CUSTOM_CAT_KEY);
    if (saved) custom = JSON.parse(saved);
  } catch (e) {}
  const base = CATEGORIES[type] || CATEGORIES.income;
  const extra = Array.isArray(custom[type]) ? custom[type] : [];
  return Array.from(new Set([...extra, ...base]));
}

function addCustomCategory() {
  const typeLabel = state.currentType === 'income' ? 'Pemasukan' : 'Pengeluaran';
  const newCat = prompt(`Masukkan nama kategori ${typeLabel} baru:`);
  if (!newCat || !newCat.trim()) return;
  const cleaned = newCat.trim();

  let custom = { income: [], expense: [] };
  try {
    const saved = localStorage.getItem(CUSTOM_CAT_KEY);
    if (saved) custom = JSON.parse(saved);
  } catch (e) {}

  if (!Array.isArray(custom[state.currentType])) custom[state.currentType] = [];
  if (!custom[state.currentType].includes(cleaned)) {
    custom[state.currentType].unshift(cleaned);
    localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(custom));
  }
  populateCategorySelect(state.currentType, cleaned);
  showToast(`Kategori "${cleaned}" ditambahkan!`, 'success');
}

function populateCategorySelect(type, selectedValue = null) {
  const select = document.getElementById('transactionCategory');
  if (!select) return;
  const list = getCategoriesForType(type);
  select.innerHTML = list
    .map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`)
    .join('');
  if (selectedValue && list.includes(selectedValue)) {
    select.value = selectedValue;
  }
}

function renderQuickInputterChips() {
  const container = document.getElementById('quickInputtersContainer');
  const filterSelect = document.getElementById('filterInputter');
  if (!container) return;

  // Kumpulkan daftar nama unik dari transaksi + default populer
  const uniqueNames = Array.from(
    new Set([
      ...state.transactions.map((t) => t.inputter.trim()).filter(Boolean),
      'Bendahara',
      'Admin Keuangan'
    ])
  ).slice(0, 7);

  container.innerHTML = uniqueNames
    .map(
      (name) => `
      <button
        type="button"
        data-quick-name="${escapeHtml(name)}"
        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 transition"
      >
        ${escapeHtml(name)}
      </button>
    `
    )
    .join('');

  container.querySelectorAll('[data-quick-name]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('inputterName');
      if (input) {
        input.value = btn.getAttribute('data-quick-name');
        input.focus();
      }
    });
  });

  // Update dropdown filter penginput
  if (filterSelect) {
    const currentVal = state.filters.inputter;
    const allInputters = Array.from(
      new Set(state.transactions.map((t) => t.inputter.trim()).filter(Boolean))
    ).sort();

    filterSelect.innerHTML =
      `<option value="ALL">Semua Penginput (${allInputters.length} Orang)</option>` +
      allInputters
        .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)
        .join('');

    if (allInputters.includes(currentVal)) {
      filterSelect.value = currentVal;
    } else {
      filterSelect.value = 'ALL';
      state.filters.inputter = 'ALL';
    }
  }
}

function resetFormToDefault() {
  state.editingId = null;
  document.getElementById('editTransactionId').value = '';
  document.getElementById('formTitle').textContent = 'Input Transaksi Baru';
  document.getElementById('btnCancelEdit').classList.add('hidden');

  const autoToggle = document.getElementById('autoDateToggle');
  const dateInput = document.getElementById('transactionDate');
  const autoBadge = document.getElementById('autoBadge');
  if (autoToggle && dateInput) {
    autoToggle.checked = true;
    dateInput.readOnly = true;
    dateInput.classList.add('cursor-not-allowed', 'bg-slate-100/90', 'dark:bg-slate-800/70');
    dateInput.value = getLocalDatetimeInputValue(new Date());
    if (autoBadge) autoBadge.classList.remove('hidden');
  }

  document.getElementById('amountDisplay').value = '';
  document.getElementById('transactionNote').value = '';
  setTransactionType(state.currentType);
}

function startEditTransaction(id) {
  const trx = state.transactions.find((t) => t.id === id);
  if (!trx) return;

  state.editingId = trx.id;
  document.getElementById('editTransactionId').value = trx.id;
  document.getElementById('formTitle').textContent = 'Edit Data Transaksi';
  document.getElementById('btnCancelEdit').classList.remove('hidden');

  setTransactionType(trx.type);
  document.getElementById('inputterName').value = trx.inputter;
  document.getElementById('amountDisplay').value = formatNumberDots(trx.amount);
  populateCategorySelect(trx.type, trx.category);
  document.getElementById('paymentMethod').value = trx.method || 'Transfer Bank';
  document.getElementById('transactionNote').value = trx.note;

  const autoToggle = document.getElementById('autoDateToggle');
  const dateInput = document.getElementById('transactionDate');
  const autoBadge = document.getElementById('autoBadge');
  if (autoToggle && dateInput) {
    autoToggle.checked = false;
    dateInput.readOnly = false;
    dateInput.classList.remove('cursor-not-allowed', 'bg-slate-100/90', 'dark:bg-slate-800/70');
    dateInput.value = trx.date.slice(0, 16);
    if (autoBadge) autoBadge.classList.add('hidden');
  }

  // Scroll ke form pada layar mobile
  document.getElementById('transactionForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteTransaction(id) {
  const trx = state.transactions.find((t) => t.id === id);
  if (!trx) return;

  if (!confirm(`Hapus transaksi "${trx.note}" (${formatRupiah(trx.amount)}) yang diinput oleh ${trx.inputter}?`)) {
    return;
  }

  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveTransactionsToLocal();
  syncSingleToCloud(trx, 'DELETE');

  if (state.editingId === id) {
    resetFormToDefault();
  }

  renderAll();
  showToast('Transaksi berhasil dihapus', 'danger');
}

// ============================================================================
// FILTERING & SORTING
// ============================================================================

function getFilteredTransactions() {
  const now = new Date();
  const todayStr = getLocalDatetimeInputValue(now).slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  return state.transactions
    .filter((t) => {
      // 1. Search filter
      if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        const match =
          (t.inputter && t.inputter.toLowerCase().includes(q)) ||
          (t.note && t.note.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.method && t.method.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 2. Inputter filter
      if (state.filters.inputter !== 'ALL') {
        if (t.inputter.trim() !== state.filters.inputter) return false;
      }

      // 3. Period filter
      const trxDateStr = (t.date || '').slice(0, 10);
      const trxMonthStr = (t.date || '').slice(0, 7);
      if (state.filters.period === 'TODAY') {
        if (trxDateStr !== todayStr) return false;
      } else if (state.filters.period === 'THIS_WEEK') {
        const d = new Date(t.date);
        if (d < sevenDaysAgo) return false;
      } else if (state.filters.period === 'THIS_MONTH') {
        if (trxMonthStr !== thisMonthStr) return false;
      } else if (state.filters.period === 'CUSTOM_MONTH' && state.filters.customMonth) {
        if (trxMonthStr !== state.filters.customMonth) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (state.filters.sort === 'NEWEST') {
        return new Date(b.date) - new Date(a.date);
      }
      if (state.filters.sort === 'OLDEST') {
        return new Date(a.date) - new Date(b.date);
      }
      if (state.filters.sort === 'HIGHEST') {
        return b.amount - a.amount;
      }
      if (state.filters.sort === 'LOWEST') {
        return a.amount - b.amount;
      }
      return 0;
    });
}

// ============================================================================
// RENDERING KPI, TABLES, RECAP & CHARTS
// ============================================================================

function renderAll() {
  renderQuickInputterChips();
  const filtered = getFilteredTransactions();
  renderKPICards(filtered);
  renderTables(filtered);
  renderRecapSection(filtered);
  renderCharts(filtered);
  if (window.lucide) window.lucide.createIcons();
}

function renderKPICards(transactions) {
  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;
  const totalFlow = totalIncome + totalExpense;

  const incomeShare = totalFlow > 0 ? Math.round((totalIncome / totalFlow) * 100) : 50;
  const expenseShare = totalFlow > 0 ? 100 - incomeShare : 50;
  const expenseVsIncomeRatio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  // Update KPI Cards
  document.getElementById('kpiTotalIncome').textContent = formatRupiah(totalIncome);
  document.getElementById('kpiIncomeCount').textContent = incomes.length;
  document.getElementById('kpiIncomeShare').textContent = `${incomeShare}% arus kas`;

  document.getElementById('kpiTotalExpense').textContent = formatRupiah(totalExpense);
  document.getElementById('kpiExpenseCount').textContent = expenses.length;
  document.getElementById('kpiExpenseRatio').textContent = `${expenseVsIncomeRatio}% dari pemasukan`;

  const netEl = document.getElementById('kpiNetBalance');
  netEl.textContent = formatRupiah(netBalance);
  netEl.className = `font-mono-num text-2xl sm:text-3xl font-extrabold mt-2 ${
    netBalance > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : netBalance < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-white'
  }`;

  const badgeEl = document.getElementById('kpiBalanceBadge');
  if (netBalance > 0) {
    badgeEl.textContent = 'Surplus (+ Sehat)';
    badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
  } else if (netBalance < 0) {
    badgeEl.textContent = 'Defisit (- Minus)';
    badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold';
  } else {
    badgeEl.textContent = 'Seimbang (Rp 0)';
    badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold';
  }

  // Unique inputters & Top inputter
  const inputterCounts = {};
  transactions.forEach((t) => {
    const name = t.inputter.trim();
    inputterCounts[name] = (inputterCounts[name] || 0) + 1;
  });
  const uniqueNames = Object.keys(inputterCounts);
  let topPerson = 'Belum ada';
  let maxCount = 0;
  uniqueNames.forEach((name) => {
    if (inputterCounts[name] > maxCount) {
      maxCount = inputterCounts[name];
      topPerson = `${name} (${maxCount}x)`;
    }
  });

  document.getElementById('kpiTotalTransactions').textContent = `${transactions.length} Data`;
  document.getElementById('kpiUniqueInputters').textContent = uniqueNames.length;
  document.getElementById('kpiTopInputter').textContent = topPerson;

  // Update Ratio Progress Bar
  document.getElementById('barIncomePct').textContent = `${incomeShare}% (${formatRupiah(totalIncome)})`;
  document.getElementById('barExpensePct').textContent = `${expenseShare}% (${formatRupiah(totalExpense)})`;
  document.getElementById('barIncomeFill').style.width = `${incomeShare}%`;
  document.getElementById('barExpenseFill').style.width = `${expenseShare}%`;
}

function renderTables(transactions) {
  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Subtitles & Subtotals
  document.getElementById('incomeTableSubtitle').textContent = `${incomes.length} transaksi pemasukan`;
  document.getElementById('incomeTableSubtotal').textContent = formatRupiah(totalIncome);

  document.getElementById('expenseTableSubtitle').textContent = `${expenses.length} transaksi pengeluaran`;
  document.getElementById('expenseTableSubtotal').textContent = formatRupiah(totalExpense);

  document.getElementById('combinedCountBadge').textContent = `${transactions.length} Transaksi`;

  // Render Income Table
  const incomeBody = document.getElementById('incomeTableBody');
  if (incomes.length === 0) {
    incomeBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-10 text-center text-slate-400 dark:text-slate-500">
          Belum ada data pemasukan pada filter ini.
        </td>
      </tr>
    `;
  } else {
    incomeBody.innerHTML = incomes
      .map((t) => {
        const avatarClass = getAvatarColorClass(t.inputter);
        return `
        <tr class="tr-hover">
          <td class="py-3 px-3.5 align-top">
            <div class="flex items-start gap-2.5">
              <div class="w-7 h-7 rounded-lg border ${avatarClass} flex items-center justify-center font-extrabold text-[10px] shrink-0 mt-0.5">
                ${escapeHtml(getInitials(t.inputter))}
              </div>
              <div>
                <div class="font-bold text-slate-900 dark:text-white">${escapeHtml(t.inputter)}</div>
                <div class="text-[11px] font-mono-num text-slate-400 dark:text-slate-500">${formatDateID(t.date)}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 align-top">
            <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(t.note)}</div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                ${escapeHtml(t.category)}
              </span>
              <span class="text-[10px] text-slate-400">• ${escapeHtml(t.method || 'Transfer')}</span>
            </div>
          </td>
          <td class="py-3 px-3.5 align-top text-right font-mono-num font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            +${formatRupiah(t.amount)}
          </td>
          <td class="py-3 px-2.5 align-top text-center whitespace-nowrap no-print">
            <div class="inline-flex items-center gap-1">
              <button type="button" onclick="startEditTransaction('${t.id}')" class="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition" title="Edit">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="deleteTransaction('${t.id}')" class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 transition" title="Hapus">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  // Render Expense Table
  const expenseBody = document.getElementById('expenseTableBody');
  if (expenses.length === 0) {
    expenseBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-10 text-center text-slate-400 dark:text-slate-500">
          Belum ada data pengeluaran pada filter ini.
        </td>
      </tr>
    `;
  } else {
    expenseBody.innerHTML = expenses
      .map((t) => {
        const avatarClass = getAvatarColorClass(t.inputter);
        return `
        <tr class="tr-hover">
          <td class="py-3 px-3.5 align-top">
            <div class="flex items-start gap-2.5">
              <div class="w-7 h-7 rounded-lg border ${avatarClass} flex items-center justify-center font-extrabold text-[10px] shrink-0 mt-0.5">
                ${escapeHtml(getInitials(t.inputter))}
              </div>
              <div>
                <div class="font-bold text-slate-900 dark:text-white">${escapeHtml(t.inputter)}</div>
                <div class="text-[11px] font-mono-num text-slate-400 dark:text-slate-500">${formatDateID(t.date)}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 align-top">
            <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(t.note)}</div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                ${escapeHtml(t.category)}
              </span>
              <span class="text-[10px] text-slate-400">• ${escapeHtml(t.method || 'Transfer')}</span>
            </div>
          </td>
          <td class="py-3 px-3.5 align-top text-right font-mono-num font-extrabold text-rose-600 dark:text-rose-400 whitespace-nowrap">
            -${formatRupiah(t.amount)}
          </td>
          <td class="py-3 px-2.5 align-top text-center whitespace-nowrap no-print">
            <div class="inline-flex items-center gap-1">
              <button type="button" onclick="startEditTransaction('${t.id}')" class="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition" title="Edit">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="deleteTransaction('${t.id}')" class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 transition" title="Hapus">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  // Render Combined Table
  const combinedBody = document.getElementById('combinedTableBody');
  if (transactions.length === 0) {
    combinedBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada transaksi yang sesuai filter.
        </td>
      </tr>
    `;
  } else {
    combinedBody.innerHTML = transactions
      .map((t) => {
        const isInc = t.type === 'income';
        const avatarClass = getAvatarColorClass(t.inputter);
        return `
        <tr class="tr-hover">
          <td class="py-3 px-4 font-mono-num text-slate-600 dark:text-slate-300 whitespace-nowrap">
            ${formatDateID(t.date)}
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md border ${avatarClass} flex items-center justify-center font-extrabold text-[10px] shrink-0">
                ${escapeHtml(getInitials(t.inputter))}
              </div>
              <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(t.inputter)}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isInc
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }">
              ${isInc ? 'Pemasukan' : 'Pengeluaran'} • ${escapeHtml(t.category)}
            </span>
          </td>
          <td class="py-3 px-4">
            <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(t.note)}</div>
            <div class="text-[10px] text-slate-400">${escapeHtml(t.method || 'Transfer Bank')}</div>
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-extrabold whitespace-nowrap ${
            isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }">
            ${isInc ? '+' : '-'}${formatRupiah(t.amount)}
          </td>
          <td class="py-3 px-3 text-center whitespace-nowrap no-print">
            <div class="inline-flex items-center gap-1">
              <button type="button" onclick="startEditTransaction('${t.id}')" class="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="deleteTransaction('${t.id}')" class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 transition">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }
}

function renderRecapSection(transactions) {
  // 1. Rekap Berdasarkan Siapa yang Menginput
  const byInputter = {};
  let grandIncome = 0;
  let grandExpense = 0;

  transactions.forEach((t) => {
    const name = t.inputter.trim() || 'Tanpa Nama';
    if (!byInputter[name]) {
      byInputter[name] = {
        name,
        count: 0,
        income: 0,
        expense: 0,
        lastDate: t.date
      };
    }
    byInputter[name].count += 1;
    if (t.type === 'income') {
      byInputter[name].income += Number(t.amount || 0);
      grandIncome += Number(t.amount || 0);
    } else {
      byInputter[name].expense += Number(t.amount || 0);
      grandExpense += Number(t.amount || 0);
    }
    if (new Date(t.date) > new Date(byInputter[name].lastDate)) {
      byInputter[name].lastDate = t.date;
    }
  });

  const inputterRows = Object.values(byInputter).sort(
    (a, b) => b.income + b.expense - (a.income + a.expense)
  );

  const recapBody = document.getElementById('recapInputterBody');
  const recapFoot = document.getElementById('recapInputterFoot');

  if (inputterRows.length === 0) {
    recapBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">Belum ada data rekap penginput.</td>
      </tr>
    `;
    recapFoot.innerHTML = '';
  } else {
    recapBody.innerHTML = inputterRows
      .map((row) => {
        const net = row.income - row.expense;
        const avatarClass = getAvatarColorClass(row.name);
        return `
        <tr class="tr-hover">
          <td class="py-3 px-4">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg border ${avatarClass} flex items-center justify-center font-extrabold text-[10px] shrink-0">
                ${escapeHtml(getInitials(row.name))}
              </div>
              <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(row.name)}</span>
            </div>
          </td>
          <td class="py-3 px-3 text-center">
            <span class="px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 font-mono-num font-bold text-slate-700 dark:text-slate-200">
              ${row.count}x
            </span>
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
            ${formatRupiah(row.income)}
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-bold text-rose-600 dark:text-rose-400">
            ${formatRupiah(row.expense)}
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-extrabold ${
            net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
          }">
            ${formatRupiah(net)}
          </td>
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono-num text-[11px]">
            ${formatDateID(row.lastDate)}
          </td>
        </tr>
      `;
      })
      .join('');

    const grandNet = grandIncome - grandExpense;
    recapFoot.innerHTML = `
      <tr>
        <td class="py-3.5 px-4 uppercase tracking-wider text-slate-700 dark:text-slate-200">TOTAL KESELURUHAN (${inputterRows.length} Penginput)</td>
        <td class="py-3.5 px-3 text-center font-mono-num">${transactions.length}x</td>
        <td class="py-3.5 px-4 text-right font-mono-num text-emerald-600 dark:text-emerald-400">${formatRupiah(grandIncome)}</td>
        <td class="py-3.5 px-4 text-right font-mono-num text-rose-600 dark:text-rose-400">${formatRupiah(grandExpense)}</td>
        <td class="py-3.5 px-4 text-right font-mono-num ${
          grandNet >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
        }">${formatRupiah(grandNet)}</td>
        <td class="py-3.5 px-4 text-slate-400 font-normal">Neraca Akhir</td>
      </tr>
    `;
  }

  // 2. Rekap Per Kategori Transaksi
  const catMap = {};
  transactions.forEach((t) => {
    const key = `${t.type}__${t.category}`;
    if (!catMap[key]) {
      catMap[key] = {
        type: t.type,
        category: t.category,
        total: 0,
        count: 0
      };
    }
    catMap[key].total += Number(t.amount || 0);
    catMap[key].count += 1;
  });

  const catList = Object.values(catMap).sort((a, b) => b.total - a.total);
  const catContainer = document.getElementById('recapCategoryList');

  if (catList.length === 0) {
    catContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada data kategori.</p>`;
  } else {
    catContainer.innerHTML = catList
      .map((item) => {
        const isInc = item.type === 'income';
        const baseTotal = isInc ? grandIncome : grandExpense;
        const pct = baseTotal > 0 ? Math.round((item.total / baseTotal) * 100) : 0;
        return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${isInc ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
              <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHtml(item.category)}</span>
              <span class="text-[10px] text-slate-400">(${item.count}x)</span>
            </div>
            <div class="font-mono-num font-bold ${
              isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }">
              ${formatRupiah(item.total)} <span class="text-[10px] text-slate-400">(${pct}%)</span>
            </div>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full ${
              isInc ? 'bg-emerald-500' : 'bg-rose-500'
            }" style="width: ${Math.max(pct, 3)}%"></div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // 3. Rekap Bulanan & Metode Pembayaran
  const monthMap = {};
  const methodMap = {};

  transactions.forEach((t) => {
    const mKey = (t.date || '').slice(0, 7) || 'Lainnya';
    if (!monthMap[mKey]) {
      monthMap[mKey] = { month: mKey, income: 0, expense: 0 };
    }
    if (t.type === 'income') monthMap[mKey].income += Number(t.amount || 0);
    else monthMap[mKey].expense += Number(t.amount || 0);

    const method = t.method || 'Transfer Bank';
    if (!methodMap[method]) {
      methodMap[method] = { method, total: 0, count: 0 };
    }
    methodMap[method].total += Number(t.amount || 0);
    methodMap[method].count += 1;
  });

  const monthRows = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month));
  const methodRows = Object.values(methodMap).sort((a, b) => b.total - a.total);
  const monthlyContainer = document.getElementById('recapMonthlyAndMethodList');

  if (monthRows.length === 0) {
    monthlyContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada data rekap bulanan.</p>`;
  } else {
    const monthHtml = monthRows
      .map((m) => {
        const net = m.income - m.expense;
        return `
        <div class="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs">
          <div>
            <div class="font-extrabold text-slate-800 dark:text-slate-100">${escapeHtml(formatMonthYearID(m.month))}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num mt-0.5">
              Masuk: <span class="text-emerald-600 dark:text-emerald-400 font-semibold">${formatRupiah(m.income)}</span> •
              Keluar: <span class="text-rose-600 dark:text-rose-400 font-semibold">${formatRupiah(m.expense)}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] uppercase text-slate-400 block">Saldo Bulan</span>
            <span class="font-mono-num font-extrabold ${
              net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }">${formatRupiah(net)}</span>
          </div>
        </div>
      `;
      })
      .join('');

    const methodHtml = methodRows
      .map(
        (m) => `
        <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
          <span class="font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(m.method)} <span class="text-[10px] text-slate-400">(${m.count}x)</span></span>
          <span class="font-mono-num font-bold text-slate-900 dark:text-white">${formatRupiah(m.total)}</span>
        </div>
      `
      )
      .join('');

    monthlyContainer.innerHTML = `
      <div class="space-y-2">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rekap Per Periode Bulan</div>
        ${monthHtml}
      </div>
      <div class="pt-2 space-y-1.5">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Volume per Metode Kas</div>
        ${methodHtml}
      </div>
    `;
  }

  // 4. Update Target Anggaran Pengeluaran (Budget Tracker)
  const budgetLimit = Number(localStorage.getItem(BUDGET_LIMIT_KEY)) || 15000000;
  const usedEl = document.getElementById('budgetUsedLabel');
  const limitEl = document.getElementById('budgetLimitLabel');
  const barEl = document.getElementById('budgetProgressBar');
  const statusEl = document.getElementById('budgetStatusText');

  if (usedEl && limitEl && barEl) {
    usedEl.textContent = formatRupiah(grandExpense);
    limitEl.textContent = formatRupiah(budgetLimit);
    const pct = budgetLimit > 0 ? Math.min(100, Math.round((grandExpense / budgetLimit) * 100)) : 0;
    barEl.style.width = `${pct}%`;

    if (grandExpense > budgetLimit) {
      barEl.className = 'h-full rounded-full bg-gradient-to-r from-rose-600 to-red-500 transition-all duration-500';
      if (statusEl) {
        statusEl.textContent = `Peringatan: Pengeluaran melebihi batas anggaran sebesar ${formatRupiah(grandExpense - budgetLimit)} (${pct}%)`;
        statusEl.className = 'text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5';
      }
    } else {
      barEl.className = 'h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500';
      if (statusEl) {
        statusEl.textContent = `Aman: Sisa ruang anggaran pengeluaran sebesar ${formatRupiah(budgetLimit - grandExpense)} (Terpakai ${pct}%)`;
        statusEl.className = 'text-xs text-slate-500 dark:text-slate-400 mt-0.5';
      }
    }
  }
}

// ============================================================================
// CHARTS (CHART.JS)
// ============================================================================

function renderCharts(transactions) {
  if (typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.2)';

  // -------------------------------------------------------------------------
  // 1. Grafik Tren Arus Kas per Tanggal
  // -------------------------------------------------------------------------
  const dateGroups = {};
  transactions.forEach((t) => {
    const dayKey = (t.date || '').slice(0, 10);
    if (!dayKey) return;
    if (!dateGroups[dayKey]) {
      dateGroups[dayKey] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') dateGroups[dayKey].income += Number(t.amount || 0);
    else dateGroups[dayKey].expense += Number(t.amount || 0);
  });

  const sortedDays = Object.keys(dateGroups).sort();
  const labelsTrend = sortedDays.map((d) => formatDateID(d, false));
  const incomeSeries = sortedDays.map((d) => dateGroups[d].income);
  const expenseSeries = sortedDays.map((d) => dateGroups[d].expense);

  let runningBalance = 0;
  const cumulativeSeries = sortedDays.map((d) => {
    runningBalance += dateGroups[d].income - dateGroups[d].expense;
    return runningBalance;
  });

  const ctxTrend = document.getElementById('cashflowTrendChart');
  if (ctxTrend) {
    if (cashflowChartInstance) cashflowChartInstance.destroy();
    cashflowChartInstance = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: labelsTrend.length ? labelsTrend : ['Belum ada data'],
        datasets: [
          {
            type: 'line',
            label: 'Saldo Kas Berjalan',
            data: cumulativeSeries.length ? cumulativeSeries : [0],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#6366f1',
            tension: 0.35,
            fill: false,
            order: 0
          },
          {
            type: 'bar',
            label: 'Pemasukan (+)',
            data: incomeSeries.length ? incomeSeries : [0],
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 8,
            maxBarThickness: 38,
            order: 1
          },
          {
            type: 'bar',
            label: 'Pengeluaran (-)',
            data: expenseSeries.length ? expenseSeries : [0],
            backgroundColor: 'rgba(244, 63, 94, 0.85)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            borderRadius: 8,
            maxBarThickness: 38,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: { color: textColor, font: { weight: '600', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 11 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (val) => {
                if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
                if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`;
                return `Rp ${val}`;
              }
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 2. Doughnut Chart Kategori (Pengeluaran / Pemasukan)
  // -------------------------------------------------------------------------
  const catTypeSelect = document.getElementById('chartCategoryTypeSelect');
  const selectedCatType = catTypeSelect ? catTypeSelect.value : 'expense';

  const catTotals = {};
  transactions
    .filter((t) => t.type === selectedCatType)
    .forEach((t) => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount || 0);
    });

  const catLabels = Object.keys(catTotals);
  const catValues = Object.values(catTotals);

  const palette = [
    '#6366f1',
    '#10b981',
    '#f43f5e',
    '#f59e0b',
    '#8b5cf6',
    '#06b6d4',
    '#ec4899',
    '#14b8a6'
  ];

  const ctxCat = document.getElementById('categoryDoughnutChart');
  if (ctxCat) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: catLabels.length ? catLabels : ['Belum ada transaksi'],
        datasets: [
          {
            data: catValues.length ? catValues : [1],
            backgroundColor: catValues.length ? palette : ['rgba(148,163,184,0.25)'],
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              boxWidth: 12,
              padding: 10,
              font: { size: 11, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (!catValues.length) return 'Belum ada data';
                return `${ctx.label}: ${formatRupiah(ctx.parsed)}`;
              }
            }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 3. Grafik Bar Perbandingan per Penginput
  // -------------------------------------------------------------------------
  const inputterMap = {};
  transactions.forEach((t) => {
    const name = t.inputter.trim() || 'Anonim';
    if (!inputterMap[name]) inputterMap[name] = { income: 0, expense: 0 };
    if (t.type === 'income') inputterMap[name].income += Number(t.amount || 0);
    else inputterMap[name].expense += Number(t.amount || 0);
  });

  const inputterNames = Object.keys(inputterMap);
  const inputterIncome = inputterNames.map((n) => inputterMap[n].income);
  const inputterExpense = inputterNames.map((n) => inputterMap[n].expense);

  const ctxInputter = document.getElementById('inputterBarChart');
  if (ctxInputter) {
    if (inputterChartInstance) inputterChartInstance.destroy();
    inputterChartInstance = new Chart(ctxInputter, {
      type: 'bar',
      data: {
        labels: inputterNames.length ? inputterNames : ['Belum ada penginput'],
        datasets: [
          {
            label: 'Total Pemasukan',
            data: inputterIncome.length ? inputterIncome : [0],
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6
          },
          {
            label: 'Total Pengeluaran',
            data: inputterExpense.length ? inputterExpense : [0],
            backgroundColor: 'rgba(244, 63, 94, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, boxWidth: 12, font: { size: 11, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.parsed.x)}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(0)}Jt`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                return val;
              }
            },
            grid: { color: gridColor }
          },
          y: {
            ticks: { color: textColor, font: { size: 11, weight: '600' } },
            grid: { display: false }
          }
        }
      }
    });
  }
}

// ============================================================================
// EXPORT CSV (EXCEL), BACKUP JSON, RESTORE & PRINT PDF
// ============================================================================

function exportToCSV() {
  const transactions = getFilteredTransactions();
  if (transactions.length === 0) {
    showToast('Tidak ada data transaksi untuk diekspor', 'danger');
    return;
  }

  const headers = [
    'ID Transaksi',
    'Tanggal & Waktu Input',
    'Siapa yang Menginput',
    'Jenis Transaksi',
    'Kategori',
    'Metode Kas',
    'Uraian / Keterangan',
    'Nominal Masuk (Rp)',
    'Nominal Keluar (Rp)'
  ];

  const rows = transactions.map((t) => [
    t.id,
    formatDateID(t.date),
    t.inputter,
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.category,
    t.method || 'Transfer Bank',
    t.note,
    t.type === 'income' ? t.amount : 0,
    t.type === 'expense' ? t.amount : 0
  ]);

  const totalInc = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExp = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  rows.push([]);
  rows.push(['', '', 'REKAP KESELURUHAN', '', '', '', 'TOTAL PEMASUKAN', totalInc, '']);
  rows.push(['', '', 'REKAP KESELURUHAN', '', '', '', 'TOTAL PENGELUARAN', '', totalExp]);
  rows.push(['', '', 'REKAP KESELURUHAN', '', '', '', 'SALDO BERSIH (KAS AKHIR)', totalInc - totalExp, '']);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Laporan-Keuangan-FinTrack-${dateStamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Laporan Excel (CSV) berhasil diunduh!', 'success');
}

function backupToJSON() {
  const dataStr = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      appName: 'FinTrack Pro',
      totalRecords: state.transactions.length,
      transactions: state.transactions
    },
    null,
    2
  );
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup-Keuangan-FinTrack-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File Backup JSON berhasil disimpan!', 'info');
}

function restoreFromJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const list = Array.isArray(parsed) ? parsed : parsed.transactions;
      if (!Array.isArray(list)) throw new Error('Format JSON tidak valid');
      state.transactions = list;
      saveTransactionsToLocal();
      renderAll();
      showToast(`Berhasil memulihkan ${list.length} transaksi!`, 'success');
    } catch (err) {
      showToast('Gagal membaca file JSON backup', 'danger');
    }
  };
  reader.readAsText(file);
}

function printFinancialReport() {
  const printTs = document.getElementById('printTimestamp');
  if (printTs) {
    printTs.textContent = `Tanggal Cetak: ${formatDateID(new Date().toISOString())}`;
  }
  const signerEl = document.getElementById('printSignerName');
  const lastInputter = localStorage.getItem(LAST_INPUTTER_KEY);
  if (signerEl && lastInputter) {
    signerEl.textContent = `( ${lastInputter} )`;
  }
  window.print();
}

function shareRecapToWhatsApp() {
  const transactions = getFilteredTransactions();
  if (transactions.length === 0) {
    showToast('Belum ada data untuk dibagikan ke WhatsApp', 'danger');
    return;
  }

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const byInputter = {};
  transactions.forEach((t) => {
    const name = t.inputter.trim() || 'Anonim';
    if (!byInputter[name]) byInputter[name] = { count: 0, inc: 0, exp: 0 };
    byInputter[name].count += 1;
    if (t.type === 'income') byInputter[name].inc += Number(t.amount || 0);
    else byInputter[name].exp += Number(t.amount || 0);
  });

  const inputterLines = Object.entries(byInputter)
    .map(
      ([name, d]) =>
        `• *${name}* (${d.count}x): Masuk ${formatRupiah(d.inc)} | Keluar ${formatRupiah(d.exp)}`
    )
    .join('\n');

  const reportText = [
    `*📊 LAPORAN REKAPITULASI KEUANGAN (FinTrack Pro)*`,
    `Tanggal Rekap: ${formatDateID(new Date().toISOString())}`,
    `----------------------------------------`,
    `✅ *Total Pemasukan:* ${formatRupiah(totalIncome)}`,
    `🔻 *Total Pengeluaran:* ${formatRupiah(totalExpense)}`,
    `💰 *SALDO BERSIH:* *${formatRupiah(netBalance)}*`,
    `----------------------------------------`,
    `*👥 Rekap per Penginput:*`,
    inputterLines,
    `----------------------------------------`,
    `Total Transaksi Tercatat: ${transactions.length} data`
  ].join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(reportText).catch(() => {});
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  showToast('Ringkasan laporan disalin & membuka WhatsApp!', 'success');
}

function setBudgetLimitPrompt() {
  const currentLimit = Number(localStorage.getItem(BUDGET_LIMIT_KEY)) || 15000000;
  const input = prompt(
    'Masukkan target batas anggaran pengeluaran bulanan (Rp):',
    formatNumberDots(currentLimit)
  );
  if (input === null) return;
  const parsed = parseRawAmount(input);
  if (parsed <= 0) {
    showToast('Nominal batas anggaran harus lebih dari Rp 0', 'danger');
    return;
  }
  localStorage.setItem(BUDGET_LIMIT_KEY, String(parsed));
  renderAll();
  showToast(`Target anggaran diatur ke ${formatRupiah(parsed)}`, 'success');
}

// ============================================================================
// INITIALIZATION & EVENT LISTENERS
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    renderCharts(getFilteredTransactions());
  });
}

function initEventListeners() {
  // Toggle Pemasukan vs Pengeluaran
  document.getElementById('btnTypeIncome')?.addEventListener('click', () => setTransactionType('income'));
  document.getElementById('btnTypeExpense')?.addEventListener('click', () => setTransactionType('expense'));

  // Format angka otomatis pada input nominal
  const amountInput = document.getElementById('amountDisplay');
  amountInput?.addEventListener('input', (e) => {
    const raw = parseRawAmount(e.target.value);
    e.target.value = raw > 0 ? formatNumberDots(raw) : '';
  });

  // Tombol tambah nominal cepat (+25rb, +50rb, +100rb, +1Jt)
  document.querySelectorAll('[data-add-amount]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const addVal = parseInt(btn.getAttribute('data-add-amount'), 10) || 0;
      const currentRaw = parseRawAmount(amountInput.value);
      amountInput.value = formatNumberDots(currentRaw + addVal);
      amountInput.focus();
    });
  });

  document.getElementById('btnResetAmount')?.addEventListener('click', () => {
    amountInput.value = '';
    amountInput.focus();
  });

  // Batal Edit
  document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
    resetFormToDefault();
  });

  // Submit Form Transaksi
  document.getElementById('transactionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputter = document.getElementById('inputterName').value.trim();
    const rawAmount = parseRawAmount(document.getElementById('amountDisplay').value);
    const category = document.getElementById('transactionCategory').value;
    const method = document.getElementById('paymentMethod').value;
    const note = document.getElementById('transactionNote').value.trim();
    const autoToggle = document.getElementById('autoDateToggle');
    const dateInput = document.getElementById('transactionDate');

    if (!inputter) {
      showToast('Mohon isi nama siapa yang menginput!', 'danger');
      return;
    }
    if (rawAmount <= 0) {
      showToast('Jumlah nominal harus lebih dari Rp 0!', 'danger');
      return;
    }

    const finalDate =
      autoToggle.checked && !state.editingId
        ? getLocalDatetimeInputValue(new Date())
        : dateInput.value || getLocalDatetimeInputValue(new Date());

    // Simpan nama penginput terakhir agar praktis
    localStorage.setItem(LAST_INPUTTER_KEY, inputter);

    if (state.editingId) {
      const idx = state.transactions.findIndex((t) => t.id === state.editingId);
      if (idx !== -1) {
        const updated = {
          ...state.transactions[idx],
          inputter,
          type: state.currentType,
          amount: rawAmount,
          category,
          method,
          note,
          date: finalDate
        };
        state.transactions[idx] = updated;
        saveTransactionsToLocal();
        syncSingleToCloud(updated, 'UPSERT');
        showToast('Data transaksi berhasil diperbarui!', 'info');
      }
      resetFormToDefault();
    } else {
      const newTrx = {
        id: 'TRX-' + Date.now().toString(36).toUpperCase(),
        inputter,
        type: state.currentType,
        amount: rawAmount,
        category,
        method,
        note,
        date: finalDate
      };
      state.transactions.unshift(newTrx);
      saveTransactionsToLocal();
      syncSingleToCloud(newTrx, 'UPSERT');
      showToast(
        `${state.currentType === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatRupiah(rawAmount)} oleh ${inputter} berhasil dicatat!`,
        'success'
      );
      resetFormToDefault();
    }

    renderAll();
  });

  // View Mode Tabs (Semua Tampilan / Tabel / Grafis / Rekap)
  document.querySelectorAll('[data-view-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const target = tabBtn.getAttribute('data-view-tab');
      state.activeViewTab = target;

      document.querySelectorAll('[data-view-tab]').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');

      const secCharts = document.getElementById('sectionCharts');
      const secTables = document.getElementById('sectionTables');
      const secRecap = document.getElementById('sectionRecap');

      secCharts.classList.toggle('hidden', target !== 'all' && target !== 'charts');
      secTables.classList.toggle('hidden', target !== 'all' && target !== 'tables');
      secRecap.classList.toggle('hidden', target !== 'all' && target !== 'recap');

      if (target === 'all' || target === 'charts') {
        renderCharts(getFilteredTransactions());
      }
    });
  });

  // Toggle Tabel Terpisah vs Gabungan
  const btnSplit = document.getElementById('btnTableLayoutSplit');
  const btnCombined = document.getElementById('btnTableLayoutCombined');
  const splitContainer = document.getElementById('splitTablesContainer');
  const combinedContainer = document.getElementById('combinedTableContainer');

  btnSplit?.addEventListener('click', () => {
    splitContainer.classList.remove('hidden');
    combinedContainer.classList.add('hidden');
    btnSplit.classList.add('active');
    btnCombined.classList.remove('active');
  });

  btnCombined?.addEventListener('click', () => {
    splitContainer.classList.add('hidden');
    combinedContainer.classList.remove('hidden');
    btnCombined.classList.add('active');
    btnSplit.classList.remove('active');
  });

  // Filters
  document.getElementById('filterSearch')?.addEventListener('input', (e) => {
    state.filters.search = e.target.value.trim();
    renderAll();
  });

  document.getElementById('filterInputter')?.addEventListener('change', (e) => {
    state.filters.inputter = e.target.value;
    renderAll();
  });

  document.getElementById('filterPeriod')?.addEventListener('change', (e) => {
    state.filters.period = e.target.value;
    const customMonthInput = document.getElementById('filterCustomMonth');
    if (e.target.value === 'CUSTOM_MONTH') {
      customMonthInput.classList.remove('hidden');
      if (!customMonthInput.value) {
        customMonthInput.value = new Date().toISOString().slice(0, 7);
        state.filters.customMonth = customMonthInput.value;
      }
    } else {
      customMonthInput.classList.add('hidden');
    }
    renderAll();
  });

  document.getElementById('filterCustomMonth')?.addEventListener('change', (e) => {
    state.filters.customMonth = e.target.value;
    renderAll();
  });

  document.getElementById('filterSort')?.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    renderAll();
  });

  document.getElementById('btnResetFilters')?.addEventListener('click', () => {
    state.filters = {
      search: '',
      inputter: 'ALL',
      period: 'ALL',
      customMonth: '',
      sort: 'NEWEST'
    };
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterInputter').value = 'ALL';
    document.getElementById('filterPeriod').value = 'ALL';
    document.getElementById('filterCustomMonth').classList.add('hidden');
    document.getElementById('filterSort').value = 'NEWEST';
    renderAll();
    showToast('Filter berhasil direset', 'info');
  });

  // Select jenis pada chart kategori
  document.getElementById('chartCategoryTypeSelect')?.addEventListener('change', () => {
    renderCharts(getFilteredTransactions());
  });

  // Tombol Data Contoh & Kosongkan Data
  document.getElementById('btnLoadDemo')?.addEventListener('click', () => {
    if (
      state.transactions.length > 0 &&
      !confirm('Muat ulang contoh data laporan keuangan? Data saat ini akan digantikan dengan data contoh.')
    ) {
      return;
    }
    state.transactions = getDemoTransactions();
    saveTransactionsToLocal();
    renderAll();
    showToast('Data contoh laporan keuangan berhasil dimuat!', 'info');
  });

  document.getElementById('btnClearAllData')?.addEventListener('click', () => {
    if (state.transactions.length === 0) return;
    if (!confirm('Apakah Anda yakin ingin mengosongkan seluruh data transaksi?')) return;
    state.transactions = [];
    saveTransactionsToLocal();
    renderAll();
    showToast('Seluruh data telah dikosongkan', 'danger');
  });

  // Export, Backup, Restore & Print
  document.getElementById('btnExportCSV')?.addEventListener('click', exportToCSV);
  document.getElementById('btnPrintReport')?.addEventListener('click', printFinancialReport);
  document.getElementById('btnShareWhatsApp')?.addEventListener('click', shareRecapToWhatsApp);
  document.getElementById('btnShareWhatsAppRecap')?.addEventListener('click', shareRecapToWhatsApp);
  document.getElementById('btnSetBudget')?.addEventListener('click', setBudgetLimitPrompt);
  document.getElementById('btnAddCustomCategory')?.addEventListener('click', addCustomCategory);
  document.getElementById('btnBackupJSON')?.addEventListener('click', backupToJSON);
  document.getElementById('inputRestoreJSON')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      restoreFromJSON(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Modal Cloud Sync & Vercel Info
  const cloudModal = document.getElementById('cloudModal');
  document.getElementById('btnCloudModal')?.addEventListener('click', () => {
    if (state.cloudConfig) {
      document.getElementById('supabaseUrlInput').value = state.cloudConfig.url || '';
      document.getElementById('supabaseKeyInput').value = state.cloudConfig.key || '';
    }
    cloudModal.classList.remove('hidden');
    cloudModal.classList.add('flex');
  });

  document.getElementById('btnCloseCloudModal')?.addEventListener('click', () => {
    cloudModal.classList.add('hidden');
    cloudModal.classList.remove('flex');
  });

  document.getElementById('btnSaveCloudConfig')?.addEventListener('click', () => {
    const url = document.getElementById('supabaseUrlInput').value.trim();
    const key = document.getElementById('supabaseKeyInput').value.trim();
    if (!url || !key) {
      showToast('Masukkan URL dan Anon Key Supabase', 'danger');
      return;
    }
    state.cloudConfig = { url, key };
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(state.cloudConfig));
    updateStorageStatusUI();
    cloudModal.classList.add('hidden');
    cloudModal.classList.remove('flex');
    loadTransactions();
    showToast('Sinkronisasi Cloud Supabase diaktifkan!', 'success');
  });

  document.getElementById('btnDisconnectCloud')?.addEventListener('click', () => {
    state.cloudConfig = null;
    localStorage.removeItem(CLOUD_CONFIG_KEY);
    document.getElementById('supabaseUrlInput').value = '';
    document.getElementById('supabaseKeyInput').value = '';
    updateStorageStatusUI();
    cloudModal.classList.add('hidden');
    cloudModal.classList.remove('flex');
    showToast('Menggunakan mode penyimpanan lokal browser', 'info');
  });
}

// Bootstrap saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRealtimeClock();
  setTransactionType('income');

  // Isi nama penginput terakhir jika pernah menginput
  const lastInputter = localStorage.getItem(LAST_INPUTTER_KEY);
  if (lastInputter) {
    const inputEl = document.getElementById('inputterName');
    if (inputEl) inputEl.value = lastInputter;
  }

  initEventListeners();
  loadCloudConfig();
  loadTransactions();
});
