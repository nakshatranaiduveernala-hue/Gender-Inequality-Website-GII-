"use strict";

/* ============================================
   BEYOND THE DIVIDE
   Navigation · Map · Data · Charts
============================================ */

const $ = id => document.getElementById(id);


/* NAVIGATION */

function showPage(id) {
  const pages = document.querySelectorAll(".page");
  const target = $(id);

  if (!target) return;

  pages.forEach(page => page.classList.remove("active"));
  target.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  document.querySelector("#mainNav")?.classList.remove("open");
}

document.querySelectorAll("#mainNav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const id = link.getAttribute("href").replace("#", "");
    showPage(id);
    history.replaceState(null, "", "#" + id);
  });
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  if (link.closest("#mainNav")) return;

  link.addEventListener("click", e => {
    const id = link.getAttribute("href").substring(1);
    const target = $(id);

    if (target && target.classList.contains("page")) {
      e.preventDefault();
      showPage(id);
      history.replaceState(null, "", "#" + id);
    }
  });
});

$("menuToggle")?.addEventListener("click", () => {
  $("mainNav")?.classList.toggle("open");
});

const initialPage = location.hash.substring(1);
if (initialPage && $(initialPage)?.classList.contains("page")) {
  showPage(initialPage);
}


/* CHARTS */

const chartInstances = {};

function createChart(id, config) {
  const canvas = $(id);
  if (!canvas || !window.Chart) return;

  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }

  chartInstances[id] = new Chart(canvas, config);
}

function lineChart(id, labels, values, label, unit) {
  createChart(id, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: "#326b95",
        backgroundColor: "rgba(50,107,149,.14)",
        fill: true,
        tension: .3,
        borderWidth: 3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: unit
          }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function barChart(id, labels, values, label, unit) {
  createChart(id, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: "#39739e",
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: unit
          }
        }
      }
    }
  });
}

function chartError(id, text) {
  const canvas = $(id);
  if (!canvas) return;

  const panel = canvas.parentElement;
  let message = panel.querySelector(".chart-error");

  if (!message) {
    message = document.createElement("p");
    message.className = "small chart-error";
    panel.appendChild(message);
  }

  message.textContent = text;
}


/* WORLD BANK */

const indicators = {
  parliament: "SG.GEN.PARL.ZS",
  fertility: "SP.ADO.TFRT",
  maternal: "SH.STA.MMRT"
};

const dataCache = {};

async function fetchWB(code, dates = "1995:2024") {
  const cacheKey = code + dates;
  if (dataCache[cacheKey]) return dataCache[cacheKey];

  const url =
    "https://api.worldbank.org/v2/country/all/indicator/" +
    code +
    "?format=json&date=" +
    dates +
    "&per_page=20000";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Data request failed.");
  }

  const json = await response.json();

  if (!json || !json[1]) {
    throw new Error("No data returned.");
  }

  dataCache[cacheKey] = json[1];
  return json[1];
}

function extractSeries(rows, iso, from = 1995, to = 2024) {
  const data = rows
    .filter(r =>
      r.countryiso3code === iso &&
      r.value !== null &&
      Number(r.date) >= from &&
      Number(r.date) <= to
    )
    .sort((a, b) => Number(a.date) - Number(b.date));

  return {
    labels: data.map(r => r.date),
    values: data.map(r => Number(r.value)),
    records: data
  };
}

function latestCountryValues(rows, limit = 2024) {
  const output = {};

  rows.forEach(row => {
    if (!row.countryiso3code || row.value === null) return;

    const iso = row.countryiso3code;
    const year = Number(row.date);

    if (year > limit) return;

    if (!output[iso] || year > output[iso].year) {
      output[iso] = {
        name: row.country?.value || iso,
        value: Number(row.value),
        year
      };
    }
  });

  return output;
}


/* COUNTRY CHART */

async function loadCountryComparison() {
  try {
    const rows = await fetchWB(indicators.parliament, "2020:2024");
    const latest = latestCountryValues(rows);

    const selected = [
      "RWA", "SWE", "NOR", "FIN", "MEX",
      "IND", "USA", "JPN", "PAK", "NGA"
    ];

    const data = selected.map(code => latest[code]).filter(Boolean);

    if (!data.length) throw new Error("Country data unavailable.");

    barChart(
      "globalCountryChart",
      data.map(d => d.name),
      data.map(d => d.value),
      "Women in parliament",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    chartError("globalCountryChart", "Country comparison unavailable. Visit the World Bank dataset.");
  }
}


/* INDIA CHART */

async function loadIndiaRepresentation() {
  try {
    const rows = await fetchWB(indicators.parliament, "1995:2024");
    const series = extractSeries(rows, "IND");

    if (!series.values.length) throw new Error("India data unavailable.");

    lineChart(
      "indiaChart",
      series.labels,
      series.values,
      "Women in parliament",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    chartError("indiaChart", "India data unavailable.");
  }
}


/* GLOBAL TREND */

async function loadGlobalTrend() {
  try {
    const rows = await fetchWB(indicators.parliament, "1995:2024");
    const series = extractSeries(rows, "WLD");

    if (!series.values.length) throw new Error("Global data unavailable.");

    lineChart(
      "trendChart",
      series.labels,
      series.values,
      "Global representation",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    chartError("trendChart", "Global trend unavailable.");
  }
}


/* INDIA SUPPORTING DATA */

async function loadFertility() {
  try {
    const rows = await fetchWB(indicators.fertility, "1995:2024");
    const series = extractSeries(rows, "IND");

    if (!series.values.length) throw new Error("No data.");

    lineChart(
      "fertilityChart",
      series.labels,
      series.values,
      "Adolescent fertility rate",
      "Births per 1,000 women aged 15–19"
    );

  } catch (error) {
    console.error(error);
    chartError("fertilityChart", "Adolescent fertility data unavailable.");
  }
}

async function loadMaternal() {
  try {
    const rows = await fetchWB(indicators.maternal, "1995:2024");
    const series = extractSeries(rows, "IND");

    if (!series.values.length) throw new Error("No data.");

    lineChart(
      "maternalChart",
      series.labels,
      series.values,
      "Maternal mortality ratio",
      "Deaths per 100,000 live births"
    );

  } catch (error) {
    console.error(error);
    chartError("maternalChart", "Maternal mortality data unavailable.");
  }
}


/* WORLD MAP */

let mapInstance;
let countryLayer;
const mapData = {};

function colour(value) {
  if (value == null) return "#e8edf2";
  if (value < 10) return "#edf5fa";
  if (value < 20) return "#b9d4e5";
  if (value < 30) return "#7daac9";
  if (value < 40) return "#39739e";
  return "#123e68";
}

function isoCode(feature) {
  const p = feature.properties || {};

  return p.ISO_A3 ||
    p.iso_a3 ||
    p.ADM0_A3 ||
    p.ISO3 ||
    p.A3 ||
    null;
}

function countryName(feature) {
  const p = feature.properties || {};
  return p.ADMIN || p.name || p.NAME || "Country";
}

function featureStyle(feature) {
  const code = isoCode(feature);
  const value = mapData[code]?.value;

  return {
    fillColor: colour(value),
    fillOpacity: .85,
    color: "#ffffff",
    weight: .7
  };
}

function addMapInteractions(feature, layer) {
  const code = isoCode(feature);
  const name = countryName(feature);
  const data = mapData[code];

  const tooltip = data
    ? `${name}<br>Women in parliament: ${data.value.toFixed(1)}%<br>Year: ${data.year}`
    : `${name}<br>Data unavailable`;

  layer.bindTooltip(tooltip, { sticky: true });

  layer.on({
    mouseover() {
      this.setStyle({
        weight: 2,
        color: "#071c34",
        fillOpacity: 1
      });
    },
    mouseout() {
      this.setStyle(featureStyle(feature));
    }
  });
}

async function loadMap() {
  const status = $("mapStatus");

  if (!window.L) {
    status.textContent = "Leaflet map library unavailable.";
    return;
  }

  try {
    status.textContent = "Loading interactive map…";

    mapInstance = L.map("worldMap", {
      minZoom: 1,
      maxZoom: 5,
      scrollWheelZoom: false
    }).setView([20, 0], 2);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 5
      }
    ).addTo(mapInstance);

    const geoURL =
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

    const [geoResponse, rows] = await Promise.all([
      fetch(geoURL),
      fetchWB(indicators.parliament, "2020:2024")
    ]);

    if (!geoResponse.ok) throw new Error("GeoJSON unavailable.");

    const geoJSON = await geoResponse.json();
    const latest = latestCountryValues(rows);

    Object.assign(mapData, latest);

    countryLayer = L.geoJSON(geoJSON, {
      style: featureStyle,
      onEachFeature: addMapInteractions
    }).addTo(mapInstance);

    status.textContent = "Map loaded. Tap or hover over a country to view data.";
    mapInstance.invalidateSize();

  } catch (error) {
    console.error(error);
    status.textContent = "Map could not load. Check your connection or visit the World Bank source.";
  }
}


/* VIDEO EMBED */

$("embedVideo")?.addEventListener("click", () => {
  const raw = $("videoURL").value.trim();
  const container = $("videoContainer");

  if (!raw) {
    container.textContent = "Paste a video URL first.";
    return;
  }

  let embedURL = "";

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");

      if (id) {
        embedURL = "https://www.youtube-nocookie.com/embed/" + id;
      } else if (url.pathname.startsWith("/embed/")) {
        embedURL = "https://www.youtube-nocookie.com" + url.pathname;
      }
    }

    if (url.hostname === "youtu.be") {
      embedURL = "https://www.youtube-nocookie.com/embed/" + url.pathname.substring(1);
    }

    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();

      if (/^\d+$/.test(id)) {
        embedURL = "https://player.vimeo.com/video/" + id;
      }
    }

  } catch (error) {
    console.error(error);
  }

  if (!embedURL) {
    container.textContent = "Unsupported video URL. Use YouTube or Vimeo.";
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = embedURL;
  iframe.title = "Criterion C speech video";
  iframe.width = "100%";
  iframe.height = "400";
  iframe.allow = "fullscreen; picture-in-picture";
  iframe.setAttribute("allowfullscreen", "");
  iframe.loading = "lazy";

  container.replaceChildren(iframe);
});


/* INITIALIZATION */

loadCountryComparison();
loadIndiaRepresentation();
loadGlobalTrend();
loadFertility();
loadMaternal();
loadMap();
