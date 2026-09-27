/**
 * Cost Analytics Dashboard
 * Fetches and displays spending analysis
 */

let spendingChart = null;
let typeChart = null;

/**
 * Load analytics data and update dashboard
 */
async function loadAnalytics() {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("motosyncToken");
    if (!token) return;

    const response = await fetch(`${API_BASE}/analytics/overview`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Failed to load analytics:", response.statusText);
      return;
    }

    const data = await response.json();
    updateAnalyticsDashboard(data);
  } catch (error) {
    console.error("Error loading analytics:", error);
  }
}

/**
 * Update dashboard with analytics data
 */
function updateAnalyticsDashboard(data) {
  const { summary, monthlyBreakdown, typeBreakdown, yearlyBreakdown } = data;

  // Update summary stats
  document.getElementById("totalSpent").textContent = `₹${summary.totalCost}`;
  
  // Create charts
  createMonthlyChart(monthlyBreakdown);
  createTypeChart(typeBreakdown);
}

/**
 * Create monthly spending chart
 */
function createMonthlyChart(monthlyData) {
  const ctx = document.getElementById("spendingChart");
  if (!ctx) return;

  // Destroy existing chart
  if (spendingChart) {
    spendingChart.destroy();
  }

  const labels = monthlyData.map((m) => m.month);
  const costs = monthlyData.map((m) => m.cost);

  spendingChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Spending (₹)",
          data: costs,
          borderColor: "#1fb6ff",
          backgroundColor: "rgba(31, 182, 255, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: "#1fb6ff",
          pointBorderColor: "#fff",
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "var(--text)",
            font: { size: 14 }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "var(--muted-text)",
            callback: function (value) {
              return "₹" + value.toFixed(0);
            }
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)"
          }
        },
        x: {
          ticks: {
            color: "var(--muted-text)"
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)"
          }
        }
      }
    }
  });
}

/**
 * Create service type breakdown chart
 */
function createTypeChart(typeData) {
  const chartContainer = document.getElementById("typeChartContainer");
  if (!chartContainer) {
    // Create container if it doesn't exist
    const dashboardSection = document.getElementById("dashboard-section");
    if (dashboardSection) {
      const typeSection = document.createElement("div");
      typeSection.className = "content-section";
      typeSection.innerHTML = `
        <h3 class="section-title"><span>🏷️</span> Spending by Service Type</h3>
        <div style="position: relative; height: 300px; width: 100%;">
          <canvas id="typeChart"></canvas>
        </div>
      `;
      dashboardSection.appendChild(typeSection);
    }
  }

  const ctx = document.getElementById("typeChart");
  if (!ctx) return;

  if (typeChart) {
    typeChart.destroy();
  }

  const labels = typeData.map((t) => t.type);
  const costs = typeData.map((t) => t.cost);
  const colors = [
    "#1fb6ff",
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#f7b731",
    "#5f27cd",
    "#00d2d3",
    "#ff9ff3"
  ];

  typeChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: costs,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "var(--surface-soft)",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "var(--text)",
            font: { size: 13 },
            padding: 15
          }
        }
      }
    }
  });
}

/**
 * Load vehicle comparison analytics
 */
async function loadVehicleComparison() {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("motosyncToken");
    if (!token) return;

    const response = await fetch(`${API_BASE}/analytics/vehicle-comparison`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    displayVehicleComparison(data.vehicles);
  } catch (error) {
    console.error("Error loading vehicle comparison:", error);
  }
}

/**
 * Display vehicle cost comparison
 */
function displayVehicleComparison(vehicles) {
  if (vehicles.length === 0) return;

  const dashboardSection = document.getElementById("dashboard-section");
  if (!dashboardSection) return;

  // Check if comparison section already exists
  let comparisonSection = document.getElementById("vehicleComparisonSection");
  if (!comparisonSection) {
    comparisonSection = document.createElement("div");
    comparisonSection.id = "vehicleComparisonSection";
    comparisonSection.className = "content-section";
    comparisonSection.innerHTML = `
      <h3 class="section-title"><span>🚗</span> Vehicle Cost Comparison</h3>
      <div id="vehicleComparisonContainer" class="vehicle-grid"></div>
    `;
    dashboardSection.appendChild(comparisonSection);
  }

  const container = document.getElementById("vehicleComparisonContainer");
  container.innerHTML = vehicles
    .map(
      (v) => `
    <div class="vehicle-card">
      <div class="vehicle-header">
        <div>
          <div class="vehicle-name">${v.brand} ${v.model}</div>
          <div class="vehicle-reg">${v.registrationNo || "N/A"}</div>
        </div>
      </div>
      <div class="vehicle-details">
        <div class="detail-item">
          <div class="detail-label">Total Cost</div>
          <div class="detail-value">₹${v.totalCost.toFixed(2)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Records</div>
          <div class="detail-value">${v.recordCount}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Avg/Service</div>
          <div class="detail-value">₹${v.avgCostPerService.toFixed(2)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Mileage</div>
          <div class="detail-value">${v.mileage} km</div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/**
 * Export analytics as CSV
 */
async function exportAnalyticsCSV() {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("motosyncToken");
    if (!token) return;

    const response = await fetch(`${API_BASE}/analytics/recent-records?limit=500`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    const records = data.records;

    // Create CSV content
    let csv = "Date,Type,Vehicle,Cost,Source\n";
    records.forEach((r) => {
      const date = new Date(r.date).toLocaleDateString();
      csv += `"${date}","${r.type}","${r.vehicle}","${r.cost}","${r.source}"\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "motosync-analytics.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Analytics exported successfully");
  } catch (error) {
    console.error("Error exporting analytics:", error);
  }
}

// Load analytics when dashboard loads
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    loadAnalytics();
    loadVehicleComparison();
  }, 500);
});

// Reload analytics every 5 minutes
setInterval(() => {
  loadAnalytics();
  loadVehicleComparison();
}, 5 * 60 * 1000);
