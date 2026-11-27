"use strict";

/* =========================
   BEYOND THE DIVIDE
   NAVIGATION
========================= */

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-button");

function showPage(pageId) {
  pages.forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "indicator" && mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  document.getElementById("sidebar")?.classList.remove("open");
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.goto);
  });
});

document.getElementById("mobileMenu")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.toggle("open");
});

/* =========================
   GENERAL HELPERS
========================= */

const YEARS = Array.from(
  { length: 25 },
  (_, i) => 2000 + i
);

function populateSelect(id, values, selected) {
  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML = "";

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (selected !== undefined) {
    select.value = String(selected);
  }
}

function safeNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatValue(value) {
  if (value === null || value === undefined) return "No data";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }

  return response.json();
}

function setStatus(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message;
}

/* =========================
   CHART MANAGEMENT
========================= */

const charts = {};

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    charts[id] = null;
  }
}

function createBarChart(
  canvasId,
  labels,
  values,
  title,
  horizontal = false
) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;

  destroyChart(canvasId);

  charts[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        borderWidth: 0,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: context =>
              title + ": " + formatValue(context.raw)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            display: horizontal
          }
        },
        y: {
          beginAtZero: !horizontal,
          grid: {
            display: !horizontal
          }
        }
      }
    }
  });
}

/* =========================
   WORLD BANK API
========================= */

const WORLD_BANK =
  "https://api.worldbank.org/v2";

const INDICATORS = {
  "SG.GEN.PARL.ZS": {
    label: "Women in national parliaments (%)",
    unit: "%"
  },
  "SP.ADO.TFRT": {
    label: "Adolescent fertility rate",
    unit: ""
  },
  "SH.STA.MMRT": {
    label: "Maternal mortality ratio",
    unit: ""
  }
};

async function getIndicatorData(indicator, year) {
  const url =
    `${WORLD_BANK}/country/all/indicator/${indicator}` +
    `?date=${year}&format=json&per_page=2000`;

  const result = await fetchJSON(url);

  if (!Array.isArray(result) || !result[1]) {
    return [];
  }

  return result[1]
    .filter(row => row.value !== null)
    .map(row => ({
      country: row.country.value,
      code: row.countryiso3code,
      value: safeNumber(row.value),
      year: row.date
    }))
    .filter(row => row.value !== null);
}

async function getCountrySeries(code, indicator, start, end) {
  const url =
    `${WORLD_BANK}/country/${code}/indicator/${indicator}` +
    `?date=${start}:${end}&format=json&per_page=2000`;

  const result = await fetchJSON(url);

  if (!Array.isArray(result) || !result[1]) {
    return [];
  }

  return result[1]
    .filter(row => row.value !== null)
    .map(row => ({
      year: Number(row.date),
      value: Number(row.value)
    }))
    .sort((a, b) => a.year - b.year);
}

/* =========================
   TRENDS PAGE
========================= */

populateSelect("trendStart", YEARS, 2000);
populateSelect("trendEnd", YEARS, 2024);
populateSelect("compareYear", YEARS, 2024);

async function loadTrendChart() {
  const start = Number(document.getElementById("trendStart").value);
  const end = Number(document.getElementById("trendEnd").value);

  if (start > end) {
    alert("The start year must be before the end year.");
    return;
  }

  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  destroyChart("trendChart");

  try {
    const url =
      `${WORLD_BANK}/country/WLD/indicator/SG.GEN.PARL.ZS` +
      `?date=${start}:${end}&format=json&per_page=2000`;

    const response = await fetchJSON(url);

    if (!response || !response[1]) {
      throw new Error("No trend data available.");
    }

    const rows = response[1]
      .filter(row => row.value !== null)
      .sort((a, b) => Number(a.date) - Number(b.date));

    charts.trendChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: rows.map(row => row.date),
        datasets: [{
          label: "World parliamentary representation (%)",
          data: rows.map(row => Number(row.value)),
          tension: 0.25,
          pointRadius: 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Percentage of seats"
            }
          }
        }
      }
    });

  } catch (error) {
    console.error(error);
    setStatus("compareTable", "Trend data could not be loaded.");
  }
}

document.getElementById("trendLoad")?.addEventListener(
  "click",
  loadTrendChart
);

/* =========================
   COMPARISON
========================= */

async function loadComparison() {
  const year = document.getElementById("compareYear").value;

  try {
    const data = await getIndicatorData(
      "SG.GEN.PARL.ZS",
      year
    );

    const filtered = data
      .filter(row => row.code && row.code.length === 3)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    createBarChart(
      "compareChart",
      filtered.map(row => row.country),
      filtered.map(row => row.value),
      "Women in parliament (%)",
      true
    );

    const table = document.getElementById("compareTable");

    if (table) {
      table.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Year</th>
              <th>Representation (%)</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(row => `
              <tr>
                <td>${escapeHTML(row.country)}</td>
                <td>${escapeHTML(row.year)}</td>
                <td>${formatValue(row.value)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

  } catch (error) {
    console.error(error);
    setStatus("compareTable", "Comparison data unavailable.");
  }
}

document.getElementById("compareLoad")?.addEventListener(
  "click",
  loadComparison
);

/* =========================
   MAP
========================= */

let mapInstance = null;
let geoLayer = null;
let mapData = [];
let selectedCountry = null;

const GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

function getColor(value, max) {
  if (value === null || value === undefined) return "#d9dfe7";

  const fraction = max > 0 ? value / max : 0;

  if (fraction < 0.2) return "#edf3f8";
  if (fraction < 0.4) return "#b8cce0";
  if (fraction < 0.6) return "#648db6";
  if (fraction < 0.8) return "#326da6";
  return "#071a35";
}

function getGeoCode(feature) {
  const properties = feature.properties || {};

  return (
    properties.ISO_A3 ||
    properties.ISO3 ||
    properties.ADM0_A3 ||
    properties.iso_a3 ||
    properties.SOV_A3 ||
    properties.ISO_A3_EH ||
    null
  );
}

function mapCountryName(feature) {
  const properties = feature.properties || {};

  return (
    properties.ADMIN ||
    properties.name ||
    properties.NAME ||
    properties.NAME_EN ||
    "Unknown country"
  );
}

function initializeMap() {
  if (!window.L) {
    setStatus("mapStatus", "Mapping library could not load.");
    return;
  }

  const container = document.getElementById("worldMap");

  if (!container || mapInstance) return;

  mapInstance = L.map(container, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: true
  });

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 6
    }
  ).addTo(mapInstance);

  loadMap();
}

async function loadMap() {
  const year = document.getElementById("mapYear").value;
  const indicator = document.getElementById("mapIndicator").value;

  setStatus("mapStatus", "Loading country data…");

  try {
    const [data, geojson] = await Promise.all([
      getIndicatorData(indicator, year),
      fetchJSON(GEOJSON_URL)
    ]);

    mapData = data;

    const dataMap = new Map(
      data.map(row => [row.code, row.value])
    );

    const maximum = Math.max(
      1,
      ...data.map(row => row.value)
    );

    if (geoLayer) {
      mapInstance.removeLayer(geoLayer);
    }

    geoLayer = L.geoJSON(geojson, {
      style: feature => {
        const code = getGeoCode(feature);
        const value = dataMap.get(code);

        return {
          fillColor: getColor(value, maximum),
          color: "#ffffff",
          weight: 0.7,
          fillOpacity: 0.85
        };
      },
      onEachFeature: (feature, layer) => {
        const code = getGeoCode(feature);
        const country = mapCountryName(feature);
        const value = dataMap.get(code);

        layer.bindTooltip(
          `${country}: ${formatValue(value)}`
        );

        layer.on("click", () => {
          displayCountry(country, value, year, indicator);
        });

        layer.on("mouseover", () => {
          layer.setStyle({
            weight: 2,
            color: "#c5a46d"
          });
        });

        layer.on("mouseout", () => {
          geoLayer.resetStyle(layer);
        });
      }
    }).addTo(mapInstance);

    setStatus(
      "mapStatus",
      `Displaying ${indicatorLabel(indicator)} for ${year}. Click a country for details.`
    );

    updateIndicatorChart(data);
    updateIndicatorTable(data, year);
    mapInstance.invalidateSize();

  } catch (error) {
    console.error(error);
    setStatus(
      "mapStatus",
      "Map data could not load. Check internet connection or try another year."
    );
  }
}

function indicatorLabel(code) {
  return INDICATORS[code]?.label || code;
}

function displayCountry(country, value, year, indicator) {
  selectedCountry = country;

  document.getElementById("countryTitle").textContent = country;

  document.getElementById("countryDescription").textContent =
    indicatorLabel(indicator);

  document.getElementById("countryValue").textContent =
    value === undefined
      ? "No data"
      : formatValue(value) + (indicator === "SG.GEN.PARL.ZS" ? "%" : "");

  document.getElementById("countryYear").textContent =
    "Year: " + year;
}

function updateIndicatorChart(data) {
  const filtered = data
    .filter(row => row.code && row.code.length === 3)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  createBarChart(
    "indicatorChart",
    filtered.map(row => row.country),
    filtered.map(row => row.value),
    "Indicator value",
    true
  );
}

function updateIndicatorTable(data, year) {
  const container = document.getElementById("indicatorTable");
  if (!container) return;

  const rows = data
    .slice()
    .sort((a, b) => b.value - a.value);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Country</th>
          <th>Year</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${escapeHTML(row.country)}</td>
            <td>${escapeHTML(year)}</td>
            <td>${formatValue(row.value)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* =========================
   HTML SAFETY
========================= */

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   MAP CONTROLS
========================= */

populateSelect("mapYear", YEARS, 2024);

document.getElementById("mapLoad")?.addEventListener(
  "click",
  loadMap
);

document.getElementById("mapIndicator")?.addEventListener(
  "change",
  loadMap
);

document.getElementById("mapYear")?.addEventListener(
  "change",
  loadMap
);

/* =========================
   INITIALIZATION
========================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeMap();

  loadTrendChart();

  loadComparison();
});
