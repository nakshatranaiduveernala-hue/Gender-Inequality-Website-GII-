"use strict";

/* =========================================================
   BEYOND THE DIVIDE
   Navigation · Data · Charts · Interactive Map
========================================================= */

const $ = id => document.getElementById(id);

/* NAVIGATION */

const nav = $("mainNav");
const menuToggle = $("menuToggle");

menuToggle?.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll("#mainNav a").forEach(link => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

const navLinks = document.querySelectorAll("#mainNav a");
const sections = document.querySelectorAll("main section[id]");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      navLinks.forEach(link => {
        link.classList.toggle(
          "active",
          link.getAttribute("href") === "#" + entry.target.id
        );
      });
    });
  }, { rootMargin: "-20% 0px -65% 0px" });

  sections.forEach(section => observer.observe(section));
}


/* CHART DEFAULTS */

Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = "#647e98";
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = "#081d36";
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 4;

const chartInstances = {};

function drawChart(id, config) {
  const canvas = $(id);
  if (!canvas) return;

  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }

  chartInstances[id] = new Chart(canvas, config);
}

function drawLine(id, labels, values, title, unit = "") {
  drawChart(id, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        borderColor: "#2b6c9e",
        backgroundColor: "rgba(43,108,158,.12)",
        fill: true,
        tension: .3,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: unit },
          grid: { color: "#e4ebf1" }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function drawBar(id, labels, values, title, unit = "") {
  drawChart(id, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: "#39739e",
        borderRadius: 4,
        maxBarThickness: 45
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: unit },
          grid: { color: "#e4ebf1" }
        },
        x: { grid: { display: false } }
      }
    }
  });
}


/* WORLD BANK DATA */

const WB = {
  parliament: "SG.GEN.PARL.ZS",
  fertility: "SP.ADO.TFRT",
  maternal: "SH.STA.MMRT"
};

const wbCache = {};

async function getWorldBank(indicator, dateRange = "1995:2024") {
  const key = indicator + "_" + dateRange;

  if (wbCache[key]) return wbCache[key];

  const url =
    "https://api.worldbank.org/v2/country/all/indicator/" +
    indicator +
    "?format=json&date=" +
    dateRange +
    "&per_page=20000";

  const response = await fetch(url);

  if (!response.ok) throw new Error("World Bank data request failed.");

  const json = await response.json();

  if (!json || !json[1]) throw new Error("No World Bank data returned.");

  wbCache[key] = json[1];
  return json[1];
}

function latestCountryValues(rows, yearLimit = 2024) {
  const result = {};

  rows.forEach(row => {
    if (!row.countryiso3code || row.value === null) return;

    const year = Number(row.date);
    if (year > yearLimit) return;

    const existing = result[row.countryiso3code];

    if (!existing || year > existing.year) {
      result[row.countryiso3code] = {
        value: Number(row.value),
        year,
        name: row.country?.value || row.countryiso3code
      };
    }
  });

  return result;
}

function getCountrySeries(rows, iso, from = 1995, to = 2024) {
  const filtered = rows.filter(row =>
    row.countryiso3code === iso &&
    row.value !== null &&
    Number(row.date) >= from &&
    Number(row.date) <= to
  );

  filtered.sort((a, b) => Number(a.date) - Number(b.date));

  return {
    labels: filtered.map(row => row.date),
    values: filtered.map(row => Number(row.value))
  };
}


/* GLOBAL COUNTRY COMPARISON */

async function loadGlobalCountryChart() {
  try {
    const rows = await getWorldBank(WB.parliament, "2020:2024");

    const latest = latestCountryValues(rows);

    const selected = [
      "RWA", "SWE", "NOR", "FIN", "MEX",
      "IND", "USA", "JPN", "PAK", "NGA"
    ];

    const data = selected
      .map(code => latest[code])
      .filter(Boolean);

    if (!data.length) throw new Error("No country values.");

    drawBar(
      "globalCountryChart",
      data.map(d => d.name),
      data.map(d => d.value),
      "Women in parliament",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    const canvas = $("globalCountryChart");
    if (canvas) {
      canvas.insertAdjacentHTML(
        "afterend",
        '<p class="small">The country comparison could not load. Use the World Bank source link to access the dataset.</p>'
      );
    }
  }
}


/* INDIA PARLIAMENT CHART */

async function loadIndiaChart() {
  try {
    const rows = await getWorldBank(WB.parliament, "1995:2024");

    const series = getCountrySeries(rows, "IND");

    if (!series.values.length) throw new Error("No India values.");

    drawLine(
      "indiaChart",
      series.labels,
      series.values,
      "Women in Parliament",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    const canvas = $("indiaChart");
    if (canvas) {
      canvas.insertAdjacentHTML(
        "afterend",
        '<p class="small">India data could not load. Check the World Bank data link.</p>'
      );
    }
  }
}


/* GLOBAL ENDPOINT COMPARISON */

async function loadTrendChart() {
  try {
    const rows = await getWorldBank(WB.parliament, "1995:2024");

    const selectedYears = ["1995", "2000", "2005", "2010", "2015", "2020", "2024"];

    const globalRows = rows.filter(row =>
      row.countryiso3code === "WLD" &&
      row.value !== null
    );

    const global = {};
    globalRows.forEach(row => {
      global[row.date] = Number(row.value);
    });

    const availableYears = selectedYears.filter(year => global[year] !== undefined);

    if (!availableYears.length) {
      throw new Error("No global trend values.");
    }

    drawLine(
      "trendChart",
      availableYears,
      availableYears.map(year => global[year]),
      "Global representation",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);

    drawLine(
      "trendChart",
      ["1995", "2025"],
      [11.3, 27.2],
      "Previously referenced endpoints",
      "Percentage (%)"
    );
  }
}


/* SUPPORTING INDIA INDICATORS */

async function loadSupportingCharts() {
  try {
    const rows = await getWorldBank(WB.fertility, "1995:2024");
    const series = getCountrySeries(rows, "IND");

    if (series.values.length) {
      drawLine(
        "fertilityChart",
        series.labels,
        series.values,
        "Adolescent fertility",
        "Births per 1,000 women aged 15–19"
      );
    }
  } catch (error) {
    console.error("Fertility chart:", error);
  }

  try {
    const rows = await getWorldBank(WB.maternal, "1995:2024");
    const series = getCountrySeries(rows, "IND");

    if (series.values.length) {
      drawLine(
        "maternalChart",
        series.labels,
        series.values,
        "Maternal mortality",
        "Deaths per 100,000 live births"
      );
    }
  } catch (error) {
    console.error("Maternal chart:", error);
  }
}


/* MAP */

const mapStatus = $("mapStatus");

const worldMap = L.map("worldMap", {
  zoomControl: true,
  scrollWheelZoom: false,
  minZoom: 1,
  maxZoom: 5,
  worldCopyJump: true
}).setView([20, 0], 2);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
  {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 5
  }
).addTo(worldMap);

const mapData = {};

function mapColour(value) {
  if (value === null || value === undefined || isNaN(value)) return "#e8edf2";
  if (value < 10) return "#edf5fa";
  if (value < 20) return "#b9d4e5";
  if (value < 30) return "#7daac9";
  if (value < 40) return "#39739e";
  return "#123e68";
}

function countryCode(feature) {
  const p = feature.properties || {};

  return (
    p.ISO_A3 ||
    p.iso_a3 ||
    p.ADM0_A3 ||
    p.ISO3 ||
    p.A3 ||
    p["ISO3166-1-Alpha-3"] ||
    null
  );
}

function countryName(feature) {
  const p = feature.properties || {};

  return (
    p.ADMIN ||
    p.name ||
    p.NAME ||
    p.name_en ||
    "Country"
  );
}

function countryStyle(feature) {
  const code = countryCode(feature);
  const value = mapData[code]?.value;

  return {
    fillColor: mapColour(value),
    fillOpacity: .85,
    color: "#ffffff",
    weight: .7
  };
}

function onCountryFeature(feature, layer) {
  const code = countryCode(feature);
  const name = countryName(feature);
  const record = mapData[code];

  const text = record
    ? `${name}<br>Women in parliament: ${record.value.toFixed(1)}%<br>Year: ${record.year}`
    : `${name}<br>Data unavailable`;

  layer.bindTooltip(text, {
    sticky: true,
    direction: "auto"
  });

  layer.on({
    mouseover() {
      this.setStyle({
        weight: 2.2,
        color: "#081d36",
        fillOpacity: 1
      });
    },

    mouseout() {
      this.setStyle(countryStyle(feature));
    }
  });
}

async function loadMap() {
  try {
    if (mapStatus) {
      mapStatus.textContent = "Loading country boundaries and indicator data…";
    }

    const geoURL =
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

    const [geoResponse, dataRows] = await Promise.all([
      fetch(geoURL),
      getWorldBank(WB.parliament, "2020:2024")
    ]);

    if (!geoResponse.ok) throw new Error("GeoJSON unavailable.");

    const geoJSON = await geoResponse.json();

    const latest = latestCountryValues(dataRows);

    Object.keys(latest).forEach(code => {
      mapData[code] = latest[code];
    });

    L.geoJSON(geoJSON, {
      style: countryStyle,
      onEachFeature: onCountryFeature
    }).addTo(worldMap);

    if (mapStatus) {
      mapStatus.textContent =
        "Interactive map loaded. Hover over or tap countries to view values.";
    }

  } catch (error) {
    console.error("Map error:", error);

    if (mapStatus) {
      mapStatus.textContent =
        "The interactive map could not load. Check your connection and the data source.";
    }
  }
}


/* LEADER PHOTO FALLBACK */

document.querySelectorAll(".leader-image img").forEach(img => {
  img.addEventListener("error", function() {
    this.parentElement.classList.add("image-error");
  });

  if (img.complete && img.naturalWidth === 0) {
    img.parentElement.classList.add("image-error");
  }
});


/* INITIALISE */

loadGlobalCountryChart();
loadIndiaChart();
loadTrendChart();
loadSupportingCharts();
loadMap();
