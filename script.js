"use strict";

/* =============================================
   BEYOND THE DIVIDE
   Navigation · Charts · Data · Map
============================================= */

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


/* CHARTS */

const chartInstances = {};

if (window.Chart) {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = "#647e98";
  Chart.defaults.plugins.legend.display = true;
  Chart.defaults.plugins.tooltip.backgroundColor = "#081d36";
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
}

function drawChart(id, config) {
  const canvas = $(id);
  if (!canvas || !window.Chart) return;

  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }

  chartInstances[id] = new Chart(canvas, config);
}

function drawLine(id, labels, values, label, unit) {
  drawChart(id, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: "#3477a5",
        backgroundColor: "rgba(52,119,165,.15)",
        fill: true,
        tension: .3,
        pointRadius: 3,
        pointHoverRadius: 6,
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

function drawBar(id, labels, values, label, unit) {
  drawChart(id, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
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

const cache = {};

async function getWB(indicator, years = "1995:2024") {
  const key = indicator + years;
  if (cache[key]) return cache[key];

  const url =
    "https://api.worldbank.org/v2/country/all/indicator/" +
    indicator +
    "?format=json&date=" +
    years +
    "&per_page=20000";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("World Bank request failed.");
  }

  const data = await response.json();

  if (!data || !data[1]) {
    throw new Error("No data returned.");
  }

  cache[key] = data[1];
  return data[1];
}

function seriesFor(rows, iso, start = 1995, end = 2024) {
  const result = rows.filter(row =>
    row.countryiso3code === iso &&
    row.value !== null &&
    Number(row.date) >= start &&
    Number(row.date) <= end
  );

  result.sort((a, b) => Number(a.date) - Number(b.date));

  return {
    labels: result.map(r => r.date),
    values: result.map(r => Number(r.value)),
    records: result
  };
}

function latestByCountry(rows, yearLimit = 2024) {
  const output = {};

  rows.forEach(row => {
    if (!row.countryiso3code || row.value === null) return;

    const year = Number(row.date);
    if (year > yearLimit) return;

    const iso = row.countryiso3code;

    if (!output[iso] || year > output[iso].year) {
      output[iso] = {
        value: Number(row.value),
        year,
        name: row.country?.value || iso
      };
    }
  });

  return output;
}


/* GLOBAL COUNTRY COMPARISON */

async function loadCountryChart() {
  try {
    const rows = await getWB(WB.parliament, "2020:2024");
    const latest = latestByCountry(rows);

    const codes = [
      "RWA", "SWE", "NOR", "FIN", "MEX",
      "IND", "USA", "JPN", "PAK", "NGA"
    ];

    const data = codes.map(code => latest[code]).filter(Boolean);

    if (!data.length) throw new Error("Country data unavailable.");

    drawBar(
      "globalCountryChart",
      data.map(d => d.name),
      data.map(d => d.value),
      "Women in parliament",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    showChartMessage("globalCountryChart", "Country comparison could not be loaded. Open the World Bank source to view the data.");
  }
}


/* INDIA CHART */

async function loadIndiaChart() {
  try {
    const rows = await getWB(WB.parliament, "1995:2024");
    const series = seriesFor(rows, "IND");

    if (!series.values.length) throw new Error("India data unavailable.");

    drawLine(
      "indiaChart",
      series.labels,
      series.values,
      "Women in parliament",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    showChartMessage("indiaChart", "India's data could not be loaded.");
  }
}


/* GLOBAL TREND */

async function loadGlobalTrend() {
  try {
    const rows = await getWB(WB.parliament, "1995:2024");
    const series = seriesFor(rows, "WLD");

    if (!series.values.length) {
      throw new Error("Global trend unavailable.");
    }

    drawLine(
      "trendChart",
      series.labels,
      series.values,
      "Global representation",
      "Seats held by women (%)"
    );

  } catch (error) {
    console.error(error);
    showChartMessage("trendChart", "The global time series could not be loaded.");
  }
}


/* INDIA SUPPORTING INDICATORS */

async function loadSupportingCharts() {
  try {
    const rows = await getWB(WB.fertility, "1995:2024");
    const series = seriesFor(rows, "IND");

    if (series.values.length) {
      drawLine(
        "fertilityChart",
        series.labels,
        series.values,
        "Adolescent fertility rate",
        "Births per 1,000 women aged 15–19"
      );
    } else {
      showChartMessage("fertilityChart", "Data unavailable.");
    }

  } catch (error) {
    console.error(error);
    showChartMessage("fertilityChart", "Adolescent fertility data could not be loaded.");
  }

  try {
    const rows = await getWB(WB.maternal, "1995:2024");
    const series = seriesFor(rows, "IND");

    if (series.values.length) {
      drawLine(
        "maternalChart",
        series.labels,
        series.values,
        "Maternal mortality ratio",
        "Deaths per 100,000 live births"
      );
    } else {
      showChartMessage("maternalChart", "Data unavailable.");
    }

  } catch (error) {
    console.error(error);
    showChartMessage("maternalChart", "Maternal mortality data could not be loaded.");
  }
}


/* CHART ERROR MESSAGE */

function showChartMessage(id, message) {
  const canvas = $(id);
  if (!canvas) return;

  const panel = canvas.parentElement;

  if (!panel.querySelector(".chart-error")) {
    const error = document.createElement("p");
    error.className = "chart-error small";
    error.textContent = message;
    panel.appendChild(error);
  }
}


/* MAP */

let map = null;
let geoLayer = null;
const mapData = {};

function mapColour(value) {
  if (value === null || value === undefined || isNaN(value)) return "#e8edf2";
  if (value < 10) return "#edf5fa";
  if (value < 20) return "#b9d4e5";
  if (value < 30) return "#7daac9";
  if (value < 40) return "#39739e";
  return "#123e68";
}

function getISO(feature) {
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

function getName(feature) {
  const p = feature.properties || {};
  return p.ADMIN || p.name || p.NAME || p.name_en || "Country";
}

function styleFeature(feature) {
  const iso = getISO(feature);
  const value = mapData[iso]?.value;

  return {
    fillColor: mapColour(value),
    fillOpacity: .85,
    color: "#fff",
    weight: .7
  };
}

function addFeatureInteractions(feature, layer) {
  const iso = getISO(feature);
  const name = getName(feature);
  const data = mapData[iso];

  const text = data
    ? `${name}<br>Women in parliament: ${data.value.toFixed(1)}%<br>Data year: ${data.year}`
    : `${name}<br>Data unavailable`;

  layer.bindTooltip(text, {
    sticky: true,
    direction: "auto"
  });

  layer.on({
    mouseover() {
      this.setStyle({
        color: "#081d36",
        weight: 2,
        fillOpacity: 1
      });
    },

    mouseout() {
      this.setStyle(styleFeature(feature));
    }
  });
}

async function loadMap() {
  const status = $("mapStatus");

  if (!window.L) {
    if (status) status.textContent = "Map library unavailable. The map could not be initialized.";
    return;
  }

  try {
    if (status) status.textContent = "Loading country boundaries and data…";

    map = L.map("worldMap", {
      zoomControl: true,
      scrollWheelZoom: false,
      minZoom: 1,
      maxZoom: 5,
      worldCopyJump: true
    }).setView([20, 0], 2);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 5
      }
    ).addTo(map);

    const geoURL =
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

    const [geoResponse, dataRows] = await Promise.all([
      fetch(geoURL),
      getWB(WB.parliament, "2020:2024")
    ]);

    if (!geoResponse.ok) {
      throw new Error("Country boundary data unavailable.");
    }

    const geoJSON = await geoResponse.json();
    const latest = latestByCountry(dataRows);

    Object.assign(mapData, latest);

    geoLayer = L.geoJSON(geoJSON, {
      style: styleFeature,
      onEachFeature: addFeatureInteractions
    }).addTo(map);

    if (status) {
      status.textContent = "Map loaded. Hover over or tap a country to see available data.";
    }

    map.invalidateSize();

  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent = "Map data could not be loaded. Check your internet connection or open the World Bank dataset.";
    }
  }
}


/* GLOBAL SNAPSHOT */

async function loadGlobalSnapshot() {
  try {
    const rows = await getWB(WB.parliament, "2020:2024");
    const global = latestByCountry(rows)["WLD"];

    if (global) {
      $("globalSnapshot").textContent = global.value.toFixed(1) + "%";
    }

  } catch (error) {
    console.error(error);
    $("globalSnapshot").textContent = "Unavailable";
  }
}


/* LEADER IMAGE FALLBACK */

document.querySelectorAll(".leader-image img").forEach(img => {
  img.addEventListener("error", () => {
    img.parentElement.classList.add("image-error");
  });

  if (img.complete && img.naturalWidth === 0) {
    img.parentElement.classList.add("image-error");
  }
});


/* VIDEO EMBED */

$("embedVideo")?.addEventListener("click", () => {
  const input = $("videoURL");
  const container = $("videoContainer");

  const raw = input.value.trim();

  if (!raw) {
    container.textContent = "Please paste a video URL.";
    return;
  }

  let embedURL = "";

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtube.com")) {
      const videoID = url.searchParams.get("v");

      if (videoID) {
        embedURL = "https://www.youtube-nocookie.com/embed/" + videoID;
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
    container.textContent = "This link cannot be embedded here. Use a supported YouTube or Vimeo link.";
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = embedURL;
  iframe.title = "Speech video";
  iframe.width = "100%";
  iframe.height = "400";
  iframe.loading = "lazy";
  iframe.allow = "fullscreen; picture-in-picture";
  iframe.setAttribute("allowfullscreen", "");

  container.replaceChildren(iframe);
});


/* INITIALIZE */

loadCountryChart();
loadIndiaChart();
loadGlobalTrend();
loadSupportingCharts();
loadGlobalSnapshot();
loadMap();
