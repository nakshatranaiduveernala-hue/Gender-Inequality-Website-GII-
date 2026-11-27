/* =====================================================
   BEYOND THE NUMBERS
   Navigation, interactive charts, data and world map
===================================================== */

const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav-link");
const nav = document.getElementById("navigation");
const menuToggle = document.getElementById("menuToggle");

/* ---------------- NAVIGATION ---------------- */

function showPage(id) {
  pages.forEach(page => page.classList.remove("active"));

  const selected = document.getElementById(id);
  if (selected) selected.classList.add("active");

  navLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + id);
  });

  nav.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "indicator") {
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 250);
  }
}

navLinks.forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    showPage(link.getAttribute("href").substring(1));
  });
});

menuToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
});

/* ---------------- WORLD BANK ---------------- */

const WB = "https://api.worldbank.org/v2";

const indicators = {
  "SG.GEN.PARL.ZS": {
    name: "Women in national parliaments (%)",
    unit: "%",
    description:
      "The proportion of seats held by women in national parliaments. Higher values indicate a greater proportion of parliamentary seats held by women.",
    thresholds: [0, 10, 20, 30, 40, 50],
    legend: ["0–10", "10–20", "20–30", "30–40", "40–50", "50+"],
    colors: [
      "#e9f0f8",
      "#c5d8ec",
      "#8fb5d8",
      "#568ab8",
      "#28619b",
      "#123f70"
    ]
  },
  "SP.ADO.TFRT": {
    name: "Adolescent fertility rate",
    unit: " births per 1,000 women aged 15–19",
    description:
      "The number of births per 1,000 women aged 15–19. This indicator provides development context but does not directly measure parliamentary representation.",
    thresholds: [0, 20, 40, 60, 80, 100],
    legend: ["0–20", "20–40", "40–60", "60–80", "80–100", "100+"],
    colors: [
      "#e9f0f8",
      "#c5d8ec",
      "#8fb5d8",
      "#568ab8",
      "#28619b",
      "#123f70"
    ]
  },
  "SH.STA.MMRT": {
    name: "Maternal mortality ratio",
    unit: " deaths per 100,000 live births",
    description:
      "Maternal deaths per 100,000 live births. This indicator offers healthcare and development context and is not a direct measure of representation.",
    thresholds: [0, 100, 300, 500, 1000, 2000],
    legend: ["0–100", "100–300", "300–500", "500–1000", "1000–2000", "2000+"],
    colors: [
      "#e9f0f8",
      "#c5d8ec",
      "#8fb5d8",
      "#568ab8",
      "#28619b",
      "#123f70"
    ]
  }
};

let currentIndicator = "SG.GEN.PARL.ZS";
let currentYear = "2023";
let mapValues = {};
let geoLayer = null;
let map = null;
let compareChart = null;
let trendChart = null;

const mapStatus = document.getElementById("mapStatus");
const mapLegend = document.getElementById("mapLegend");
const dataTable = document.getElementById("dataTable");

/* ---------------- YEARS ---------------- */

const yearSelect = document.getElementById("mapYear");

for (let year = 2024; year >= 1990; year--) {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;

  if (year === 2023) option.selected = true;

  yearSelect.appendChild(option);
}

yearSelect.addEventListener("change", () => {
  currentYear = yearSelect.value;
});

/* ---------------- MAP INITIALIZATION ---------------- */

function initializeMap() {
  if (map) return;

  map = L.map("worldMap", {
    zoomControl: true,
    scrollWheelZoom: false,
    minZoom: 1.5
  }).setView([20, 0], 2);

  map.scrollWheelZoom.disable();

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
    {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 6
    }
  ).addTo(map);
}

/* ---------------- DATA FETCHING ---------------- */

async function fetchIndicator(indicator, year) {
  const url =
    `${WB}/country/all/indicator/${indicator}` +
    `?date=${year}&format=json&per_page=300`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("World Bank data request failed");
  }

  const json = await response.json();

  if (!json || !json[1]) return {};

  const values = {};

  json[1].forEach(item => {
    if (
      item.country &&
      item.country.id &&
      item.value !== null &&
      item.value !== undefined
    ) {
      values[item.country.id] = {
        value: Number(item.value),
        country: item.country.value,
        year: item.date
      };
    }
  });

  return values;
}

async function fetchCountrySeries(country, indicator, start = 1990, end = 2024) {
  const url =
    `${WB}/country/${country}/indicator/${indicator}` +
    `?date=${start}:${end}&format=json&per_page=100`;

  const response = await fetch(url);

  if (!response.ok) throw new Error("Data request failed");

  const json = await response.json();

  if (!json || !json[1]) return [];

  return json[1]
    .filter(item => item.value !== null)
    .map(item => ({
      year: Number(item.date),
      value: Number(item.value)
    }))
    .sort((a, b) => a.year - b.year);
}

/* ---------------- MAP COLOUR SCALE ---------------- */

function getColour(value, indicator) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "#cbd2da";
  }

  const info = indicators[indicator];

  for (let i = 0; i < info.thresholds.length; i++) {
    if (value < info.thresholds[i]) {
      return info.colors[i];
    }
  }

  return info.colors[info.colors.length - 1];
}

function getLegendHTML(indicator) {
  const info = indicators[indicator];

  return info.legend.map((label, i) => {
    return `
      <div class="legend-item">
        <div class="legend-color" style="background:${info.colors[i]}"></div>
        <span>${label}</span>
      </div>
    `;
  }).join("") + `
    <div class="legend-item">
      <div class="legend-color" style="background:#cbd2da"></div>
      <span>No data</span>
    </div>
  `;
}

/* ---------------- MAP STYLING ---------------- */

function countryCode(feature) {
  const p = feature.properties || {};

  return (
    p.ISO_A3 ||
    p.ADM0_A3 ||
    p.iso_a3 ||
    p.ISO3 ||
    feature.id ||
    ""
  );
}

function countryName(feature) {
  const p = feature.properties || {};

  return (
    p.ADMIN ||
    p.name ||
    p.NAME ||
    p.NAME_EN ||
    "Country"
  );
}

function mapStyle(feature) {
  const code = countryCode(feature);
  const record = mapValues[code];

  return {
    fillColor: record ? getColour(record.value, currentIndicator) : "#cbd2da",
    weight: 0.7,
    color: "#ffffff",
    fillOpacity: 0.9
  };
}

function onCountryClick(feature, layer) {
  const code = countryCode(feature);
  const record = mapValues[code];
  const name = countryName(feature);

  if (record) {
    layer.bindPopup(
      `<strong>${name}</strong><br>` +
      `${indicators[currentIndicator].name}: ` +
      `<strong>${record.value.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}</strong><br>` +
      `Year: ${record.year}`
    );
  } else {
    layer.bindPopup(
      `<strong>${name}</strong><br>` +
      `No data available for ${currentYear}.`
    );
  }
}

function updateMapLayer(geojson) {
  if (geoLayer) map.removeLayer(geoLayer);

  geoLayer = L.geoJSON(geojson, {
    style: mapStyle,
    onEachFeature: function(feature, layer) {
      onCountryClick(feature, layer);

      layer.on({
        mouseover: function(e) {
          e.target.setStyle({
            weight: 2,
            color: "#c9a96a",
            fillOpacity: 1
          });
        },
        mouseout: function(e) {
          geoLayer.resetStyle(e.target);
        }
      });
    }
  }).addTo(map);
}

/* ---------------- LOAD MAP ---------------- */

async function loadMapData() {
  initializeMap();

  currentYear = yearSelect.value;
  currentIndicator = document.getElementById("indicatorSelect").value;

  mapStatus.textContent = "Loading…";

  const definition = indicators[currentIndicator];

  document.getElementById("indicatorDefinition").innerHTML = `
    <h3>${definition.name}</h3>
    <p>${definition.description}</p>
  `;

  mapLegend.innerHTML = getLegendHTML(currentIndicator);

  try {
    mapValues = await fetchIndicator(currentIndicator, currentYear);

    const geoResponse = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );

    if (!geoResponse.ok) throw new Error("Map file unavailable");

    const geojson = await geoResponse.json();

    updateMapLayer(geojson);

    mapStatus.textContent = `Data loaded · ${currentYear}`;

    updateComparison();
    updateDataTable();
  } catch (error) {
    mapStatus.textContent = "Data could not be loaded";

    console.error(error);

    dataTable.innerHTML =
      `<tr><td colspan="4">Data unavailable. Please try again.</td></tr>`;
  }
}

document.getElementById("mapUpdate").addEventListener("click", loadMapData);

document.getElementById("indicatorSelect").addEventListener("change", () => {
  currentIndicator = document.getElementById("indicatorSelect").value;
});

/* ---------------- COMPARISON CHART ---------------- */

function getSelectedCountries(selectId) {
  const select = document.getElementById(selectId);

  return Array.from(select.selectedOptions).map(option => ({
    code: option.value,
    name: option.textContent
  }));
}

async function updateComparison() {
  const selected = getSelectedCountries("countrySelect");

  if (selected.length === 0) {
    if (compareChart) compareChart.destroy();
    return;
  }

  const labels = [];
  const values = [];

  for (const country of selected) {
    try {
      const series = await fetchCountrySeries(
        country.code,
        currentIndicator,
        1990,
        2024
      );

      const record = series.find(item => item.year === Number(currentYear));

      labels.push(country.name);
      values.push(record ? record.value : null);
    } catch (error) {
      labels.push(country.name);
      values.push(null);
    }
  }

  renderComparisonChart(labels, values);

  updateDataTable();
}

function renderComparisonChart(labels, values) {
  const ctx = document.getElementById("compareChart");

  if (compareChart) compareChart.destroy();

  compareChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: indicators[currentIndicator].name,
        data: values,
        backgroundColor: "#326da6",
        borderColor: "#c9a96a",
        borderWidth: 1,
        borderRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#18304d"
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.raw === null) return "No data";
              return `${context.raw.toLocaleString()} ${indicators[currentIndicator].unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#18304d"
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#18304d"
          },
          grid: {
            color: "rgba(24,48,77,.08)"
          }
        }
      }
    }
  });
}

document.getElementById("compareUpdate").addEventListener("click", updateComparison);

/* ---------------- TABLE ---------------- */

async function updateDataTable() {
  const selected = getSelectedCountries("countrySelect");

  if (!selected.length) {
    dataTable.innerHTML = "<tr><td colspan='4'>No countries selected.</td></tr>";
    return;
  }

  dataTable.innerHTML = "<tr><td colspan='4'>Loading data…</td></tr>";

  let rows = "";

  for (const country of selected) {
    try {
      const series = await fetchCountrySeries(
        country.code,
        currentIndicator,
        1990,
        2024
      );

      const record = series.find(item => item.year === Number(currentYear));

      rows += `
        <tr>
          <td>${country.name}</td>
          <td>${record ? record.value.toLocaleString(undefined, {
            maximumFractionDigits: 2
          }) : "Unavailable"}</td>
          <td>${indicators[currentIndicator].name}</td>
          <td>${record ? record.year : currentYear}</td>
        </tr>
      `;
    } catch (error) {
      rows += `
        <tr>
          <td>${country.name}</td>
          <td>Unavailable</td>
          <td>${indicators[currentIndicator].name}</td>
          <td>${currentYear}</td>
        </tr>
      `;
    }
  }

  dataTable.innerHTML = rows;
}

/* ---------------- TREND CHART ---------------- */

async function loadTrendChart() {
  const selected = getSelectedCountries("trendCountries");

  if (!selected.length) return;

  const datasets = [];

  for (const country of selected) {
    try {
      const series = await fetchCountrySeries(
        country.code,
        "SG.GEN.PARL.ZS",
        1990,
        2024
      );

      datasets.push({
        label: country.name,
        data: series.map(item => ({
          x: item.year,
          y: item.value
        })),
        borderWidth: 2,
        pointRadius: 1.5,
        tension: 0.25,
        fill: false
      });
    } catch (error) {
      console.error(error);
    }
  }

  renderTrendChart(datasets);
}

function renderTrendChart(datasets) {
  const ctx = document.getElementById("trendChart");

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#18304d",
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: 1990,
          max: 2024,
          title: {
            display: true,
            text: "Year",
            color: "#18304d"
          },
          ticks: {
            color: "#18304d"
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Women in parliament (%)",
            color: "#18304d"
          },
          ticks: {
            color: "#18304d"
          },
          grid: {
            color: "rgba(24,48,77,.08)"
          }
        }
      }
    }
  });
}

document.getElementById("loadTrend").addEventListener("click", loadTrendChart);

/* ---------------- INITIAL LOAD ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  showPage("home");

  loadMapData();

  loadTrendChart();
});
