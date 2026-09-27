const API_BASE = window.location.protocol === "file:"
  ? "http://127.0.0.1:5001/api"
  : "/api";

console.log("Admin Auth script loaded. API_BASE:", API_BASE);

// Test connection on load
fetch(`${API_BASE}/auth/test-connection?t=${Date.now()}`)
  .then(() => console.log("Backend connection successful"))
  .catch(err => {
    console.error("Backend connection failed:", err);
    const msg = document.getElementById("loginMsg");
    if (msg) {
      msg.textContent = "Error: Cannot connect to server. Is 'node server.js' running?";
      msg.style.color = "orange";
    }
  });

async function goToDashboard() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPass").value.trim();
  const msg = document.getElementById("loginMsg");

  if (!email || !password) {
    msg.textContent = "Please fill in all fields";
    msg.style.color = "red";
    return;
  }

  msg.textContent = "Verifying credentials...";
  msg.style.color = "blue";

  try {
    const response = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("motosyncToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.admin));

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminRole", (data.admin && data.admin.role) ? data.admin.role : "admin");

      msg.textContent = "Login successful! Redirecting...";
      msg.style.color = "green";

      // Redirect to admin dashboard or reports
      setTimeout(() => {
        window.location.href = "admin dashboard.html";
      }, 1000);
    } else {
      msg.textContent = data.message || "Admin login failed";
      msg.style.color = "red";
    }
  } catch (error) {
    console.error("Admin login error:", error);
    msg.textContent = "Network error. Ensure backend is running on port 5001.";
    msg.style.color = "red";
  }
}
