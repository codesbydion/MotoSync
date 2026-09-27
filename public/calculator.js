let calcExpression = '';

function toggleUtility() {
  const u = document.getElementById('utilityDropdown');
  if (!u) return;
  u.style.display = u.style.display === 'block' ? 'none' : 'block';
}

function openCalculator() {
  document.getElementById("calculatorModal").classList.remove("hidden");
}

function closeCalculator() {
  document.getElementById("calculatorModal").classList.add("hidden");
}

function appendValue(value) {
  document.getElementById("calcDisplay").value += value;
}

function clearDisplay() {
  document.getElementById("calcDisplay").value = "";
}

function calculate() {
  let display = document.getElementById("calcDisplay");
  try {
    display.value = eval(display.value);
  } catch {
    display.value = "Error";
  }
}

function toggleUtilityMenu() {
  document.getElementById("utilityDropdown").classList.toggle("hidden");
}

/* Close dropdown when clicking outside */
document.addEventListener("click", function (e) {
  const menu = document.querySelector(".utility-menu");
  if (!menu.contains(e.target)) {
    document.getElementById("utilityDropdown").classList.add("hidden");
  }
});

/* Placeholder for calendar */
function openCalendar() {
  alert("Calendar feature coming soon!");
  document.getElementById("utilityDropdown").classList.add("hidden");
}

// Close utility and calculator when clicking outside
document.addEventListener('click', function(event) {
  const calc = document.getElementById('calculatorDropdown');
  const util = document.getElementById('utilityDropdown');
  const utilToggle = document.querySelector('.utility-toggle');

  if (util && utilToggle && !util.contains(event.target) && !utilToggle.contains(event.target)) {
    util.style.display = 'none';
  }

  if (calc && !calc.contains(event.target)) {
    // if clicking a Utility item (like the Calculator button), don't hide immediately because toggleCalculator handles it
    const utilItem = document.querySelector('.utility-item');
    if (!(utilItem && utilItem.contains(event.target))) {
      calc.style.display = 'none';
    }
  }
});
