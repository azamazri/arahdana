// =================================================================================
// KONEKSI & AUTENTIKASI
// =================================================================================
const SUPABASE_URL = "https://cxgmkobednujqyktehvs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Z21rb2JlZG51anF5a3RlaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwOTE1MTEsImV4cCI6MjA2OTY2NzUxMX0.4tnwdHLdR20Qbu__iLSSyY1lgZnYlAvm79D6RjdqAww";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================================================
// TITIK MASUK UTAMA APLIKASI (STRUKTUR BARU & DIPERBAIKI)
// =================================================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Langkah 1: Selalu periksa sesi login terlebih dahulu
  const {
    data: { session },
    error,
  } = await _supabase.auth.getSession();

  if (error || !session) {
    // Jika ada error ATAU tidak ada sesi, paksa ke login
    window.location.href = "login.html";
    return;
  }

  // Jika sampai sini, berarti sesi valid. Kita bisa memulai aplikasi.
  const currentUser = session.user;
  initializeAppDashboard(currentUser);
});

// Fungsi ini HANYA akan berjalan jika pengguna sudah terbukti login DAN DOM sudah siap
function initializeAppDashboard(currentUser) {
  // =================================================================================
  // STATE MANAGEMENT & KONFIGURASI
  // =================================================================================
  let state = {
    progressEntries: [],
    priorityStepId: 1,
    activeView: "overview",
    customGoals: {},
    unlockedAchievements: [],
    username: null,
  };
  let editingProgressId = null;

  const LADDER_CONFIG = [
    {
      id: 1,
      key: "nabungAwal",
      title: "Nabung Awal",
      shortTitle: "Nabung Awal",
      icon: "💰",
      goal: 30000000,
      desc: "Dana awal 30 Juta.",
      isAsset: true,
    },
    {
      id: 2,
      key: "lunasHutang",
      title: "Lunasin Hutang",
      shortTitle: "Lunas Hutang",
      icon: "💳",
      goal: 25000000,
      desc: "LUNAS! Tak ada lagi hutang.",
      isAsset: false,
    },
    {
      id: 3,
      key: "danaDarurat",
      title: "Dana Darurat",
      shortTitle: "Dana Darurat",
      icon: "🛡️",
      goal: 18000000,
      desc: "Siapkan 3-6 bln pengeluaran.",
      isAsset: true,
    },
    {
      id: 4,
      key: "investasi",
      title: "Investasi",
      shortTitle: "Investasi",
      icon: "📈",
      goal: null,
      desc: "Investasi untuk masa depan.",
      isAsset: true,
    },
    {
      id: 5,
      key: "danaPendidikan",
      title: "Dana Pendidikan",
      shortTitle: "Dana Anak",
      icon: "🎓",
      goal: 100000000,
      desc: "Bekal pendidikan terbaik untuk anak.",
      isAsset: true,
    },
    {
      id: 6,
      key: "lunasKPR",
      title: "Lunasin KPR",
      shortTitle: "Lunas KPR",
      icon: "🏡",
      goal: null,
      desc: "Bebas dari cicilan rumah.",
      isAsset: false,
    },
    {
      id: 7,
      key: "kekayaanAbadi",
      title: "Kekayaan Abadi dan Berbagi",
      shortTitle: "Kekayaan Abadi",
      icon: "🕊️",
      goal: 500000000,
      desc: "Capai kebebasan finansial.",
      isAsset: true,
    },
  ];

  const ladderContainer = document.getElementById("financial-ladder");
  const dashboardContent = document.getElementById("dashboard-content");
  const modal = document.getElementById("progress-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const progressForm = document.getElementById("progress-form");
  const progressCategorySelect = document.getElementById("progress-category");
  const progressDateInput = document.getElementById("progress-date");
  let assetChart, progressChart;

  async function init() {
    showLoading();
    await loadDataFromSupabase();
    setupEventListeners();
    populateCategoryOptions();
    updateUI();
  }
  function updateHeader() {
    const headerTitle = document.getElementById("main-header-title");
    if (headerTitle && state.username) {
      // 1. Ambil username dari state
      const username = state.username;

      // 2. Buat versi dengan huruf kapital di awal
      const capitalizedUsername =
        username.charAt(0).toUpperCase() + username.slice(1);

      // 3. Buat HTML dengan kelas gradien untuk penekanan visual
      headerTitle.innerHTML = ` Tangga Keuangan <span class="text-gradient-orange">${capitalizedUsername}</span>`;
    }
  }

  function getGoal(stepConfig) {
    // Cek apakah target kustom ada DAN nilainya bukan null/undefined
    if (state.customGoals && state.customGoals[stepConfig.key] != null) {
      return state.customGoals[stepConfig.key];
    }
    // Jika tidak, baru gunakan nilai default dari konfigurasi
    return stepConfig.goal;
  }

  function updateUI() {
    updateHeader();
    if (!dashboardContent) {
      console.error("Dashboard content not found!");
      return;
    }
    const progress = calculateProgress();
    checkPriority(progress);
    renderLadder(progress);
    if (state.activeView === "overview") {
      renderOverview(progress);
    } else {
      renderDetailView(state.activeView, progress);
    }
    checkAchievements(progress);
  }

  function renderOverview(progress) {
    dashboardContent.innerHTML = "";
    dashboardContent.appendChild(createControlsHeader("Dashboard Utama", true));
    const mainArea = document.createElement("div");
    mainArea.className = "dashboard-main-area";
    const topRow = document.createElement("div");
    topRow.className = "dashboard-row";
    const priorityWrapper = createCardWrapper("priority");
    const summaryWrapper = createCardWrapper("summary");
    const priorityStep = LADDER_CONFIG.find(
      (s) => s.id === state.priorityStepId
    );
    priorityWrapper.appendChild(createPriorityCard(priorityStep, progress));
    summaryWrapper.appendChild(createSummaryCard(progress));
    topRow.appendChild(priorityWrapper);
    topRow.appendChild(summaryWrapper);
    const bottomRow = document.createElement("div");
    bottomRow.className = "dashboard-row";
    const chart1Wrapper = createCardWrapper("chart");
    const chart2Wrapper = createCardWrapper("chart");
    chart1Wrapper.appendChild(
      createChartContainer("Komposisi Aset Produktif", "assetChart", true)
    );
    chart2Wrapper.appendChild(
      createChartContainer("Total Progres per Tangga", "progressChart", false)
    );
    bottomRow.appendChild(chart1Wrapper);
    bottomRow.appendChild(chart2Wrapper);
    mainArea.appendChild(topRow);
    mainArea.appendChild(bottomRow);
    dashboardContent.appendChild(mainArea);
    dashboardContent.appendChild(createHistoryTable("Riwayat Progres Terbaru"));
    initCharts();
    updateCharts(progress);
    renderHistory(progress);
  }

  function renderDetailView(viewKey, progress) {
    dashboardContent.innerHTML = "";
    const stepConfig = LADDER_CONFIG.find((s) => s.key === viewKey);
    if (!stepConfig) return;
    dashboardContent.appendChild(
      createControlsHeader(`Fokus: ${stepConfig.title}`, false)
    );
    const mainArea = document.createElement("div");
    mainArea.className = "dashboard-main-area";
    const cardWrapper = createCardWrapper("priority");
    cardWrapper.appendChild(createDetailCard(stepConfig, progress));
    mainArea.appendChild(cardWrapper);
    dashboardContent.appendChild(mainArea);
    dashboardContent.appendChild(
      createHistoryTable(`Riwayat untuk ${stepConfig.title}`)
    );
    renderHistory(progress, viewKey);
  }

  function createCardWrapper(type) {
    const wrapper = document.createElement("div");
    wrapper.className = `card-wrapper ${type}`;
    return wrapper;
  }

  function createControlsHeader(title, showButton) {
    const header = document.createElement("div");
    header.className = "controls-header";

    // Bagian Kiri: Judul Halaman
    const titleElement = document.createElement("h2");
    titleElement.className = "current-step-title text-gradient-orange";
    titleElement.textContent = title;

    // Bagian Kanan: Grup Tombol Aksi
    const actionGroup = document.createElement("div");
    actionGroup.style.display = "flex";
    actionGroup.style.gap = "10px";

    // Buat tombol "Tambah Progres" jika diperlukan
    if (showButton) {
      const addProgressBtn = document.createElement("button");
      addProgressBtn.className = "toggle-form-btn";
      addProgressBtn.innerHTML = `<span>🚀 Tambah Progres</span>`;
      addProgressBtn.onclick = () => openModal();
      actionGroup.appendChild(addProgressBtn); // Tambahkan ke grup
    }

    // Buat tombol "Keluar"
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Keluar";
    logoutBtn.style.cssText =
      "background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;";
    logoutBtn.onmouseover = () => {
      logoutBtn.style.transform = "translateY(-2px)";
    };
    logoutBtn.onmouseleave = () => {
      logoutBtn.style.transform = "translateY(0px)";
    };
    logoutBtn.onclick = async () => {
      await _supabase.auth.signOut();
      window.location.href = "login.html";
    };
    actionGroup.appendChild(logoutBtn); // Tambahkan ke grup

    // Gabungkan semuanya ke header utama
    header.appendChild(titleElement);
    header.appendChild(actionGroup);

    return header;
  }

  function createPriorityCard(stepConfig, progress) {
    const card = createCardBase();
    if (!stepConfig) {
      card.innerHTML = "Prioritas tidak ditemukan.";
      return card;
    }
    const currentAmount = progress[stepConfig.key] || 0;
    const goal = getGoal(stepConfig);
    card.innerHTML = `<div class="card-header"><div class="card-icon">⭐</div><div class="card-title">Fokus Prioritas: ${
      stepConfig.title
    }</div></div><div class="amount text-gradient-green">${formatCurrency(
      currentAmount
    )}</div>${
      goal
        ? `<div class="target"><div class="target-label">Target</div><div class="target-value">${formatCurrency(
            goal
          )}</div></div>`
        : ""
    }`;
    return card;
  }

  function createDetailCard(stepConfig, progress) {
    const card = createCardBase("detail-view-card");
    const currentAmount = progress[stepConfig.key] || 0;
    const goal = getGoal(stepConfig);
    let amountToShow = currentAmount,
      amountClass = "text-gradient-green";
    if (stepConfig.key === "lunasHutang" || stepConfig.key === "lunasKPR") {
      if (goal !== null && goal > 0) {
        amountToShow = Math.max(0, goal - currentAmount);
        if (amountToShow > 0) amountClass = "text-gradient-red";
      } else {
        amountToShow = currentAmount;
      }
    }
    const projection = calculateProjection(stepConfig.key, currentAmount, goal);
    const targetContentHTML = `<div class="target-value" id="target-value-${
      stepConfig.key
    }">${
      goal !== null && goal !== undefined
        ? `<span>${formatCurrency(
            stepConfig.key.startsWith("lunas") ? 0 : goal
          )}</span>`
        : `<span>Tentukan Target</span>`
    }${
      stepConfig.key !== "nabungAwal"
        ? `<i class="edit-goal-icon" data-key="${stepConfig.key}">✎</i>`
        : ""
    }</div>`;
    card.innerHTML = `<div class="card-header"><div class="card-icon">${
      stepConfig.icon
    }</div><div class="card-title">${
      stepConfig.title
    }</div></div><div class="amount ${amountClass}">${formatCurrency(
      amountToShow
    )}</div><div class="target"><div class="target-label">Target</div>${targetContentHTML}${
      projection ? `<p class="projection-text">${projection}</p>` : ""
    }</div>`;
    const button = document.createElement("button");
    button.className = "toggle-form-btn";
    button.style.marginTop = "20px";
    button.innerHTML = `<span>✨ Tambah Progres</span>`;
    button.onclick = () => openModal();
    card.appendChild(button);
    return card;
  }

  function createSummaryCard(progress) {
    const card = createCardBase("summary-card");

    // --- LOGIKA PERHITUNGAN KEUANGAN FINAL & AKURAT ---

    const hutangConfig = LADDER_CONFIG.find((s) => s.key === "lunasHutang");
    const kprConfig = LADDER_CONFIG.find((s) => s.key === "lunasKPR");

    const targetHutang = getGoal(hutangConfig) || 0;
    const targetKPR = getGoal(kprConfig) || 0;

    const progressHutang = progress.lunasHutang || 0;
    const progressKPR = progress.lunasKPR || 0;

    // 1. Hitung aset dasar dari tangga yang memang aset (Nabung Awal, Dana Darurat, dll.)
    const asetDasar = LADDER_CONFIG.reduce(
      (sum, step) => (step.isAsset ? sum + (progress[step.key] || 0) : sum),
      0
    );

    // 2. IDENTIFIKASI KELEBIHAN BAYAR: Hitung berapa banyak pembayaran utang yang melebihi target.
    const kelebihanBayarHutang = Math.max(0, progressHutang - targetHutang);
    const kelebihanBayarKPR = Math.max(0, progressKPR - targetKPR);

    // 3. HITUNG TOTAL ASET SEBENARNYA: Aset dasar DITAMBAH setiap kelebihan bayar.
    const totalAset = asetDasar + kelebihanBayarHutang + kelebihanBayarKPR;

    // 4. Hitung Sisa Liabilitas (tidak akan pernah di bawah nol).
    const sisaHutang = Math.max(0, targetHutang - progressHutang);
    const sisaKPR = Math.max(0, targetKPR - progressKPR);
    const totalLiabilitas = sisaHutang + sisaKPR;

    // 5. Hitung Kekayaan Bersih (Net Worth) yang akurat.
    const netWorth = totalAset - totalLiabilitas;
    card.innerHTML = `<h2 class="card-title">📋 Ringkasan Keuangan</h2><div class="summary-stats"><div class="summary-stat"><div class="summary-stat-value text-gradient-green">${formatCurrency(
      netWorth
    )}</div><div class="summary-stat-label">Net Worth (Kekayaan Bersih)</div></div><div class="summary-stat"><div class="summary-stat-value text-gradient-green">${formatCurrency(
      totalAset
    )}</div><div class="summary-stat-label">Total Aset</div></div><div class="summary-stat"><div class="summary-stat-value text-gradient-red">${formatCurrency(
      totalLiabilitas
    )}</div><div class="summary-stat-label">Total Liabilitas (Hutang)</div></div><div class="summary-stat"><div class="summary-stat-value">${
      state.priorityStepId
    } / ${
      LADDER_CONFIG.length
    }</div><div class="summary-stat-label">Tangga Prioritas</div></div></div>`;
    return card;
  }

  function createChartContainer(title, canvasId, hasCustomLegend) {
    const card = createCardBase();
    card.innerHTML = `<h3 class="card-title">${title}</h3>`;
    const wrapper = document.createElement("div");
    wrapper.className = "chart-container-wrapper";
    wrapper.innerHTML = `<div class="chart-canvas-container"><canvas id="${canvasId}"></canvas></div>`;
    if (hasCustomLegend) {
      wrapper.innerHTML += `<div id="${canvasId}-legend" class="custom-legend"></div>`;
    }
    card.appendChild(wrapper);
    return card;
  }

  function createHistoryTable(title) {
    const container = document.createElement("div");
    container.className = "progress-history-card";
    container.innerHTML = `<h2 class="section-title">${title}</h2><div class="history-table-container"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Jumlah (Rp)</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody id="history-table-body"></tbody></table></div>`;
    return container;
  }

  function createCardBase(extraClass = "") {
    const card = document.createElement("div");
    card.className = `card ${extraClass}`;
    return card;
  }

  function renderLadder(progress) {
    ladderContainer.innerHTML = "";
    const homeButton = document.createElement("div");
    homeButton.className = "ladder-step";
    homeButton.dataset.key = "overview";
    if (state.activeView === "overview") homeButton.classList.add("active");
    homeButton.innerHTML = `<div class="ladder-header"><div class="ladder-title-group"><span class="ladder-icon">🏠</span><h3 class="ladder-title">Dashboard Utama</h3></div></div><div style="margin-top:auto;"><p class="ladder-description" style="margin-bottom:0; height: 1.4em;"></p></div>`;
    ladderContainer.appendChild(homeButton);

    LADDER_CONFIG.forEach((step) => {
      const stepEl = document.createElement("div");
      stepEl.className = "ladder-step";
      stepEl.dataset.key = step.key;
      const isPriority = step.id === state.priorityStepId;
      if (isPriority) stepEl.classList.add("priority");
      if (step.key === state.activeView) stepEl.classList.add("active");
      const currentProgress = progress[step.key] || 0;
      const goal = getGoal(step);
      const percentage =
        goal > 0
          ? Math.min((currentProgress / goal) * 100, 100)
          : currentProgress > 0
          ? 100
          : 0;
      stepEl.innerHTML = `<div class="ladder-header"><div class="ladder-title-group"><span class="ladder-icon">${
        step.icon
      }</span><h3 class="ladder-title">${step.title}</h3></div>${
        isPriority ? `<span class="priority-tag">PRIORITAS</span>` : ""
      }</div><p class="ladder-description">${
        step.desc
      }</p><div class="ladder-progress-bar"><div class="ladder-progress-fill" style="width: ${percentage}%;"></div></div><p class="ladder-progress-text">${formatCurrency(
        currentProgress
      )} ${goal ? "/ " + formatCurrency(goal) : ""}</p>`;
      ladderContainer.appendChild(stepEl);
    });
  }

  function renderHistory(progress, filterKey = "all") {
    const tableBody = document.getElementById("history-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const entriesToShow = (
      filterKey === "all"
        ? state.progressEntries
        : state.progressEntries.filter((e) => e.categoryKey === filterKey)
    )
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);
    if (entriesToShow.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #94a3b8;">Belum ada progres.</td></tr>`;
      return;
    }
    entriesToShow.forEach((entry) => {
      const row = document.createElement("tr");
      const categoryTitle = LADDER_CONFIG.find(
        (s) => s.key === entry.categoryKey
      ).title;
      row.innerHTML = `<td>${new Date(entry.date).toLocaleDateString(
        "id-ID"
      )}</td><td>${categoryTitle}</td><td class="amount-history">${formatCurrency(
        entry.amount
      )}</td><td>${
        entry.notes || "-"
      }</td><td class="action-buttons"><button class="edit-btn" data-id="${
        entry.id
      }">✏️</button><button class="delete-btn" data-id="${
        entry.id
      }">🗑️</button></td>`;
      tableBody.appendChild(row);
    });
  }

  function updateCharts(progress) {
    if (assetChart) {
      const assetSteps = LADDER_CONFIG.filter((s) => s.isAsset);
      const chartData = assetSteps.map((step) => progress[step.key] || 0);
      const chartLabels = assetSteps.map((step) => step.title);
      const chartColors = [
        "#3b82f6",
        "#10b981",
        "#8b5cf6",
        "#f59e0b",
        "#ef4444",
      ];
      const filteredLabels = [],
        filteredData = [],
        filteredColors = [];
      chartData.forEach((data, index) => {
        if (data > 0) {
          filteredLabels.push(chartLabels[index]);
          filteredData.push(data);
          filteredColors.push(chartColors[index % chartColors.length]);
        }
      });
      assetChart.data.labels = filteredLabels;
      assetChart.data.datasets[0].data = filteredData;
      assetChart.data.datasets[0].backgroundColor = filteredColors;
      assetChart.update();
      renderCustomLegend(assetChart);
    }
    if (progressChart) {
      progressChart.data.labels = LADDER_CONFIG.map((s) => s.shortTitle);
      progressChart.data.datasets[0].data = LADDER_CONFIG.map(
        (s) => progress[s.key] || 0
      );
      progressChart.update();
    }
  }

  function initCharts() {
    if (assetChart) assetChart.destroy();
    if (progressChart) progressChart.destroy();
    const assetCanvas = document.getElementById("assetChart");
    if (assetCanvas) {
      assetChart = new Chart(assetCanvas, {
        type: "doughnut",
        data: {
          labels: [],
          datasets: [
            { data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 4 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: { legend: { display: false } },
        },
      });
    }
    const progressCanvas = document.getElementById("progressChart");
    if (progressCanvas) {
      progressChart = new Chart(progressCanvas, {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Total Progres", data: [] }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          datasets: { bar: { backgroundColor: "#06b6d4" } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: "#94a3b8",
                callback: (value) =>
                  new Intl.NumberFormat("id-ID", {
                    notation: "compact",
                  }).format(value),
              },
              grid: { color: "rgba(148, 163, 184, 0.1)" },
            },
            x: {
              ticks: { color: "#94a3b8", font: { size: 9 } },
              grid: { display: false },
            },
          },
        },
      });
    }
  }

  function renderCustomLegend(chart) {
    const legendContainer = document.getElementById(
      `${chart.canvas.id}-legend`
    );
    if (!legendContainer) return;
    legendContainer.innerHTML = "";
    chart.data.labels.forEach((label, index) => {
      if (chart.data.datasets[0].data[index] > 0) {
        const color = chart.data.datasets[0].backgroundColor[index];
        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = `<span class="legend-color-box" style="background-color: ${color}"></span> ${label}`;
        legendContainer.appendChild(item);
      }
    });
  }

  function setupEventListeners() {
    ladderContainer.addEventListener("click", (e) => {
      const clickedStep = e.target.closest(".ladder-step");
      if (clickedStep) {
        state.activeView = clickedStep.dataset.key;
        updateUI();
      }
    });
    dashboardContent.addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-goal-icon"))
        handleEditGoal(e.target.dataset.key);
      if (e.target.classList.contains("edit-btn"))
        handleEditProgress(e.target.dataset.id);
      if (e.target.classList.contains("delete-btn"))
        handleDeleteProgress(e.target.dataset.id);
    });
    closeModalBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    progressForm.addEventListener("submit", handleFormSubmit);
  }

  async function handleEditGoal(key) {
    const targetValueDiv = document.getElementById(`target-value-${key}`);
    const originalValue = getGoal(LADDER_CONFIG.find((s) => s.key === key));
    targetValueDiv.innerHTML = `<form class="edit-goal-form" data-key="${key}"><input type="number" value="${
      originalValue || ""
    }" placeholder="Tentukan target" required /><button type="submit">✓</button></form>`;
    const form = targetValueDiv.querySelector("form");
    form.querySelector("input").focus();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newGoal = parseFloat(e.target.querySelector("input").value);
      if (!isNaN(newGoal) && newGoal >= 0) {
        state.customGoals[key] = newGoal;
        const { error } = await _supabase
          .from("custom_goals")
          .upsert(
            { user_id: currentUser.id, goals: state.customGoals },
            { onConflict: "user_id" }
          );
        if (error) {
          console.error("Failed to save goal:", error);
          alert("Gagal menyimpan target.");
        }
        updateUI();
      }
    });
  }

  function handleEditProgress(id) {
    const entryToEdit = state.progressEntries.find((e) => e.id == id);
    if (entryToEdit) {
      editingProgressId = entryToEdit.id;
      openModal(entryToEdit);
    }
  }

  async function handleDeleteProgress(id) {
    const confirmModal = document.getElementById("confirm-modal");
    const confirmOkBtn = document.getElementById("confirm-ok-btn");
    const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
    const confirmText = document.getElementById("confirm-text");

    confirmText.textContent = "Anda yakin ingin menghapus progres ini?";
    confirmModal.classList.add("show");

    // Buat promise untuk menunggu keputusan pengguna
    const userConfirmation = new Promise((resolve) => {
      confirmOkBtn.onclick = () => resolve(true);
      confirmCancelBtn.onclick = () => resolve(false);
    });

    const confirmed = await userConfirmation;
    confirmModal.classList.remove("show");

    if (confirmed) {
      const { error } = await _supabase
        .from("progress_entries")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Failed to delete progress:", error);
        showToast("Gagal menghapus progres.", "error");
        return;
      }
      showToast("Progres berhasil dihapus!", "success");
      init(); // Muat ulang semua data
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const newProgressData = {
      amount: parseFloat(document.getElementById("progress-amount").value),
      categoryKey: progressCategorySelect.value,
      date: progressDateInput.value,
      notes: document.getElementById("progress-notes").value,
    };

    if (isNaN(newProgressData.amount) || newProgressData.amount <= 0) {
      showToast("Jumlah progres harus angka positif.", "error");
      return;
    }

    let error;

    if (editingProgressId) {
      // Logika UPDATE yang benar
      const { error: updateError } = await _supabase
        .from("progress_entries")
        .update(newProgressData)
        .eq("id", editingProgressId);

      error = updateError;
    } else {
      // Logika INSERT BARU
      const { error: insertError } = await _supabase
        .from("progress_entries")
        .insert([{ ...newProgressData, user_id: currentUser.id }]);

      error = insertError;
    }

    if (error) {
      console.error("Error saving progress:", error);
      showToast("Gagal menyimpan progres. Coba lagi.", "error");
      return;
    }

    // --- PERBAIKAN: Pindahkan closeModal() KE SINI ---
    closeModal(); // Tutup modal HANYA setelah berhasil.

    showToast(
      editingProgressId
        ? "Progres berhasil diperbarui!"
        : "Progres berhasil disimpan!",
      "success"
    );

    init(); // Muat ulang semua data
  }

  function calculateProgress() {
    const progressTotals = {};
    LADDER_CONFIG.forEach((step) => (progressTotals[step.key] = 0));
    if (state.progressEntries) {
      state.progressEntries.forEach((entry) => {
        if (progressTotals.hasOwnProperty(entry.categoryKey)) {
          progressTotals[entry.categoryKey] += entry.amount;
        }
      });
    }
    return progressTotals;
  }

  function checkPriority(progress) {
    let newPriorityId = 1;
    for (const step of LADDER_CONFIG.sort((a, b) => a.id - b.id)) {
      const goal = getGoal(step);
      if (goal !== null && (progress[step.key] || 0) >= goal) {
        if (newPriorityId < LADDER_CONFIG.length) {
          newPriorityId = step.id + 1;
        } else {
          newPriorityId = step.id;
        }
      } else {
        break;
      }
    }
    state.priorityStepId = newPriorityId;
  }

  function openModal(entryToEdit = null) {
    const modalTitle = modal.querySelector(".update-title");
    const submitBtn = modal.querySelector(".bulk-btn");
    if (entryToEdit) {
      modalTitle.textContent = "✏️ Edit Progres";
      submitBtn.textContent = "💾 Simpan Perubahan";
      document.getElementById("progress-amount").value = entryToEdit.amount;
      document.getElementById("progress-category").value =
        entryToEdit.categoryKey;
      document.getElementById("progress-date").value = entryToEdit.date;
      document.getElementById("progress-notes").value = entryToEdit.notes;
    } else {
      modalTitle.textContent = "⚡ Catat Progres Keuangan";
      submitBtn.textContent = "💾 Simpan Progres";
      progressForm.reset();
      progressDateInput.valueAsDate = new Date();
      const targetCategory =
        state.activeView !== "overview"
          ? state.activeView
          : LADDER_CONFIG.find((s) => s.id === state.priorityStepId).key;
      progressCategorySelect.value = targetCategory;
    }
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show");
    progressForm.reset();
    editingProgressId = null;
  }

  function populateCategoryOptions() {
    progressCategorySelect.innerHTML = LADDER_CONFIG.map(
      (step) => `<option value="${step.key}">${step.title}</option>`
    ).join("");
  }

  function formatCurrency(num) {
    if (typeof num !== "number") return "Rp 0";
    return `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
  }

  function calculateProjection(key, currentAmount, goal) {
    if (
      goal === null ||
      goal === 0 ||
      currentAmount >= goal ||
      !state.progressEntries
    )
      return null;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const recentProgress = state.progressEntries
      .filter((e) => e.categoryKey === key && new Date(e.date) >= oneMonthAgo)
      .reduce((sum, e) => sum + e.amount, 0);
    if (recentProgress <= 0) return null;
    const remainingAmount = goal - currentAmount;
    const monthsLeft = remainingAmount / recentProgress;
    if (monthsLeft > 1200) return null;
    if (monthsLeft < 1) return `Estimasi tercapai < 1 bulan lagi.`;
    if (monthsLeft < 13)
      return `Estimasi tercapai dalam ~${Math.ceil(monthsLeft)} bulan.`;
    const years = Math.floor(monthsLeft / 12);
    return `Estimasi tercapai dalam ~${years} tahun lagi.`;
  }

  function checkAchievements(progress) {
    // Implementasi checkAchievements di sini
  }

  function showToast(message, type = "success") {
    // default ke 'success'
    const toast = document.createElement("div");
    // Baris ini sekarang menambahkan kelas 'success' atau 'error'
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      // Cek apakah toast masih ada sebelum menghapusnya
      if (toast.parentNode === document.body) {
        document.body.removeChild(toast);
      }
    }, 4000);
  }

  async function loadDataFromSupabase() {
    // 1. Ambil data progres dan goals secara bersamaan (lebih efisien)
    const [progressResult, goalsResult, profileResult] = await Promise.all([
      _supabase
        .from("progress_entries")
        .select("*")
        .eq("user_id", currentUser.id),
      _supabase
        .from("custom_goals")
        .select("goals")
        .eq("user_id", currentUser.id)
        .single(),
      _supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUser.id)
        .single(), // <-- QUERY BARU
    ]);

    // Proses data progres
    if (progressResult.error) {
      console.error("Error fetching progress:", progressResult.error);
    } else {
      state.progressEntries = progressResult.data;
    }

    // Proses data goals
    if (goalsResult.error && goalsResult.error.code !== "PGRST116") {
      console.error("Error fetching goals:", goalsResult.error);
    } else if (goalsResult.data) {
      state.customGoals = goalsResult.data.goals || {};
    }

    // Proses data profil (username)
    if (profileResult.error) {
      console.error("Error fetching profile:", profileResult.error);
    } else if (profileResult.data) {
      state.username = profileResult.data.username;
    }
  }

  function showLoading() {
    if (dashboardContent)
      dashboardContent.innerHTML = `<div style="text-align:center; padding: 50px; font-size: 1.2rem; color: #94a3b8;">Memuat data Anda...</div>`;
  }

  // Titik awal eksekusi setelah login
  init();
}
