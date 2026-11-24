
/* MOBILE NAVIGATION */

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

mainNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
  });
});


/* CHART SETTINGS */

if (typeof Chart !== "undefined") {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = "#657783";

  Chart.defaults.plugins.legend.position = "bottom";

  Chart.defaults.plugins.legend.labels.padding = 16;

  Chart.defaults.plugins.tooltip.enabled = true;


  /* GLOBAL PARLIAMENT REPRESENTATION */

  new Chart(document.getElementById("parliamentChart"), {
    type: "line",
    data: {
      labels: ["2015", "2020", "2025"],
      datasets: [{
        label: "Women elected (%)",
        data: [22.3, 25.5, 27.2],
        borderColor: "#2c6487",
        backgroundColor: "rgba(44,100,135,0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: "#2c6487"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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


  /* WOMEN IN MANAGEMENT */

  new Chart(document.getElementById("managementChart"), {
    type: "line",
    data: {
      labels: ["2015", "2020", "2025"],
      datasets: [{
        label: "Women in managerial positions (%)",
        data: [26.9, 28.2, 30.0],
        borderColor: "#2c6487",
        backgroundColor: "rgba(44,100,135,0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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


  /* UNPAID CARE - ILLUSTRATIVE */

  new Chart(document.getElementById("careChart"), {
    type: "bar",
    data: {
      labels: ["Women", "Men"],
      datasets: [{
        label: "Illustrative relative units",
        data: [2.5, 1],
        backgroundColor: ["#183e5a", "#9dbbd0"],
        borderRadius: 7,
        maxBarThickness: 100
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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


  /* INDIA - HISTORICAL LOK SABHA REPRESENTATION */

  new Chart(document.getElementById("indiaChart"), {
    type: "line",
    data: {
      labels: [
        "1951", "1957", "1962", "1967",
        "1971", "1977", "1980", "1984",
        "1989", "1991", "1996", "1998",
        "1999", "2004", "2009", "2014",
        "2019", "2024"
      ],
      datasets: [{
        label: "Women elected (%)",
        data: [
          4.4, 4.5, 6.3, 5.9,
          4.9, 3.5, 5.9, 8.1,
          5.5, 7.0, 7.4, 8.1,
          9.0, 8.3, 10.9, 11.4,
          14.4, 13.6
        ],
        borderColor: "#2c6487",
        backgroundColor: "rgba(44,100,135,0.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
