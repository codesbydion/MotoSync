const API_BASE = window.location.protocol === "file:"
  ? "http://127.0.0.1:5001/api"
  : "/api";

console.log("Auth script loaded. API_BASE:", API_BASE);

// Test connection on load
fetch(`${API_BASE}/auth/test-connection?t=${Date.now()}`)
  .then(() => console.log("Backend connection successful"))
  .catch(err => {
    console.error("Backend connection failed:", err);
    const msg = document.getElementById("msg");
    if (msg) {
      msg.textContent = "Error: Cannot connect to server. Is 'node server.js' running?";
      msg.style.color = "orange";
    }
  });

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "Please fill in all fields";
    msg.style.color = "red";
    return;
  }

  msg.textContent = "Logging in...";
  msg.style.color = "blue";

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("motosyncToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("user", JSON.stringify(data.user || {}));

      msg.textContent = "Login successful! Redirecting...";
      msg.style.color = "green";

      // Redirect based on role
      setTimeout(() => {
        if (data.role === "admin" || data.role === "super_admin") {
          window.location.href = "adminlogin.html";
        } else {
          window.location.href = "user-dashboard.html";
        }
      }, 1000);
    } else {
      msg.textContent = data.message || "Login failed";
      msg.style.color = "red";
    }
  } catch (error) {
    console.error("Login error:", error);
    msg.textContent = "Network error. Ensure backend is running on port 5001.";
    msg.style.color = "red";
  }
});
