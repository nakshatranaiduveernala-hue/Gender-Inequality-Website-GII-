/* =========================================
   BEYOND THE DIVIDE — JAVASCRIPT
========================================= */

// MOBILE NAVIGATION

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
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
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = "#667d8b";

  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 18;

  const blue = "#2e668b";
  const navy = "#183f59";
  const lightBlue = "#9dbdd3";

  // GLOBAL PARLIAMENT CHART

  const parliamentCanvas = document.getElementById("parliamentChart");

  if (parliamentCanvas) {
    new Chart(parliamentCanvas, {
      type: "line",
      data: {
        labels: ["2015", "2020", "2025"],
        datasets: [{
          label: "Women elected (%)",
          data: [22.3, 25.5, 27.2],
          borderColor: blue,
          backgroundColor: "rgba(46,102,139,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: blue,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 40,
            title: {
              display: true,
              text: "Percentage"
            }
          }
        }
      }
    });
  }


  // MANAGEMENT CHART

  const managementCanvas = document.getElementById("managementChart");

  if (managementCanvas) {
    new Chart(managementCanvas, {
      type: "line",
      data: {
        labels: ["2015", "2020", "2025"],
        datasets: [{
          label: "Women in managerial positions (%)",
          data: [26.9, 28.2, 30.0],
          borderColor: navy,
          backgroundColor: "rgba(24,63,89,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: navy,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 50,
            title: {
              display: true,
              text: "Percentage"
            }
          }
        }
      }
    });
  }


  // UNPAID CARE COMPARISON

  const careCanvas = document.getElementById("careChart");

  if (careCanvas) {
    new Chart(careCanvas, {
      type: "bar",
      data: {
        labels: ["Women", "Men"],
        datasets: [{
          label: "Illustrative relative comparison",
          data: [2.5, 1],
          backgroundColor: [navy, lightBlue],
          borderRadius: 8,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
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


  // INDIA — HISTORICAL LOK SABHA REPRESENTATION

  const indiaCanvas = document.getElementById("indiaChart");

  if (indiaCanvas) {
    new Chart(indiaCanvas, {
      type: "line",
      data: {
        labels: [
          "1951",
          "1957",
          "1962",
          "1967",
          "1971",
          "1977",
          "1980",
          "1984",
          "1989",
          "1991",
          "1996",
          "1998",
          "1999",
          "2004",
          "2009",
          "2014",
          "2019",
          "2024"
        ],
        datasets: [{
          label: "Women elected (%)",
          data: [
            4.4,
            4.5,
            6.3,
            5.9,
            4.9,
            3.5,
            5.9,
            8.1,
            5.5,
            7.0,
            7.4,
            8.1,
            9.0,
            8.3,
            10.9,
            11.4,
            14.4,
            13.6
          ],
          borderColor: blue,
          backgroundColor: "rgba(46,102,139,0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: blue,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 20,
            title: {
              display: true,
              text: "Percentage"
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });
  }
}
