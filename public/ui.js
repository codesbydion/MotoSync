// Common UI utilities

let toastTimeout;

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  console.log(`showToast called: ${message} (${type})`);
  if (!toast) {
    console.error("Toast element missing, falling back to alert");
    alert(message);
    return;
  }

  if (toastTimeout) clearTimeout(toastTimeout);

  toast.textContent = message;
  
  // Force visibility styles to ensure the user sees the message
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "8px";
  toast.style.color = "#fff";
  toast.style.zIndex = "10000";
  toast.style.minWidth = "250px";
  toast.style.textAlign = "center";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  toast.style.visibility = "visible";
  toast.style.opacity = "1";
  toast.style.backgroundColor = type === "error" ? "#ef4444" : (type === "success" ? "#22c55e" : "#3b82f6");
  
  toast.className = `toast ${type}`;
  toast.style.display = "block";

  toastTimeout = setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("motosyncToken");
  localStorage.removeItem("user");
  localStorage.removeItem("motosyncUser");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRole");
  window.location.href = "index.html";
}

// Update navbar based on login status
function updateNavbar() {
  const token = localStorage.getItem("token") || localStorage.getItem("motosyncToken");
  const navLogin = document.getElementById("navLogin");
  const navRegister = document.getElementById("navRegister");
  const navLogout = document.getElementById("navLogout");
  const profileIconContainer = document.getElementById("profileIconContainer");

  if (token) {
    // User is logged in
    if (navLogin) navLogin.style.display = "none";
    if (navRegister) navRegister.style.display = "none";
    if (navLogout) navLogout.style.display = "inline-block";
    if (profileIconContainer) profileIconContainer.style.display = "inline-block";
    
    // Optionally update profile icon if user data exists
    const user = JSON.parse(localStorage.getItem("user") || localStorage.getItem("motosyncUser") || '{}');
    const adminToken = localStorage.getItem("adminToken");
    const profileIconLink = document.getElementById("profileIconLink");

    if (profileIconLink) {
      if (adminToken || (user && (user.role === 'admin' || user.role === 'super_admin'))) {
        profileIconLink.href = "admin dashboard.html";
        profileIconLink.title = "Admin Dashboard";
      } else {
        profileIconLink.href = "user-dashboard.html";
        profileIconLink.title = "My Account";
      }
    }

    if (user && user.profileImg && profileIconContainer) {
      const img = profileIconContainer.querySelector('img');
      if (img) img.src = user.profileImg;
    }
  } else {
    // User is not logged in
    if (navLogin) navLogin.style.display = "inline-block";
    if (navRegister) navRegister.style.display = "inline-block";
    if (navLogout) navLogout.style.display = "none";
    if (profileIconContainer) profileIconContainer.style.display = "none";
  }
}

// Check if user is logged in and show/hide logout button
function checkAuthStatus() {
  const token = localStorage.getItem("token") || localStorage.getItem("motosyncToken");
  const navLogout = document.getElementById("navLogout");

  if (navLogout) {
    if (token) {
      navLogout.style.display = "inline-block";
    } else {
      navLogout.style.display = "none";
    }
  }
}

function initPasswordToggles() {
  const wraps = document.querySelectorAll(".password-wrap");
  wraps.forEach((wrap) => {
    const input = wrap.querySelector('input[type="password"], input[type="text"]');
    const button = wrap.querySelector(".password-toggle");
    if (!input || !button) return;

    const setVisible = (visible) => {
      wrap.dataset.visible = visible ? "true" : "false";
      input.type = visible ? "text" : "password";
      button.setAttribute("aria-pressed", visible ? "true" : "false");
      button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    };

    // Default state
    setVisible(input.type === "text");

    button.addEventListener("click", () => {
      const nextVisible = !(wrap.dataset.visible === "true");
      setVisible(nextVisible);
      input.focus();
    });
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  checkAuthStatus();
  initPasswordToggles();
});
