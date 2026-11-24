
function imageFallback(img) {
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = img.alt || "Image";
  img.replaceWith(placeholder);
}

Chart.defaults.font.family = "DM Sans, sans-serif";
Chart.defaults.color = "#627681";

const global = document.getElementById("globalChart");
if (global) {
  new Chart(global, {
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
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => v + "%" }
        }
      }
    }
  });
}

const care = document.getElementById("careChart");
if (care) {
  new Chart(care, {
    type: "bar",
    data: {
      labels: ["Women", "Men"],
      datasets: [{
        label: "Relative time",
        data: [2.5, 1],
        backgroundColor: ["#456B85", "#B69A65"],
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

const india = document.getElementById("indiaChart");
if (india) {
  new Chart(india, {
    type: "bar",
    data: {
      labels: [
        "1951","1957","1962","1967","1971","1977",
        "1980","1984","1989","1991","1996","1998",
        "1999","2004","2009","2014","2019","2024"
      ],
      datasets: [{
        label: "Women elected",
        data: [
          22,27,31,29,22,19,28,44,29,
          39,40,43,49,45,59,62,78,74
        ],
        backgroundColor: "#B69A65",
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { maxRotation: 45, minRotation: 45 } }
      }
    }
  });
}
