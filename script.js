/* BEYOND THE DIVIDE
   Visual dashboards and published international datasets.
*/

const $ = (id) => document.getElementById(id);
const chartInstances = {};

const COLORS = {
  navy: "#123d68",
  blue: "#2e6f9e",
  sky: "#8fc5df",
  pale: "#dcecf3",
  gold: "#d9b77b",
  muted: "#71879a"
};

// ---------- PAGE NAVIGATION ----------

const pages = [...document.querySelectorAll(".page")];
const navButtons = [...document.querySelectorAll("[data-page]")];

function showPage(id) {
  pages.forEach(page => page.classList.toggle("active", page.id === id));
  navButtons.forEach(button =>
    button.classList.toggle("active", button.dataset.page === id)
  );
  $("mainNav").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    Object.values(chartInstances).forEach(chart => {
      if (chart && typeof chart.resize === "function") chart.resize();
    });
    if (window.Plotly && $("worldMap")) Plotly.Plots.resize("worldMap");
  }, 180);
}

navButtons.forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

$("backToTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- CHART HELPERS ----------

function makeChart(id, labels, values, label, color = COLORS.blue, suffix = "") {
  const canvas = $(id);
  if (!canvas || !window.Chart) return;

  if (chartInstances[id]) chartInstances[id].destroy();

  chartInstances[id] = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        backgroundColor: color + "20",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 3,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#071b35",
          padding: 12,
          callbacks: {
            label: context => `${context.parsed.y}${suffix}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: COLORS.muted, maxTicksLimit: 8 }
        },
        y: {
          beginAtZero: false,
          grid: { color: "#e8eef2" },
          ticks: { color: COLORS.muted }
        }
      }
    }
  });
}

function makeBarChart(id, labels, values, label, colors, suffix = "") {
  const canvas = $(id);
  if (!canvas || !window.Chart) return;

  if (chartInstances[id]) chartInstances[id].destroy();

  chartInstances[id] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: colors,
        borderRadius: 5,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#071b35",
          padding: 12,
          callbacks: {
            label: context => `${context.parsed.y}${suffix}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: COLORS.muted } },
        y: {
          beginAtZero: true,
          grid: { color: "#e8eef2" },
          ticks: { color: COLORS.muted }
        }
      }
    }
  });
}

// ---------- WORLD BANK DATA ----------

async function getWorldBank(indicator, country = "WLD", start = 2000, end = 2025) {
  const url =
    `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}` +
    `?date=${start}:${end}&format=json&per_page=100`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("World Bank data unavailable");

  const result = await response.json();
  if (!result || !result[1]) throw new Error("No observations returned");

  return result[1]
    .filter(item => item.value !== null)
    .map(item => ({
      year: Number(item.date),
      value: Number(item.value)
    }))
    .sort((a, b) => a.year - b.year);
}

async function drawWorldBankChart(id, indicator, country, start, end, label, suffix = "") {
  try {
    const observations = await getWorldBank(indicator, country, start, end);
    if (!observations.length) throw new Error("No data");

    makeChart(
      id,
      observations.map(item => item.year),
      observations.map(item => item.value),
      label,
      COLORS.blue,
      suffix
    );
  } catch (error) {
    showChartFallback(id, "Data could not be loaded. Open the source link in the Sources tab.");
  }
}

function showChartFallback(id, message) {
  const canvas = $(id);
  if (!canvas) return;
  const wrapper = canvas.parentElement;
  wrapper.innerHTML = `<div class="chart-fallback">${message}</div>`;
}

// ---------- GLOBAL MAP ----------

async function loadWorldMap() {
  const mapElement = $("worldMap");
  if (!mapElement) return;

  if (!window.Plotly) {
    $("mapStatus").textContent = "The map library did not load. Check your internet connection.";
    return;
  }

  try {
    // World Bank indicator: women in parliament (% of seats)
    const url =
      "https://api.worldbank.org/v2/country/all/indicator/SG.GEN.PARL.ZS" +
      "?date=2024&format=json&per_page=300";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Map data unavailable");

    const json = await response.json();
    const rows = (json[1] || []).filter(row =>
      row.value !== null &&
      row.countryiso3code &&
      row.countryiso3code.length === 3 &&
      row.region &&
      row.region.value !== "Aggregates"
    );

    if (!rows.length) throw new Error("No country data");

    const locations = rows.map(row => row.countryiso3code);
    const values = rows.map(row => Number(row.value));
    const names = rows.map(row => row.country.value);

    const trace = {
      type: "choropleth",
      locationmode: "ISO-3",
      locations,
      z: values,
      text: names,
      customdata: values,
      colorscale: [
        [0, "#e6f0f5"],
        [0.25, "#a9ccdc"],
        [0.5, "#5e9cbd"],
        [0.75, "#2e6f9e"],
        [1, "#123d68"]
      ],
      zmin: 0,
      zmax: 50,
      marker: { line: { color: "#ffffff", width: 0.35 } },
      colorbar: {
        title: { text: "% women" },
        thickness: 12,
        len: 0.7,
        tickfont: { color: "#526a7e", size: 10 }
      },
      hovertemplate: "<b>%{text}</b><br>Women in parliament: %{z:.1f}%<extra></extra>"
    };

    const layout = {
      margin: { t: 5, r: 5, b: 5, l: 5 },
      paper_bgcolor: "#ffffff",
      geo: {
        projection: { type: "natural earth" },
        showframe: false,
        showcoastlines: true,
        coastlinecolor: "#ffffff",
        showland: true,
        landcolor: "#edf2f5",
        showcountries: true,
        countrycolor: "#ffffff",
        bgcolor: "#ffffff"
      },
      font: { family: "DM Sans, sans-serif", color: "#123d68" }
    };

    Plotly.newPlot(mapElement, [trace], layout, {
      responsive: true,
      displayModeBar: false
    });

    $("mapStatus").textContent =
      `Country values shown for 2024 where data is available. ${rows.length} country records loaded.`;
  } catch (error) {
    $("mapStatus").textContent =
      "The interactive map could not retrieve country data. The source is World Bank indicator SG.GEN.PARL.ZS.";
    mapElement.innerHTML =
      '<div class="chart-fallback">Map data could not be loaded. Check the World Bank data link in the Sources tab.</div>';
  }
}

// ---------- GLOBAL TRENDS ----------

function drawPublishedGlobalParliamentTrend() {
  // IPU published global comparison:
  // 1995: 11.3%; 2025: 27.2%.
  // Only the two published reference points are plotted.
  makeChart(
    "globalParliamentChart",
    ["1995", "2025"],
    [11.3, 27.2],
    "Women in parliament",
    COLORS.blue,
    "%"
  );

  makeChart(
    "trendParliamentChart",
    ["1995", "2025"],
    [11.3, 27.2],
    "Women in parliament",
    COLORS.blue,
    "%"
  );
}

function drawPublishedIndiaData() {
  const years = [
    "1951", "1962", "1971", "1980", "1991",
    "2000", "2009", "2014", "2019", "2021",
    "2023", "2024", "2025"
  ];

  const values = [
    3.8, 6.8, 4.1, 5.0, 7.2,
    9.0, 10.8, 11.4, 14.4, 14.9,
    15.2, 13.8, 13.8
  ];

  makeChart(
    "indiaTrendChart",
    years,
    values,
    "Women in Lok Sabha",
    COLORS.blue,
    "%"
  );

  makeBarChart(
    "indiaSeatsChart",
    ["Women", "Men"],
    [75, 467],
    "Seats",
    [COLORS.sky, COLORS.navy]
  );
}

// ---------- INITIALISE ----------

function initialiseCharts() {
  drawPublishedGlobalParliamentTrend();
  drawPublishedIndiaData();

  // World Bank API datasets
  drawWorldBankChart(
    "fertilityChart",
    "SP.ADO.TFRT",
    "WLD",
    2000,
    2024,
    "Births per 1,000 girls"
  );

  drawWorldBankChart(
    "maternalChart",
    "SH.STA.MMRT",
    "WLD",
    2000,
    2023,
    "Maternal deaths per 100,000 live births"
  );

  drawWorldBankChart(
    "trendFertilityChart",
    "SP.ADO.TFRT",
    "WLD",
    2000,
    2024,
    "Births per 1,000 girls"
  );
}

document.addEventListener("DOMContentLoaded", () => {
  initialiseCharts();
  loadWorldMap();
});
