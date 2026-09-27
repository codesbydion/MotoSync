const API_BASE = window.location.protocol === "file:"
  ? "http://127.0.0.1:5001/api"
  : "/api";

console.log("Register script loaded. API_BASE:", API_BASE);

function isStrongPassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

// Test connection on load
fetch(`${API_BASE}/auth/test-connection?t=${Date.now()}`)
  .then(() => console.log("Backend connection successful"))
  .catch(err => {
    console.error("Backend connection failed:", err);
    // Don't alert yet, just log it. The user will see error on submit.
  });

const registerForm = document.getElementById("registerForm");

if (!registerForm) {
  console.error("Register form not found!");
} else {
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Register form submitted..."); // Debug log

  // Helper to safely get values
  const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  const getRawVal = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };

  const username = getVal("username");
  const fullname = getVal("fullname");
  const email = getVal("email");
  const phone = getVal("phone");
  const password = getRawVal("password");
  const confirmPassword = getRawVal("confirmPassword");
  const address = getVal("address");
  const gender = document.querySelector('input[name="gender"]:checked')?.value || "";

  // Vehicle details
  const vehicleBrand = getVal("vehicleBrand");
  const vehicleModel = getVal("vehicleModel");
  const vehicleNumber = getVal("vehicleNumber");
  const vehicleYearRaw = getVal("vehicleYear");
  const fuelType = getRawVal("fuelType");
  const vehicleType = getRawVal("vehicleType");

  const vehicleYear = Number.parseInt(vehicleYearRaw, 10);
  const currentYear = new Date().getFullYear();
  const vehicleYearValid = Number.isFinite(vehicleYear) && vehicleYear >= 1900 && vehicleYear <= currentYear + 1;

  // Validation
  if (!username || !fullname || !email || !password) {
    console.warn("Validation failed: Missing required fields");
    showMessage("Please fill in all required fields", "error");
    return;
  }

  if (password !== confirmPassword) {
    console.warn("Validation failed: Passwords mismatch");
    showMessage("Passwords do not match", "error");
    return;
  }

  if (!isStrongPassword(password)) {
    console.warn("Validation failed: Weak password");
    showMessage("Password must have 8+ chars with upper, lower, number, and symbol", "error");
    return;
  }

  if (username.length < 5 || username.length > 12) {
    console.warn("Validation failed: Username length invalid");
    showMessage("Username must be 5-12 characters long", "error");
    return;
  }

  const requestData = {
    username,
    fullname,
    email,
    password,
    phoneNo: phone, // Backward-compat for older servers
    phone: phone, // Server expects `phone`
    address,
    gender
  };

  // Add vehicle if provided
  if (vehicleBrand || vehicleModel || vehicleNumber || vehicleType) {
    requestData.vehicle = {
      brand: vehicleBrand || "",
      model: vehicleModel || "",
      number: vehicleNumber || "",
      year: vehicleYearValid ? vehicleYear : undefined,
      fuel: fuelType || "",
      type: vehicleType || ""
    };
  }

  try {
    console.log("Sending registration data:", requestData);
    showMessage("Processing registration...", "info");
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("Registration successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      console.error("Registration failed:", data);
      showMessage(data.message || "Registration failed", "error");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Network Error: " + error.message + "\n\nEnsure backend is running on port 5001.");
    showMessage("Network error. Ensure backend is running on port 5001.", "error");
  }
});
}

// Helper to safely show messages even if ui.js fails
function showMessage(msg, type) {
  console.log(`Displaying message: ${msg} (${type})`);
  if (typeof showToast === "function") {
    showToast(msg, type);
  } else {
    alert(msg);
  }
}
