const adminToken = localStorage.getItem("adminToken");

if (!adminToken) {
  window.location.href = "adminlogin.html";
}

const API_BASE = window.location.protocol === "file:"
  ? "http://127.0.0.1:5001/api"
  : "/api";

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  const value = String(role || "").toLowerCase().replace(/\s+/g, "_");
  if (value === "superadmin") return "super_admin";
  return value || "admin";
}

function getStoredAdminRole() {
  const roleFromStorage = localStorage.getItem("adminRole");
  if (roleFromStorage) return normalizeRole(roleFromStorage);
  const roleFromToken = decodeJwtPayload(adminToken)?.role;
  return normalizeRole(roleFromToken || "admin");
}

const adminRole = getStoredAdminRole();
const isSuperAdmin = adminRole === "super_admin";
const currentAdminId = decodeJwtPayload(adminToken)?.id || null;

const tableBody = document.querySelector("#userTable tbody");
const adminTableBody = document.querySelector("#adminTable tbody");
const searchInput = document.getElementById("searchUser");
const addUserBtn = document.getElementById("addUser");
const addAdminBtn = document.getElementById("addAdmin");
const adminRoleBadge = document.getElementById("adminRoleBadge");
const adminsSection = document.querySelector(".section-admins");
const toast = document.getElementById("dashboard-toast");

const serviceTypeBody = document.querySelector("#serviceTypeTable tbody");
const serviceProviderBody = document.querySelector("#serviceProviderTable tbody");
const alertBody = document.querySelector("#alertTable tbody");
const addServiceTypeBtn = document.getElementById("addServiceType");
const addServiceProviderBtn = document.getElementById("addServiceProvider");
const runChecksBtn = document.getElementById("runChecks");

const statTotalUsers = document.getElementById("statTotalUsers");
const statTotalServices = document.getElementById("statTotalServices");
const statTotalRevenue = document.getElementById("statTotalRevenue");

function authHeaders(contentType = false) {
  const headers = { Authorization: `Bearer ${adminToken}` };
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

function showAdminToast(message, color = "green") {
  if (!toast) return;
  toast.textContent = message;
  toast.style.backgroundColor = color;
  toast.className = "show";

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

function applyRoleUI() {
  if (adminRoleBadge) {
    adminRoleBadge.textContent = `Role: ${adminRole === "super_admin" ? "Super Admin" : "Admin"}`;
  }

  if (!isSuperAdmin) {
    if (addAdminBtn) addAdminBtn.style.display = "none";
    if (addUserBtn) addUserBtn.style.display = "none";
    if (adminsSection) adminsSection.style.display = "none";
  }
}

async function loadStatistics() {
  try {
    const response = await fetch(`${API_BASE}/admin/statistics`, { headers: authHeaders() });
    const data = await response.json();

    if (!response.ok) {
      showAdminToast(data.message || "Failed to load statistics", "red");
      return;
    }

    if (statTotalUsers) statTotalUsers.textContent = data.totalUsers ?? 0;
    if (statTotalServices) statTotalServices.textContent = data.totalServices ?? 0;
    if (statTotalRevenue) statTotalRevenue.textContent = `${Number(data.totalRevenue ?? 0).toLocaleString("en-IN")}`;
  } catch (error) {
    console.error(error);
    showAdminToast("Server error loading statistics", "red");
  }
}

function formatVehicles(vehicles) {
  if (!vehicles || vehicles.length === 0) {
    return { count: "0", regs: "-", fuels: "-" };
  }

  const regs = vehicles.map((v) => v.registrationNo || "-").join(", ");
  const fuels = [...new Set(vehicles.map((v) => v.fuelType || "-").filter(Boolean))].join(", ");

  return { count: String(vehicles.length), regs: regs || "-", fuels: fuels || "-" };
}

async function loadUsers(filter = "") {
  try {
    const response = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
    const users = await response.json();

    if (!response.ok) {
      showAdminToast(users.message || "Failed to load users", "red");
      return;
    }

    const lowerFilter = filter.toLowerCase();
    const filteredUsers = users.filter((user) => {
      const vehicleRegs = (user.vehicles || []).map((v) => (v.registrationNo || "").toLowerCase()).join(" ");
      return (
        (user.fullname || "").toLowerCase().includes(lowerFilter) ||
        (user.username || "").toLowerCase().includes(lowerFilter) ||
        (user.email || "").toLowerCase().includes(lowerFilter) ||
        vehicleRegs.includes(lowerFilter)
      );
    });

    if (filteredUsers.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">No users found</td></tr>';
      return;
    }

    tableBody.innerHTML = "";

    filteredUsers.forEach((user) => {
      const vehicleSummary = formatVehicles(user.vehicles || []);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.fullname || "-"}</td>
        <td>${user.username || "-"}</td>
        <td>${user.email || "-"}</td>
        <td>${user.gender || "-"}</td>
        <td>${vehicleSummary.count}</td>
        <td>${vehicleSummary.regs}</td>
        <td>${vehicleSummary.fuels}</td>
        <td>
          <button class="action-btn edit-btn" onclick="editUser('${user._id}', '${(user.fullname || "").replace(/'/g, "\\'")}', '${(user.email || "").replace(/'/g, "\\'")}')">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteUser('${user._id}')">Remove</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function loadAdmins() {
  if (!adminTableBody) return;

  try {
    const response = await fetch(`${API_BASE}/admin/admins`, { headers: authHeaders() });
    const admins = await response.json();

    if (!response.ok) {
      if (!isSuperAdmin && response.status === 403) {
        adminTableBody.innerHTML = '<tr><td colspan="5">Visible to super admin only</td></tr>';
        return;
      }
      adminTableBody.innerHTML = '<tr><td colspan="5">Failed to load admins</td></tr>';
      return;
    }

    if (!Array.isArray(admins) || admins.length === 0) {
      adminTableBody.innerHTML = '<tr><td colspan="5">No admins found</td></tr>';
      return;
    }

    adminTableBody.innerHTML = "";
    admins.forEach((admin) => {
      const row = document.createElement("tr");
      const prettyRole = admin.role === "super_admin" ? "Super Admin" : "Admin";
      const canDelete = isSuperAdmin && admin.role === "admin" && String(admin._id) !== String(currentAdminId);
      const actionCell = canDelete
        ? `<button class="action-btn delete-btn" onclick="deleteAdmin('${admin._id}')">Remove</button>`
        : "-";
      row.innerHTML = `
        <td>${admin.fullname || "-"}</td>
        <td>${admin.username || "-"}</td>
        <td>${admin.email || "-"}</td>
        <td>${prettyRole}</td>
        <td>${actionCell}</td>
      `;
      adminTableBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    adminTableBody.innerHTML = '<tr><td colspan="5">Server error loading admins</td></tr>';
  }
}

async function deleteAdmin(adminId) {
  if (!isSuperAdmin) {
    showAdminToast("Only super admin can remove admins", "red");
    return;
  }

  if (!confirm("Remove this admin account?")) return;

  try {
    const response = await fetch(`${API_BASE}/admin/admins/${adminId}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showAdminToast(data.message || "Remove failed", "red");
      return;
    }

    showAdminToast("Admin removed successfully", "#ef4444");
    loadAdmins();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function deleteUser(userId) {
  if (!confirm("Delete this user and all related records?")) return;

  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showAdminToast(data.message || "Delete failed", "red");
      return;
    }

    showAdminToast("User removed successfully", "#ef4444");
    loadUsers(searchInput.value);
    loadStatistics();
    loadAlerts();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function editUser(userId, currentName = "", currentEmail = "") {
  const newName = prompt("Enter new full name:", currentName);
  if (newName === null) return;

  const newEmail = prompt("Enter new email:", currentEmail);
  if (newEmail === null) return;

  if (!newName.trim() || !newEmail.trim()) {
    showAdminToast("Name and email are required", "red");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify({
        fullname: newName.trim(),
        email: newEmail.trim().toLowerCase()
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showAdminToast(data.message || "Update failed", "#f59e0b");
      return;
    }

    showAdminToast("User updated", "#10b981");
    loadUsers(searchInput.value);
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function loadServiceTypes() {
  try {
    const response = await fetch(`${API_BASE}/admin/service-types`, { headers: authHeaders() });
    const types = await response.json();

    if (!response.ok) {
      showAdminToast(types.message || "Failed to load service types", "red");
      return;
    }

    if (!types.length) {
      serviceTypeBody.innerHTML = '<tr><td colspan="4">No service types found</td></tr>';
      return;
    }

    serviceTypeBody.innerHTML = "";

    types.forEach((type) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${type.name || "-"}</td>
        <td>${type.dueDays ?? "-"}</td>
        <td>${type.dueMileage ?? "-"}</td>
        <td>
          <button class="action-btn edit-btn" onclick="editServiceType('${type._id}', '${(type.name || "").replace(/'/g, "\\'")}', '${type.dueDays ?? ""}', '${type.dueMileage ?? ""}')">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteServiceType('${type._id}')">Delete</button>
        </td>
      `;
      serviceTypeBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function addServiceType() {
  const name = prompt("Service type name:");
  if (!name || !name.trim()) return;

  const dueDaysInput = prompt("Due in days (optional):", "");
  const dueMileageInput = prompt("Due mileage interval (optional):", "");

  const payload = {
    name: name.trim(),
    dueDays: dueDaysInput ? Number(dueDaysInput) : undefined,
    dueMileage: dueMileageInput ? Number(dueMileageInput) : undefined
  };

  try {
    const response = await fetch(`${API_BASE}/admin/service-types`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Failed to create service type", "red");
      return;
    }

    showAdminToast("Service type added", "#10b981");
    loadServiceTypes();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function editServiceType(id, currentName = "", currentDueDays = "", currentDueMileage = "") {
  const name = prompt("Service type name:", currentName);
  if (name === null || !name.trim()) return;

  const dueDaysInput = prompt("Due in days (optional):", String(currentDueDays || ""));
  if (dueDaysInput === null) return;

  const dueMileageInput = prompt("Due mileage interval (optional):", String(currentDueMileage || ""));
  if (dueMileageInput === null) return;

  const payload = {
    name: name.trim(),
    dueDays: dueDaysInput ? Number(dueDaysInput) : undefined,
    dueMileage: dueMileageInput ? Number(dueMileageInput) : undefined
  };

  try {
    const response = await fetch(`${API_BASE}/admin/service-types/${id}`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Failed to update service type", "red");
      return;
    }

    showAdminToast("Service type updated", "#10b981");
    loadServiceTypes();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function deleteServiceType(id) {
  if (!confirm("Delete this service type?")) return;

  try {
    const response = await fetch(`${API_BASE}/admin/service-types/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Failed to delete service type", "red");
      return;
    }

    showAdminToast("Service type deleted", "#ef4444");
    loadServiceTypes();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function loadServiceProviders() {
  try {
    const response = await fetch(`${API_BASE}/admin/service-providers`, { headers: authHeaders() });
    const providers = await response.json();

    if (!response.ok) {
      showAdminToast(providers.message || "Failed to load service providers", "red");
      return;
    }

    if (!Array.isArray(providers) || !providers.length) {
      serviceProviderBody.innerHTML = '<tr><td colspan="6">No providers found</td></tr>';
      return;
    }

    serviceProviderBody.innerHTML = "";

    providers.forEach((provider) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${provider.providerName || "-"}</td>
        <td>${provider.type || "Third Party"}</td>
        <td>${provider.address || "-"}</td>
        <td>${provider.contactNo || "-"}</td>
        <td>${provider.email || "-"}</td>
        <td>
          <button class="action-btn edit-btn" onclick="openProviderModal('${provider._id}', '${(provider.providerName || "").replace(/'/g, "\\'")}', '${(provider.address || "").replace(/'/g, "\\'")}', '${(provider.contactNo || "").replace(/'/g, "\\'")}', '${(provider.email || "").replace(/'/g, "\\'")}', '${(provider.type || "Third Party").replace(/'/g, "\\'")}')">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteServiceProvider('${provider._id}')">Delete</button>
        </td>
      `;
      serviceProviderBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

// Modal Logic for Service Providers
function openProviderModal(id = null, name = "", address = "", contact = "", email = "", type = "Third Party") {
  const modal = document.getElementById("providerModal");
  const title = document.getElementById("providerModalTitle");
  const form = document.getElementById("providerForm");

  document.getElementById("providerId").value = id || "";
  document.getElementById("providerName").value = name;
  document.getElementById("providerAddress").value = address;
  document.getElementById("providerContact").value = contact;
  document.getElementById("providerEmail").value = email;
  document.getElementById("providerType").value = type;

  title.textContent = id ? "Edit Service Provider" : "Add Service Provider";
  modal.classList.add("active");
}

function closeProviderModal() {
  document.getElementById("providerModal").classList.remove("active");
}

document.getElementById("providerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = document.getElementById("providerId").value;
  const providerName = document.getElementById("providerName").value.trim();
  const type = document.getElementById("providerType").value;
  const address = document.getElementById("providerAddress").value.trim();
  const contactNo = document.getElementById("providerContact").value.trim();
  const email = document.getElementById("providerEmail").value.trim();

  const payload = { providerName, type, address, contactNo, email };
  const method = id ? "PUT" : "POST";
  const url = id 
    ? `${API_BASE}/admin/service-providers/${id}`
    : `${API_BASE}/admin/service-providers`;

  try {
    const response = await fetch(url, {
      method: method,
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Operation failed", "red");
      return;
    }

    showAdminToast(id ? "Provider updated" : "Provider added", "#10b981");
    closeProviderModal();
    loadServiceProviders();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
});

async function deleteServiceProvider(id) {
  if (!confirm("Delete this service provider?")) return;

  try {
    const response = await fetch(`${API_BASE}/admin/service-providers/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Failed to delete provider", "red");
      return;
    }

    showAdminToast("Provider deleted", "#ef4444");
    loadServiceProviders();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

function formatVehicle(vehicle) {
  if (!vehicle) return "-";
  return `${vehicle.brand || ""} ${vehicle.model || ""} (${vehicle.registrationNo || "-"})`.trim();
}

async function loadAlerts() {
  try {
    const response = await fetch(`${API_BASE}/admin/alerts`, { headers: authHeaders() });
    const alerts = await response.json();

    if (!response.ok) {
      showAdminToast(alerts.message || "Failed to load alerts", "red");
      return;
    }

    if (!alerts.length) {
      alertBody.innerHTML = '<tr><td colspan="6">No alerts found</td></tr>';
      return;
    }

    alertBody.innerHTML = "";

    alerts.forEach((alert) => {
      const dueDate = alert.dueDate ? new Date(alert.dueDate).toLocaleDateString() : "-";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${alert.status || "-"}</td>
        <td>${formatVehicle(alert.vehicle)}</td>
        <td>${alert.serviceType?.name || "-"}</td>
        <td>${dueDate}</td>
        <td>${alert.dueMileage ?? "-"}</td>
        <td>
          ${alert.status === "open" ? `<button class="action-btn edit-btn" onclick="resolveAlert('${alert._id}')">Resolve</button>` : "-"}
        </td>
      `;
      alertBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function resolveAlert(id) {
  try {
    const response = await fetch(`${API_BASE}/admin/alerts/${id}/resolve`, {
      method: "PATCH",
      headers: authHeaders()
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Failed to resolve alert", "red");
      return;
    }

    showAdminToast("Alert resolved", "#10b981");
    loadAlerts();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

async function runMaintenanceChecks() {
  if (!confirm("Run maintenance checks for all vehicles? This will generate alerts and send emails to users.")) return;

  try {
    showAdminToast("Running checks...", "#3b82f6");
    const response = await fetch(`${API_BASE}/admin/maintenance/check`, {
      method: "POST",
      headers: authHeaders()
    });

    const data = await response.json();
    showAdminToast(data.message || "Checks complete", "#10b981");
    if (data.details) alert(data.details);
    loadAlerts(); // Refresh the table
  } catch (error) {
    console.error(error);
    showAdminToast("Error running checks", "red");
  }
}

async function addAdmin() {
  if (!isSuperAdmin) {
    showAdminToast("Only super admin can add admins", "red");
    return;
  }

  const fullname = prompt("Admin full name:");
  if (fullname === null || !fullname.trim()) return;

  const username = prompt("Admin username:");
  if (username === null || !username.trim()) return;

  const email = prompt("Admin email:");
  if (email === null || !email.trim()) return;

  const password = prompt("Admin password:");
  if (password === null || !password.trim()) return;

  const payload = {
    fullname: fullname.trim(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role: "admin"
  };

  const endpoints = [
    `${API_BASE}/admin/admins`,
    `${API_BASE}/auth/register-admin`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        showAdminToast("Admin added successfully", "#10b981");
        loadAdmins();
        return;
      }
    } catch (error) {
      console.error(error);
    }
  }

  showAdminToast("Failed to add admin. Verify backend endpoint/permissions.", "red");
}

async function addUser() {
  if (!isSuperAdmin) {
    showAdminToast("Only super admin can add users", "red");
    return;
  }

  const fullname = prompt("User full name:");
  if (fullname === null || !fullname.trim()) return;

  const username = prompt("Username:");
  if (username === null || !username.trim()) return;

  const email = prompt("User email:");
  if (email === null || !email.trim()) return;

  const password = prompt("User password:");
  if (password === null || !password.trim()) return;

  const payload = {
    fullname: fullname.trim(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim()
  };

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAdminToast(data.message || "Failed to add user", "red");
      return;
    }

    showAdminToast("User added successfully", "#10b981");
    loadUsers(searchInput?.value || "");
    loadStatistics();
  } catch (error) {
    console.error(error);
    showAdminToast("Server error", "red");
  }
}

function adminLogout() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRole");
  window.location.href = "adminlogin.html";
}

if (addUserBtn) {
  addUserBtn.addEventListener("click", addUser);
}

if (addAdminBtn) addAdminBtn.addEventListener("click", addAdmin);
if (addServiceTypeBtn) addServiceTypeBtn.addEventListener("click", addServiceType);
if (addServiceProviderBtn) addServiceProviderBtn.addEventListener("click", () => openProviderModal());
if (runChecksBtn) runChecksBtn.addEventListener("click", runMaintenanceChecks);

if (searchInput) {
  searchInput.addEventListener("input", () => {
    loadUsers(searchInput.value);
  });
}

applyRoleUI();
loadStatistics();
loadUsers();
loadAdmins();
loadServiceTypes();
loadServiceProviders();
loadAlerts();
