let currentDate = new Date();

// Fixed holidays example (day-month): message
const fixedHolidays = {
  "1-1": "New Year's Day",
  "23-1": "Netaji Jayanti",
  "26-1": "Republic Day",
  "15-8": "Independence Day",
  "2-10": "Gandhi Jayanti",
  "25-12": "Christmas",
};

// Render calendar for the given date
function renderCalendar(date) {
  const calendar = document.querySelector(".calendar");
  const monthYearLabel = calendar.querySelector(".month-year");
  const tbody = calendar.querySelector("tbody");

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sunday
  const lastDate = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  monthYearLabel.innerHTML = `${monthNames[month]} ${year}`;

  // Clear table
  tbody.innerHTML = "";

  let row = document.createElement("tr");

  // Fill empty cells for first row
  for (let i = 0; i < firstDay; i++) {
    row.appendChild(document.createElement("td"));
  }

  for (let day = 1; day <= lastDate; day++) {
    const cell = document.createElement("td");
    cell.textContent = day;

    // Highlight today
    if (isCurrentMonth && day === today.getDate()) {
      cell.classList.add("highlight");
    }

    // Holiday detection
    const weekday = new Date(year, month, day).getDay();
    const key = `${day}-${month + 1}`;
    if (weekday === 0 || fixedHolidays[key]) {
      cell.classList.add("holiday");
      if (fixedHolidays[key]) {
        cell.title = fixedHolidays[key];
      } else {
        cell.title = "Sunday";
      }
    }

    // Click to add/view event
    cell.addEventListener("click", () => {
      const input = prompt(`Add/View event for ${day}-${month + 1}-${year}:`);
      if (input) {
        cell.classList.add("event-day");
        cell.title = input;
      }
    });

    row.appendChild(cell);

    if ((firstDay + day) % 7 === 0 || day === lastDate) {
      tbody.appendChild(row);
      row = document.createElement("tr");
    }
  }
}

// Setup navigation
function setupNavigation() {
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });

  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });

  document.getElementById("today-btn").addEventListener("click", () => {
    currentDate = new Date();
    renderCalendar(currentDate);
  });
}

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentDate);
  setupNavigation();
});
const tabs = document.querySelectorAll(".menu-tab");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(btn => btn.classList.remove("active"));
    tab.classList.add("active");
  });
});



// Show Coming Soon Overlay
function showComingSoon() {
  document.getElementById("coming-soon-overlay").style.display = "flex";
}

// Hide overlay when clicking "Close"
document.getElementById("close-overlay").addEventListener("click", () => {
  document.getElementById("coming-soon-overlay").style.display = "none";
});

// Attach to all relevant elements
document.querySelectorAll(".menu-tab, .card, .view-more").forEach(el => {
  el.addEventListener("click", showComingSoon);
});
