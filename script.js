
/* IMAGE FALLBACKS */
function imageFallback(img) {
  const parent = img.parentElement;
  if (!parent) return;

  const label = img.alt || "Image unavailable";
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = label;

  img.replaceWith(placeholder);
}

/* CHART STYLE */
Chart.defaults.font.family = "DM Sans, sans-serif";
Chart.defaults.color = "#617583";
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 18;

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom"
    }
  }
};

/* WOMEN IN PARLIAMENT - GLOBAL */
const parliament = document.getElementById("parliamentChart");

if (parliament) {
  new Chart(parliament, {
    type: "line",
    data: {
      labels: ["2015", "2020", "2025"],
      datasets: [{
        label: "Women (%)",
        data: [22.1, 24.9, 27.2],
        borderColor: "#456B85",
        backgroundColor: "rgba(69,107,133,.15)",
        fill: true,
        tension: .35,
        pointRadius: 5
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 35,
          ticks: {
            callback: value => value + "%"
          }
        }
      }
    }
  });
}

/* UNPAID CARE COMPARISON */
const care = document.getElementById("careChart");

if (care) {
  new Chart(care, {
    type: "bar",
    data: {
      labels: ["Women", "Men"],
      datasets: [{
        label: "Relative time spent",
        data: [2.5, 1],
        backgroundColor: ["#456B85", "#B69A65"],
        borderRadius: 6,
        barThickness: 55
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 3,
          title: {
            display: true,
            text: "Relative comparison"
          }
        }
      }
    }
  });
}

/* INDIA - LOK SABHA WOMEN ELECTED */
const india = document.getElementById("indiaChart");

if (india) {
  new Chart(india, {
    type: "bar",
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
        label: "Women elected",
        data: [
          22, 27, 31, 29, 22, 19, 28, 44, 29,
          39, 40, 43, 49, 45, 59, 62, 78, 74
        ],
        backgroundColor: "#587867",
        borderRadius: 4
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 90,
          ticks: {
            stepSize: 10
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });
}
