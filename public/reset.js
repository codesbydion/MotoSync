const API_BASE = window.location.protocol === "file:"
  ? "http://127.0.0.1:5001/api"
  : "/api";

function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

// Test connection on load
fetch(`${API_BASE}/auth/test-connection?t=${Date.now()}`)
  .then(() => console.log("Backend connection successful"))
  .catch(err => {
    console.error("Backend connection failed:", err);
    showToast("Error: Cannot connect to server. Is 'node server.js' running?", "red");
  });

function showToast(message, color = "green") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.style.backgroundColor = color;
  toast.className = "show";

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

const forgotForm = document.getElementById("forgotForm");
const resetForm = document.getElementById("resetForm");
const resetTitle = document.getElementById("resetTitle");
const tokenHint = document.getElementById("tokenHint");

const query = new URLSearchParams(window.location.search);
const token = (query.get("token") || "").trim();

if (token) {
  if (forgotForm) forgotForm.style.display = "none";
  if (resetForm) resetForm.style.display = "block";
  if (resetTitle) resetTitle.textContent = "Set New Password";
  if (tokenHint) tokenHint.style.display = "block";
} else {
  if (forgotForm) forgotForm.style.display = "block";
  if (resetForm) resetForm.style.display = "none";
  if (resetTitle) resetTitle.textContent = "Forgot Password";
  if (tokenHint) tokenHint.style.display = "none";
}

if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const identifier = document.getElementById("identifier").value.trim();
    if (!identifier) {
      showToast("Please enter email or username", "red");
      return;
    }

    const payload = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : { identifier };

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.message || "Request failed", "red");
        return;
      }

      showToast(data.message || "If the account exists, a reset link has been sent.", "green");

      if (data.devResetToken) {
        const nextUrl = `${window.location.pathname}?token=${encodeURIComponent(data.devResetToken)}`;
        setTimeout(() => {
          window.location.href = nextUrl;
        }, 900);
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Ensure backend is running.", "red");
    }
  });
}

if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!token) {
      showToast("Missing reset token. Use the link from your email.", "red");
      return;
    }

    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmNewPassword").value.trim();

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "red");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      showToast("Use 8+ chars with upper, lower, number, and symbol", "red");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(data.message || "Reset failed", "red");
        return;
      }

      showToast("Password changed successfully!", "green");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (error) {
      console.error(error);
      showToast("Network error. Ensure backend is running.", "red");
    }
  });
}
