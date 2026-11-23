// MOBILE NAVIGATION
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", isOpen);
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// CHART DEFAULTS
if (typeof Chart !== "undefined") {
  Chart.defaults.font.family = "DM Sans, sans-serif";
  Chart.defaults.color = "#657783";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

// CHART HELPER
function createLineChart(id, labels, values, label, max = 50) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: "#2c6487",
        backgroundColor: "rgba(44,100,135,.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max,
          title: {
            display: true,
            text: "Percentage"
          }
        }
      }
    }
  });
}

// GLOBAL PARLIAMENT
createLineChart(
  "parliamentChart",
  ["2015", "2020", "2025"],
  [22.3, 25.5, 27.2],
  "Women in national parliaments (%)"
);

// GLOBAL MANAGEMENT
createLineChart(
  "managementChart",
  ["2015", "2020", "2025"],
  [26.9, 28.2, 30.0],
  "Women in managerial positions (%)"
);

// UNPAID CARE - ILLUSTRATIVE
const careCanvas = document.getElementById("careChart");

if (careCanvas && typeof Chart !== "undefined") {
  new Chart(careCanvas, {
    type: "bar",
    data: {
      labels: ["Women", "Men"],
      datasets: [{
        label: "Illustrative comparison",
        data: [2.5, 1],
        backgroundColor: ["#183e5a", "#9dbdd4"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Illustrative relative units"
          }
        }
      }
    }
  });
}

// INDIA LOK SABHA
createLineChart(
  "indiaChart",
  [
    "1951", "1957", "1962", "1967", "1971",
    "1977", "1980", "1984", "1989", "1991",
    "1996", "1998", "1999", "2004", "2009",
    "2014", "2019", "2024"
  ],
  [
    4.4, 4.5, 6.3, 5.9, 4.9,
    3.5, 5.9, 8.1, 5.5, 7.0,
    7.4, 8.1, 9.0, 8.3, 10.9,
    11.4, 14.4, 13.6
  ],
  "Women elected (%)",
  30
);
