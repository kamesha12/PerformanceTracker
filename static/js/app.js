/* Enterprise Performance Tracker Dashboard JS */

// Global State
let ws = null;
let currentTheme = localStorage.getItem("app_theme") || "dark";
let currentDashboardData = null;
let currentSortBy = "";
let currentSortOrder = "asc";
let searchDebounceTimer = null;
let hoverCard = null;

// Always clear old cached column settings if present
localStorage.removeItem("visible_columns");

// Default Visible Columns (Clean 5-Column View for Max Spacing & Typography)
const defaultColumns = ["S.No.", "Intern Name", "Branch", "Leads Achieved", "Actions"];
let visibleColumns = ["S.No.", "Intern Name", "Branch", "Leads Achieved", "Actions"];

// Color Palettes for Light and Dark Modes
const chartPalettes = {
  dark: {
    paperBg: '#1e293b',
    plotBg: '#1e293b',
    fontColor: '#94a3b8',
    gridColor: '#334155',
    barColors: ['#0078d4', '#0284c7', '#06b6d4', '#0ea5e9', '#38bdf8', '#60a5fa'],
    primaryColors: ['#0078d4', '#107c41', '#d13438', '#ffb900', '#881798', '#00cc6a', '#e3008c']
  },
  light: {
    paperBg: '#ffffff',
    plotBg: '#ffffff',
    fontColor: '#475569',
    gridColor: '#f1f5f9',
    barColors: ['#0078d4', '#0284c7', '#06b6d4', '#0ea5e9', '#38bdf8', '#60a5fa'],
    primaryColors: ['#0078d4', '#107c41', '#d13438', '#ffb900', '#881798', '#00cc6a', '#e3008c']
  }
};

// Initialize Application on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded. Initializing application...");
  initTheme();
  initColumnConfigurator();
  initWebSocket();
  fetchDashboardData();
  initEventListeners();
});

// --- Theme Management ---
function initTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon();

  const toggleBtn = document.getElementById("themeToggleBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", currentTheme);
      localStorage.setItem("app_theme", currentTheme);
      updateThemeIcon();

      if (currentDashboardData && currentDashboardData.charts) {
        renderCharts(currentDashboardData.charts);
      }
    });
  }
}

function updateThemeIcon() {
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");
  if (icon && text) {
    if (currentTheme === "dark") {
      icon.className = "bi bi-sun-fill text-warning";
      text.textContent = "Light Mode";
    } else {
      icon.className = "bi bi-moon-stars-fill text-primary";
      text.textContent = "Dark Mode";
    }
  }
}

// --- Column Configurator Initialization ---
function initColumnConfigurator() {
  const menu = document.getElementById("columnConfigMenu");
  if (!menu) return;

  const colCheckboxes = menu.querySelectorAll(".col-toggle");
  colCheckboxes.forEach(cb => {
    const colVal = cb.value;
    cb.checked = visibleColumns.includes(colVal);

    cb.addEventListener("change", () => {
      const allCols = [
        "S.No.", "Intern Name", "Branch", "Physical Visits",
        "Telecalling", "DSA/Connectors", "Promoters/Builders", "Weekly Visits",
        "Leads Achieved", "Marketing Activity", "Actions"
      ];

      const newVisible = [];
      allCols.forEach(col => {
        const el = menu.querySelector(`input[value="${col}"]`);
        if (el && el.checked) {
          newVisible.push(col);
        }
      });

      visibleColumns = newVisible.length > 0 ? newVisible : [...defaultColumns];
      if (currentDashboardData) {
        renderTable(currentDashboardData.records, currentDashboardData.columns);
      }
    });
  });
}

// --- WebSocket Real-Time Connection ---
function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("WebSocket connected cleanly to server.");
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("WebSocket message received:", msg.event);

      if (msg.event === "excel_updated" && msg.data) {
        currentDashboardData = msg.data;
        updateUI(msg.data);
        showToast(msg.message || "Real-time updates synchronized.");
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
    }
  };

  ws.onclose = () => {
    console.warn("WebSocket closed. Attempting reconnect in 3s...");
    setTimeout(initWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
}

// --- Fetch Dashboard Payload via REST API ---
async function fetchDashboardData() {
  const searchInput = document.getElementById("searchInput");
  const searchQuery = searchInput ? searchInput.value : "";

  const params = new URLSearchParams({
    search: searchQuery,
    sort_by: currentSortBy,
    sort_order: currentSortOrder
  });

  try {
    const res = await fetch(`/dashboard?${params.toString()}`);
    const result = await res.json();

    if (result.status === "success" && result.data) {
      currentDashboardData = result.data;
      updateUI(result.data);
    } else {
      console.error("API returned unsuccessful result:", result);
    }
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
  }
}

// --- Update UI Components ---
function updateUI(data) {
  console.log("updateUI received data:", data);
  if (!data) return;

  try {
    renderSummaryCards(data.summary);
  } catch (e) {
    console.error("Error in renderSummaryCards:", e);
  }

  try {
    renderCharts(data.charts);
  } catch (e) {
    console.error("Error in renderCharts:", e);
  }

  try {
    renderTable(data.records, data.columns);
  } catch (e) {
    console.error("Error in renderTable:", e);
  }

  try {
    populateModalForms(data.columns);
  } catch (e) {
    console.error("Error in populateModalForms:", e);
  }
}

// --- Render Executive Summary KPI Cards ---
function renderSummaryCards(summary) {
  if (!summary) return;

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
  if (!charts) {
    console.warn("renderCharts: No charts data received.");
    return;
  }

  if (typeof Plotly === "undefined") {
    console.error("Plotly library is not defined!");
    return;
  }

  const p = chartPalettes[currentTheme] || chartPalettes.dark;

  const plotlyConfig = {
    responsive: true,
    displayModeBar: 'hover',
    displaylogo: false,
    scrollZoom: false
  };

  // 1. Donut Chart: Onboarding / Leads Achieved
  try {
    const donutEl = document.getElementById('donutChart');
    if (donutEl && charts.donut_leads && charts.donut_leads.length > 0) {
      const labels = charts.donut_leads.map(d => d.labels || d.name || d.names || "N/A");
      const values = charts.donut_leads.map(d => d.values !== undefined ? d.values : d.value || 0);
      const customData = charts.donut_leads.map(d => d.percentage || 0);

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
        margin: { t: 20, b: 20, l: 20, r: 20 },
        paper_bgcolor: p.paperBg,
        plot_bgcolor: p.plotBg,
        font: { color: p.fontColor, family: 'Segoe UI, system-ui, sans-serif' },
        showlegend: true,
        legend: { orientation: 'h', y: -0.15 },
        dragmode: false
      };

      Plotly.react('donutChart', [donutTrace], donutLayout, plotlyConfig);
    }
  } catch (err) {
    console.error("Error rendering donutChart:", err);
  }

  // 2. Horizontal Bar Chart: Telecalling
  try {
    const teleEl = document.getElementById('barChartTelecalling');
    if (teleEl && charts.bar_telecalling && charts.bar_telecalling.length > 0) {
      const names = charts.bar_telecalling.map(d => d.names || d.name || "N/A");
      const values = charts.bar_telecalling.map(d => d.values !== undefined ? d.values : d.count || d.value || 0);

      const barTrace = {
        y: names,
        x: values,
        type: 'bar',
        orientation: 'h',
        marker: {
          color: p.barColors[0],
          line: { color: p.barColors[1], width: 1 }
        },
        hovertemplate: '<b>%{y}</b><br>Telecalls: %{x}<extra></extra>'
      };

      const barLayout = {
        margin: { t: 20, b: 35, l: 110, r: 20 },
        paper_bgcolor: p.paperBg,
        plot_bgcolor: p.plotBg,
        font: { color: p.fontColor, family: 'Segoe UI, system-ui, sans-serif' },
        xaxis: { gridcolor: p.gridColor, title: 'Total Calls' },
        yaxis: { gridcolor: p.gridColor, autorange: 'reversed' },
        dragmode: false
      };

      Plotly.react('barChartTelecalling', [barTrace], barLayout, plotlyConfig);
    }
  } catch (err) {
    console.error("Error rendering barChartTelecalling:", err);
  }

  // 3. Line Chart: Physical Visits
  try {
    const physEl = document.getElementById('lineChartPhysical');
    if (physEl && charts.line_physical_visits && charts.line_physical_visits.length > 0) {
      const names = charts.line_physical_visits.map(d => d.names || d.name || "N/A");
      const values = charts.line_physical_visits.map(d => d.values !== undefined ? d.values : d.visits || d.value || 0);

      const lineTrace = {
        x: names,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: p.primaryColors[1], width: 3, shape: 'spline' },
        marker: { size: 8, color: p.primaryColors[1] },
        hovertemplate: '<b>%{x}</b><br>Physical Visits: %{y}<extra></extra>'
      };

      const lineLayout = {
        margin: { t: 20, b: 45, l: 40, r: 20 },
        paper_bgcolor: p.paperBg,
        plot_bgcolor: p.plotBg,
        font: { color: p.fontColor, family: 'Segoe UI, system-ui, sans-serif' },
        xaxis: { gridcolor: p.gridColor, tickangle: -20 },
        yaxis: { gridcolor: p.gridColor, title: 'Visits' },
        dragmode: false
      };

      Plotly.react('lineChartPhysical', [lineTrace], lineLayout, plotlyConfig);
    }
  } catch (err) {
    console.error("Error rendering lineChartPhysical:", err);
  }

  // 4. Vertical Bar Chart: Marketing Activity
  try {
    const mktEl = document.getElementById('barChartMarketing');
    if (mktEl && charts.bar_marketing && charts.bar_marketing.length > 0) {
      const names = charts.bar_marketing.map(d => d.names || d.name || "N/A");
      const values = charts.bar_marketing.map(d => d.values !== undefined ? d.values : d.count || d.value || 0);

      const vertBarTrace = {
        x: names,
        y: values,
        type: 'bar',
        marker: {
          color: p.primaryColors[2]
        },
        hovertemplate: '<b>%{x}</b><br>Marketing Activity: %{y}<extra></extra>'
      };

      const vertBarLayout = {
        margin: { t: 20, b: 45, l: 40, r: 20 },
        paper_bgcolor: p.paperBg,
        plot_bgcolor: p.plotBg,
        font: { color: p.fontColor, family: 'Segoe UI, system-ui, sans-serif' },
        xaxis: { gridcolor: p.gridColor, tickangle: -20 },
        yaxis: { gridcolor: p.gridColor, title: 'Activities' },
        dragmode: false
      };

      Plotly.react('barChartMarketing', [vertBarTrace], vertBarLayout, plotlyConfig);
    }
  } catch (err) {
    console.error("Error rendering barChartMarketing:", err);
  }
}

// --- Smart Viewport-Clamped Hover Detail Card ---
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

  let clientX = e.clientX + 15;
  if (clientX + cardWidth > viewportWidth - 15) {
    clientX = Math.max(10, e.clientX - cardWidth - 15);
  }
  const x = clientX + scrollX;

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

// --- Dynamic Table Header Builder ---
function updateTableHeader() {
  const headerRow = document.getElementById("tableHeaderRow");
  if (!headerRow) return;

  const headerMap = {
    "S.No.": '<th class="text-center" style="width: 40px;">#</th>',
    "Intern Name": '<th class="text-start">Intern Name</th>',
    "Branch": '<th class="text-start">Branch</th>',
    "Physical Visits": '<th class="text-center">Physical</th>',
    "Telecalling": '<th class="text-center">Telecalls</th>',
    "DSA/Connectors": '<th class="text-center">DSA</th>',
    "Promoters/Builders": '<th class="text-center">Promoters</th>',
    "Weekly Visits": '<th class="text-center">Weekly</th>',
    "Leads Achieved": '<th class="text-center" style="width: 80px;">Leads</th>',
    "Marketing Activity": '<th class="text-center">Marketing</th>',
    "Actions": '<th class="text-end" style="width: 80px;">Actions</th>'
  };

  let thHtml = "";
  if (!visibleColumns || visibleColumns.length === 0) {
    visibleColumns = [...defaultColumns];
  }

  visibleColumns.forEach(colKey => {
    if (headerMap[colKey]) thHtml += headerMap[colKey];
  });
  headerRow.innerHTML = thHtml;
}

// --- Render Table Records Dynamically ---
function renderTable(records, columns) {
  console.log("renderTable called with records count:", records ? records.length : 0);
  const tbody = document.getElementById("tableBody");
  if (!tbody) {
    console.error("tableBody element not found!");
    return;
  }

  hideHoverCard();

  if (!visibleColumns || visibleColumns.length === 0) {
    visibleColumns = [...defaultColumns];
  }

  updateTableHeader();

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" class="text-center text-muted py-4">No matching records found.</td></tr>`;
    return;
  }

  let html = "";
  records.forEach((r, idx) => {
    const sNo = r["S.No."] || (idx + 1);

    html += `<tr data-sno="${sNo}" class="intern-row">`;

    visibleColumns.forEach(colKey => {
      if (colKey === "S.No.") {
        html += `<td class="text-center fw-bold text-muted" style="width: 40px;">${sNo}</td>`;
      } else if (colKey === "Intern Name") {
        html += `
          <td class="text-start intern-name-cell" title="${escapeHtml(r["Intern Name"] || "")}">
            ${escapeHtml(r["Intern Name"] || "")}
          </td>`;
      } else if (colKey === "Branch") {
        html += `
          <td class="text-start branch-badge-cell" title="${escapeHtml(r["Branch"] || "")}">
            <span class="badge bg-light text-dark border px-2 py-1">${escapeHtml(r["Branch"] || "")}</span>
          </td>`;
      } else if (colKey === "Actions") {
        html += `
          <td class="text-end text-nowrap actions-cell" style="width: 80px;" onmouseenter="event.stopPropagation(); hideHoverCard();" onmousemove="event.stopPropagation(); hideHoverCard();">
            <div class="d-inline-flex align-items-center justify-content-end gap-1">
              <button class="btn-action-edit" onclick="event.stopPropagation(); openEditModal(${sNo})" onmouseenter="event.stopPropagation(); hideHoverCard();" onmousemove="event.stopPropagation(); hideHoverCard();" title="Edit Record">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button class="btn-action-delete" onclick="event.stopPropagation(); confirmDelete(${sNo})" onmouseenter="event.stopPropagation(); hideHoverCard();" onmousemove="event.stopPropagation(); hideHoverCard();" title="Delete Record">
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
          </td>`;
      } else {
        const val = r[colKey] !== undefined ? r[colKey] : 0;
        const isCenter = typeof val === 'number' || !isNaN(val);
        html += `<td class="${isCenter ? 'text-center fw-semibold' : 'text-start'}">${escapeHtml(String(val))}</td>`;
      }
    });

    html += `</tr>`;
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

  const addContainer = document.getElementById("addFormFields");
  if (addContainer && addContainer.children.length === 0) {
    let addHtml = "";
    columns.forEach(col => {
      if (col === "S.No.") return;

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
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetchDashboardData();
      }, 200);
    });
  }

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSortBy = e.target.value;
      fetchDashboardData();
    });
  }

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
