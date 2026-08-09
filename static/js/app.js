/* ==========================================================================
   PERFORMANCE TRACKER - ENTERPRISE ANALYTICS APPLICATION
   Client JavaScript: WebSockets, Plotly Charts, Dynamic Filtering & Modals
   ========================================================================== */

let currentTheme = localStorage.getItem("perf_tracker_theme") || "light";
let currentDashboardData = null;
let currentSortBy = "";
let currentSortOrder = "asc";
let searchDebounceTimer = null;
let websocket = null;

// --- Colors for Plotly Charts (Light & Dark Palettes) ---
const chartPalettes = {
  light: {
    paperBg: 'rgba(0,0,0,0)',
    plotBg: 'rgba(0,0,0,0)',
    textColor: '#1E293B',
    gridColor: '#E2E8F0',
    primaryColors: ['#0078D4', '#00BCF2', '#107C41', '#FFB900', '#D13438', '#881798', '#E3008C', '#008272'],
    barColor: '#0078D4',
    lineColor: '#107C41',
    vBarColor: '#00BCF2'
  },
  dark: {
    paperBg: 'rgba(0,0,0,0)',
    plotBg: 'rgba(0,0,0,0)',
    textColor: '#F8FAFC',
    gridColor: '#26334D',
    primaryColors: ['#38BDF8', '#818CF8', '#34D399', '#FBBF24', '#F87171', '#C084FC', '#F472B6', '#2DD4BF'],
    barColor: '#38BDF8',
    lineColor: '#34D399',
    vBarColor: '#818CF8'
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initWebSocket();
  initEventListeners();
  fetchDashboardData();
});

// --- Theme Management ---
function initTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeUI();

  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      currentTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", currentTheme);
      localStorage.setItem("perf_tracker_theme", currentTheme);
      updateThemeUI();
      if (currentDashboardData) {
        renderCharts(currentDashboardData.charts);
      }
    });
  }
}

function updateThemeUI() {
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");
  if (currentTheme === "dark") {
    if (icon) icon.className = "bi bi-sun-fill text-warning";
    if (text) text.textContent = "Light";
  } else {
    if (icon) icon.className = "bi bi-moon-stars-fill";
    if (text) text.textContent = "Dark";
  }
}

// --- WebSocket Live Connection ---
function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  websocket = new WebSocket(wsUrl);

  websocket.onopen = () => {
    console.log("Connected to Performance Tracker WebSocket");
    const badge = document.getElementById("liveStatusBadge");
    if (badge) {
      badge.innerHTML = `<div class="status-dot"></div> Live Sync Active`;
      badge.style.color = "var(--accent-success)";
    }
  };

  websocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === "excel_updated" || msg.event === "connected") {
        if (msg.data) {
          currentDashboardData = msg.data;
          updateUI(msg.data);
        }
        if (msg.message && msg.event === "excel_updated") {
          showToast(msg.message);
        }
      }
    } catch (e) {
      console.error("Error processing WebSocket payload:", e);
    }
  };

  websocket.onclose = () => {
    console.warn("WebSocket closed. Attempting reconnect in 3s...");
    const badge = document.getElementById("liveStatusBadge");
    if (badge) {
      badge.innerHTML = `<i class="bi bi-exclamation-circle-fill text-warning me-1"></i> Reconnecting...`;
    }
    setTimeout(initWebSocket, 3000);
  };
}

// --- Fetch Dashboard API Fallback ---
async function fetchDashboardData() {
  const search = document.getElementById("searchInput")?.value || "";
  const url = `/dashboard?search=${encodeURIComponent(search)}&sort_by=${currentSortBy}&sort_order=${currentSortOrder}`;
  try {
    const res = await fetch(url);
    const result = await res.json();
    if (result.status === "success" && result.data) {
      currentDashboardData = result.data;
      updateUI(result.data);
    }
  } catch (err) {
    console.error("Failed to fetch dashboard data:", err);
  }
}

// --- Global UI Update Handler ---
function updateUI(data) {
  updateSummaryCards(data.summary);
  renderCharts(data.charts);
  renderTable(data.records, data.columns);
  populateModalForms(data.columns);
}

// --- Number Counter Animation for Summary Cards ---
function updateSummaryCards(summary) {
  animateCounter("kpiTotalInterns", summary.total_interns || 0);
  animateCounter("kpiPhysicalVisits", summary.total_physical_visits || 0);
  animateCounter("kpiTelecalling", summary.total_telecalling || 0);
  animateCounter("kpiWeeklyVisits", summary.total_weekly_visits || 0);
  animateCounter("kpiLeadsAchieved", summary.total_leads_achieved || 0);
  animateCounter("kpiMarketingActivities", summary.total_marketing_activities || 0);
  animateCounter("kpiDSAConnectors", summary.total_dsa_connectors || 0);
  animateCounter("kpiPromotersBuilders", summary.total_promoters_builders || 0);
}

function animateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startValue = parseInt(el.textContent.replace(/,/g, '')) || 0;
  if (startValue === targetValue) {
    el.textContent = targetValue.toLocaleString();
    return;
  }

  const duration = 600;
  const startTime = performance.now();

  function updateStep(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out quad formula
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);

    el.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(updateStep);
    } else {
      el.textContent = targetValue.toLocaleString();
    }
  }

  requestAnimationFrame(updateStep);
}

// --- Render Plotly Visualizations ---
function renderCharts(charts) {
  const p = chartPalettes[currentTheme];

  const plotlyConfig = {
    responsive: true,
    displayModeBar: 'hover',
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d']
  };

  // 1. DONUT CHART: Onboarding / Leads Achieved
  if (charts.donut_leads && charts.donut_leads.length > 0) {
    const labels = charts.donut_leads.map(d => d.labels);
    const values = charts.donut_leads.map(d => d.values);
    const customData = charts.donut_leads.map(d => d.percentage);

    const donutTrace = {
      labels: labels,
      values: values,
      customdata: customData,
      type: 'pie',
      hole: 0.55,
      marker: { colors: p.primaryColors },
      textinfo: 'label+percent',
      textposition: 'inside',
      insidetextorientation: 'radial',
      hovertemplate: '<b>%{label}</b><br>Leads: %{value}<br>Share: %{customdata}%<extra></extra>'
    };

    const donutLayout = {
      margin: { t: 10, b: 10, l: 10, r: 10 },
      paper_bgcolor: p.paperBg,
      plot_bgcolor: p.plotBg,
      font: { color: p.textColor, family: 'Outfit, sans-serif' },
      showlegend: false,
      dragmode: false,
      hovermode: 'closest'
    };

    Plotly.react('donutChart', [donutTrace], donutLayout, plotlyConfig);
  } else {
    Plotly.purge('donutChart');
  }

  // 2. HORIZONTAL BAR CHART: Telecalling
  if (charts.bar_telecalling && charts.bar_telecalling.length > 0) {
    const names = charts.bar_telecalling.map(d => d.name).reverse();
    const counts = charts.bar_telecalling.map(d => d.count).reverse();

    const hBarTrace = {
      x: counts,
      y: names,
      type: 'bar',
      orientation: 'h',
      marker: {
        color: p.barColor,
        cornerradius: 6
      },
      hovertemplate: '<b>%{y}</b><br>Telecalling: %{x}<extra></extra>'
    };

    const hBarLayout = {
      margin: { t: 10, b: 30, l: 110, r: 20 },
      paper_bgcolor: p.paperBg,
      plot_bgcolor: p.plotBg,
      font: { color: p.textColor, family: 'Outfit, sans-serif' },
      xaxis: { gridcolor: p.gridColor, zerolinecolor: p.gridColor },
      yaxis: { gridcolor: p.gridColor },
      dragmode: false,
      hovermode: 'closest'
    };

    Plotly.react('horizontalBarChart', [hBarTrace], hBarLayout, plotlyConfig);
  } else {
    Plotly.purge('horizontalBarChart');
  }

  // 3. LINE CHART: Physical Visits
  if (charts.line_physical_visits && charts.line_physical_visits.length > 0) {
    const names = charts.line_physical_visits.map(d => d.name);
    const visits = charts.line_physical_visits.map(d => d.visits);

    const lineTrace = {
      x: names,
      y: visits,
      type: 'scatter',
      mode: 'lines+markers',
      line: { shape: 'spline', color: p.lineColor, width: 3 },
      marker: { size: 8, color: p.lineColor, symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>Physical Visits: %{y}<extra></extra>'
    };

    const lineLayout = {
      margin: { t: 10, b: 40, l: 40, r: 20 },
      paper_bgcolor: p.paperBg,
      plot_bgcolor: p.plotBg,
      font: { color: p.textColor, family: 'Outfit, sans-serif' },
      xaxis: { gridcolor: p.gridColor },
      yaxis: { gridcolor: p.gridColor, zerolinecolor: p.gridColor },
      dragmode: false,
      hovermode: 'closest'
    };

    Plotly.react('lineChart', [lineTrace], lineLayout, plotlyConfig);
  } else {
    Plotly.purge('lineChart');
  }

  // 4. VERTICAL BAR CHART: Marketing Activity
  if (charts.bar_marketing && charts.bar_marketing.length > 0) {
    const names = charts.bar_marketing.map(d => d.name);
    const counts = charts.bar_marketing.map(d => d.count);

    const vBarTrace = {
      x: names,
      y: counts,
      type: 'bar',
      marker: {
        color: p.vBarColor,
        cornerradius: 6
      },
      hovertemplate: '<b>%{x}</b><br>Marketing Activity: %{y}<extra></extra>'
    };

    const vBarLayout = {
      margin: { t: 10, b: 40, l: 40, r: 20 },
      paper_bgcolor: p.paperBg,
      plot_bgcolor: p.plotBg,
      font: { color: p.textColor, family: 'Outfit, sans-serif' },
      xaxis: { gridcolor: p.gridColor },
      yaxis: { gridcolor: p.gridColor, zerolinecolor: p.gridColor },
      dragmode: false,
      hovermode: 'closest'
    };

    Plotly.react('verticalBarChart', [vBarTrace], vBarLayout, plotlyConfig);
  } else {
    Plotly.purge('verticalBarChart');
  }
}

// --- Floating Hover Popover Detail Card ---
let hoverCard = null;

function getOrCreateHoverCard() {
  if (!hoverCard) {
    hoverCard = document.createElement("div");
    hoverCard.className = "hover-detail-card";
    document.body.appendChild(hoverCard);
  }
  return hoverCard;
}

function showHoverCard(e, record) {
  const card = getOrCreateHoverCard();
  const name = record["Intern Name"] || "Intern";
  const branch = record["Branch"] || "N/A";
  const physical = record["Physical Visits"] || 0;
  const telecalling = record["Telecalling"] || 0;
  const weekly = record["Weekly Visits"] || 0;
  const leads = record["Leads Achieved"] || 0;
  const marketing = record["Marketing Activity"] || 0;
  const dsa = record["DSA/Connectors"] || 0;
  const promoters = record["Promoters/Builders"] || 0;
  const insight = record["Insight"] || "No additional notes provided.";

  card.innerHTML = `
    <div class="hover-card-header">
      <div class="hover-card-title"><i class="bi bi-person-badge text-primary me-1"></i>${escapeHtml(name)}</div>
      <div class="hover-card-subtitle"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(branch)}</div>
    </div>
    <div class="hover-stats-grid">
      <div class="hover-stat-item">
        <div class="hover-stat-label">Physical Visits</div>
        <div class="hover-stat-val text-success">${physical}</div>
      </div>
      <div class="hover-stat-item">
        <div class="hover-stat-label">Telecalling</div>
        <div class="hover-stat-val text-info">${telecalling}</div>
      </div>
      <div class="hover-stat-item">
        <div class="hover-stat-label">Weekly Visits</div>
        <div class="hover-stat-val text-warning">${weekly}</div>
      </div>
      <div class="hover-stat-item">
        <div class="hover-stat-label">Leads Achieved</div>
        <div class="hover-stat-val text-primary">${leads}</div>
      </div>
      <div class="hover-stat-item">
        <div class="hover-stat-label">Marketing Activity</div>
        <div class="hover-stat-val text-danger">${marketing}</div>
      </div>
      <div class="hover-stat-item">
        <div class="hover-stat-label">DSA / Connectors</div>
        <div class="hover-stat-val">${dsa}</div>
      </div>
    </div>
    <div class="hover-insight-box">
      <strong><i class="bi bi-lightbulb-fill text-warning me-1"></i>Insight:</strong> ${escapeHtml(insight)}
    </div>
  `;

  const cardWidth = 320;
  const cardHeight = 280;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset || 0;
  const scrollY = window.scrollY || window.pageYOffset || 0;

  // Horizontal positioning: prefer right of cursor, flip to left if offscreen
  let clientX = e.clientX + 15;
  if (clientX + cardWidth > viewportWidth - 15) {
    clientX = Math.max(10, e.clientX - cardWidth - 15);
  }
  const x = clientX + scrollX;

  // Vertical positioning: clamp within visible viewport bounds
  let clientY = e.clientY - 60;
  if (clientY + cardHeight > viewportHeight - 15) {
    clientY = Math.max(10, viewportHeight - cardHeight - 15);
  }
  if (clientY < 10) {
    clientY = 10;
  }
  const y = clientY + scrollY;

  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
  card.classList.add("active");
}

function hideHoverCard() {
  if (hoverCard) {
    hoverCard.classList.remove("active");
  }
}

// --- Render Mini Table Records ---
function renderTable(records, columns) {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  hideHoverCard();

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No matching records found.</td></tr>`;
    return;
  }

  let html = "";
  records.forEach((r, idx) => {
    const sNo = r["S.No."] || (idx + 1);
    const leads = r["Leads Achieved"] || 0;
    html += `
      <tr data-sno="${sNo}" class="intern-row">
        <td class="fw-bold text-muted">${sNo}</td>
        <td class="fw-bold text-truncate" style="max-width: 130px;" title="${escapeHtml(r["Intern Name"] || "")}">
          ${escapeHtml(r["Intern Name"] || "")}
        </td>
        <td class="text-truncate" style="max-width: 110px;" title="${escapeHtml(r["Branch"] || "")}">
          <span class="badge bg-light text-dark border">${escapeHtml(r["Branch"] || "")}</span>
        </td>
        <td class="text-center fw-bold text-primary">${leads}</td>
        <td class="text-end text-nowrap actions-cell" onmouseenter="event.stopPropagation(); hideHoverCard();" onmousemove="event.stopPropagation(); hideHoverCard();">
          <div class="d-inline-flex align-items-center gap-1">
            <button class="btn-action-edit" onclick="event.stopPropagation(); openEditModal(${sNo})" onmouseenter="event.stopPropagation(); hideHoverCard();" onmousemove="event.stopPropagation(); hideHoverCard();" title="Edit Record">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn-action-delete" onclick="event.stopPropagation(); confirmDelete(${sNo})" onmouseenter="event.stopPropagation(); hideHoverCard();" onmousemove="event.stopPropagation(); hideHoverCard();" title="Delete Record">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Attach hover card listeners
  const rows = tbody.querySelectorAll(".intern-row");
  rows.forEach((row, i) => {
    const record = records[i];
    row.addEventListener("mouseenter", (e) => {
      if (e.target.closest && (e.target.closest('.actions-cell') || e.target.closest('.btn-action-edit') || e.target.closest('.btn-action-delete'))) {
        hideHoverCard();
        return;
      }
      showHoverCard(e, record);
    });
    row.addEventListener("mousemove", (e) => {
      if (e.target.closest && (e.target.closest('.actions-cell') || e.target.closest('.btn-action-edit') || e.target.closest('.btn-action-delete'))) {
        hideHoverCard();
        return;
      }
      showHoverCard(e, record);
    });
    row.addEventListener("mouseleave", hideHoverCard);
  });
}

// --- Populate Modal Form Fields Dynamically ---
function populateModalForms(columns) {
  if (!columns || columns.length === 0) return;

  // Add Form
  const addContainer = document.getElementById("addFormFields");
  if (addContainer && addContainer.children.length === 0) {
    let addHtml = "";
    columns.forEach(col => {
      if (col === "S.No.") return; // Exclude S.No.

      const isNumeric = col.includes("Visits") || col.includes("Calling") || col.includes("Connectors") || col.includes("Builders") || col.includes("Leads") || col.includes("Activity");
      const type = isNumeric ? "number" : "text";

      addHtml += `
        <div class="col-md-6">
          <label class="form-label">${col} ${col === 'Intern Name' ? '<span class="text-danger">*</span>' : ''}</label>
          <input type="${type}" class="form-control" name="${col}" ${isNumeric ? 'min="0" value="0"' : ''} ${col === 'Intern Name' ? 'required' : ''}>
        </div>
      `;
    });
    addContainer.innerHTML = addHtml;
  }
}

// --- Event Listeners Initialization ---
function initEventListeners() {
  // Search Input Debouncing
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetchDashboardData();
      }, 200);
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSortBy = e.target.value;
      fetchDashboardData();
    });
  }

  // Sort Order Toggle Button
  const sortOrderBtn = document.getElementById("sortOrderBtn");
  if (sortOrderBtn) {
    sortOrderBtn.addEventListener("click", () => {
      currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
      const icon = document.getElementById("sortOrderIcon");
      if (icon) {
        icon.className = currentSortOrder === "asc" ? "bi bi-sort-down" : "bi bi-sort-up";
      }
      fetchDashboardData();
    });
  }

  // Add Intern Form Submit
  const addForm = document.getElementById("addInternForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);
      const payload = {};
      formData.forEach((val, key) => {
        payload[key] = val;
      });

      const warningAlert = document.getElementById("addWarningAlert");
      const warningText = document.getElementById("addWarningText");
      if (warningAlert) warningAlert.classList.add("d-none");

      try {
        const res = await fetch("/intern", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok && result.status === "success") {
          const modalEl = document.getElementById("addInternModal");
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
          addForm.reset();
          showToast(result.message || "Record added successfully!");
        } else {
          if (warningAlert && warningText) {
            warningText.textContent = result.detail || "Failed to add record.";
            warningAlert.classList.remove("d-none");
          }
        }
      } catch (err) {
        console.error("Error submitting add form:", err);
      }
    });
  }

  // Edit Intern Form Submit
  const editForm = document.getElementById("editInternForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sNo = document.getElementById("editSNoInput")?.value;
      if (!sNo) return;

      const formData = new FormData(editForm);
      const payload = {};
      formData.forEach((val, key) => {
        payload[key] = val;
      });

      try {
        const res = await fetch(`/intern/${sNo}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok && result.status === "success") {
          const modalEl = document.getElementById("editInternModal");
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
          showToast(result.message || "Record updated successfully!");
        } else {
          alert(result.detail || "Failed to update record.");
        }
      } catch (err) {
        console.error("Error submitting edit form:", err);
      }
    });
  }
}

// --- Open Edit Modal Pre-filled ---
function openEditModal(sNo) {
  if (!currentDashboardData || !currentDashboardData.records) return;

  const record = currentDashboardData.records.find(r => r["S.No."] == sNo);
  if (!record) return;

  const editSNoInput = document.getElementById("editSNoInput");
  if (editSNoInput) editSNoInput.value = sNo;

  const editContainer = document.getElementById("editFormFields");
  if (!editContainer) return;

  let editHtml = "";
  currentDashboardData.columns.forEach(col => {
    if (col === "S.No.") return;

    const val = record[col] !== undefined ? record[col] : "";
    const isNumeric = col.includes("Visits") || col.includes("Calling") || col.includes("Connectors") || col.includes("Builders") || col.includes("Leads") || col.includes("Activity");
    const type = isNumeric ? "number" : "text";

    editHtml += `
      <div class="col-md-6">
        <label class="form-label">${col}</label>
        <input type="${type}" class="form-control" name="${col}" value="${escapeHtml(String(val))}" ${isNumeric ? 'min="0"' : ''} ${col === 'Intern Name' ? 'required' : ''}>
      </div>
    `;
  });

  editContainer.innerHTML = editHtml;

  const modalEl = document.getElementById("editInternModal");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// --- Confirm Delete Record ---
async function confirmDelete(sNo) {
  if (!confirm(`Are you sure you want to delete record #${sNo}?`)) return;

  try {
    const res = await fetch(`/intern/${sNo}`, { method: "DELETE" });
    const result = await res.json();
    if (res.ok && result.status === "success") {
      showToast(result.message || `Record #${sNo} deleted.`);
    } else {
      alert(result.detail || "Failed to delete record.");
    }
  } catch (err) {
    console.error("Error deleting record:", err);
  }
}

// --- Notification Toast Utility ---
function showToast(message) {
  const toastEl = document.getElementById("liveToast");
  const toastMsg = document.getElementById("toastMessage");
  if (toastEl && toastMsg) {
    toastMsg.textContent = message;
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
  }
}

// --- Helper: HTML Escape ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
