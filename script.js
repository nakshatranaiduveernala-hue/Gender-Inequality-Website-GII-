"use strict";

/* ==============================================
   BEYOND THE DIVIDE
   Navigation · Geographic Explorer · Charts
================================================ */

const $ = id => document.getElementById(id);

/* ---------- NAVIGATION ---------- */

function showPage(id) {
  const target = $(id);
  if (!target) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  document.querySelectorAll("#mainNav a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + id);
  });

  $("mainNav")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (mapInstance && id === "indicator") {
    setTimeout(() => mapInstance.invalidateSize(), 250);
  }
}

document.querySelectorAll("#mainNav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const id = link.getAttribute("href").slice(1);
    showPage(id);
    history.replaceState(null, "", "#" + id);
  });
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  if (link.closest("#mainNav")) return;

  link.addEventListener("click", e => {
    const id = link.getAttribute("href").slice(1);
    if ($(id)?.classList.contains("page")) {
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


/* ---------- CHARTS ---------- */

const chartInstances = {};

function createChart(id, config) {
  const canvas = $(id);
  if (!canvas || !window.Chart) return;

  if (chartInstances[id]) chartInstances[id].destroy();

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
        borderColor: "#376f9b",
        backgroundColor: "rgba(55,111,155,.14)",
        fill: true,
        tension: .25,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: "index", intersect: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: unit }
        },
        x: { grid: { display: false } }
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
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: unit }
        }
      }
    }
  });
}

function chartError(id, message) {
  const canvas = $(id);
  if (!canvas) return;

  const panel = canvas.parentElement;
  let error = panel.querySelector(".chart-error");

  if (!error) {
    error = document.createElement("p");
    error.className = "small chart-error";
    panel.appendChild(error);
  }

  error.textContent = message;
}


/* ---------- WORLD BANK ---------- */

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

  if (!response.ok) throw new Error("World Bank request failed.");

  const json = await response.json();

  if (!json || !json[1]) throw new Error("No data returned.");

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


/* ---------- COUNTRY COMPARISON CHART ---------- */

async function loadCountryComparison() {
  try {
    const rows = await fetchWB(indicators.parliament, "2020:2024");
    const latest = latestCountryValues(rows);

    const selected = [
      "RWA", "SWE", "NOR", "FIN", "MEX",
      "IND", "USA", "JPN", "PAK", "NGA"
    ];

    const data = selected.map(code => latest[code]).filter(Boolean);

    if (!data.length) throw new Error("No comparison data.");

    barChart(
      "globalCountryChart",
      data.map(d => d.name),
      data.map(d => d.value),
      "Women in parliament",
      "Seats held by women (%)"
    );
  } catch (error) {
    console.error(error);
    chartError("globalCountryChart", "Country comparison unavailable.");
  }
}


/* ---------- INDIA ---------- */

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


/* ---------- GLOBAL TREND ---------- */

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


/* ---------- GLOBAL EQUITY EXPLORER ---------- */

let mapInstance;
let countryLayer;
let selectedFeatureLayer;
const mapData = {};
const geoFeatures = [];
const comparison = [];
let selectedCountryCode = null;
let compareChartInstance = null;

const countryRegion = {
  AFR: "Africa",
  ASI: "Asia",
  EUR: "Europe",
  AME: "Americas",
  OCE: "Oceania"
};

const countryRegions = {
  "RWA":"Africa","NGA":"Africa","ZAF":"Africa","KEN":"Africa",
  "GHA":"Africa","EGY":"Africa","ETH":"Africa","UGA":"Africa",
  "TZA":"Africa","SEN":"Africa","MAR":"Africa","DZA":"Africa",
  "CMR":"Africa","COD":"Africa","BWA":"Africa","MOZ":"Africa",
  "IND":"Asia","PAK":"Asia","BGD":"Asia","NPL":"Asia",
  "LKA":"Asia","AFG":"Asia","CHN":"Asia","JPN":"Asia",
  "KOR":"Asia","IDN":"Asia","PHL":"Asia","THA":"Asia",
  "VNM":"Asia","MYS":"Asia","SGP":"Asia","IRN":"Asia",
  "IRQ":"Asia","SAU":"Asia","TUR":"Asia","KAZ":"Asia",
  "UZB":"Asia","MMR":"Asia","KHM":"Asia","LAO":"Asia",
  "SWE":"Europe","NOR":"Europe","FIN":"Europe","DNK":"Europe",
  "ISL":"Europe","GBR":"Europe","IRL":"Europe","FRA":"Europe",
  "DEU":"Europe","ESP":"Europe","ITA":"Europe","PRT":"Europe",
  "NLD":"Europe","BEL":"Europe","CHE":"Europe","AUT":"Europe",
  "POL":"Europe","CZE":"Europe","SVK":"Europe","HUN":"Europe",
  "ROU":"Europe","BGR":"Europe","GRC":"Europe","HRV":"Europe",
  "SRB":"Europe","UKR":"Europe","RUS":"Europe","EST":"Europe",
  "LVA":"Europe","LTU":"Europe","ALB":"Europe","MDA":"Europe",
  "USA":"Americas","CAN":"Americas","MEX":"Americas",
  "BRA":"Americas","ARG":"Americas","CHL":"Americas",
  "COL":"Americas","PER":"Americas","URY":"Americas",
  "ECU":"Americas","BOL":"Americas","VEN":"Americas",
  "CUB":"Americas","DOM":"Americas","HTI":"Americas",
  "JAM":"Americas","CRI":"Americas","PAN":"Americas",
  "AUS":"Oceania","NZL":"Oceania","FJI":"Oceania",
  "PNG":"Oceania","SLB":"Oceania","VUT":"Oceania"
};

function colour(value) {
  if (value == null) return "#8794a0";
  if (value < 10) return "#edf5fa";
  if (value < 20) return "#b9d4e5";
  if (value < 30) return "#7daac9";
  if (value < 40) return "#39739e";
  return "#123e68";
}

function isoCode(feature) {
  const p = feature.properties || {};
  return p.ISO_A3 || p.iso_a3 || p.ADM0_A3 || p.ISO3 || p.A3 || null;
}

function countryName(feature) {
  const p = feature.properties || {};
  return p.ADMIN || p.name || p.NAME || p.name_long || "Country";
}

function regionFor(code) {
  return countryRegions[code] || "Region unavailable";
}

function featureStyle(feature) {
  const code = isoCode(feature);
  const value = mapData[code]?.value;

  return {
    fillColor: colour(value),
    fillOpacity: .9,
    color: "#263e54",
    weight: .65
  };
}

function highlightStyle() {
  return {
    color: "#c6a46a",
    weight: 3,
    fillOpacity: 1
  };
}

function clearSelectionHighlight() {
  if (selectedFeatureLayer && countryLayer) {
    countryLayer.resetStyle(selectedFeatureLayer);
  }
  selectedFeatureLayer = null;
}

function selectCountry(feature, layer) {
  const code = isoCode(feature);
  const name = countryName(feature);

  if (!code) return;

  selectedCountryCode = code;
  clearSelectionHighlight();

  selectedFeatureLayer = layer;
  layer.setStyle(highlightStyle());

  const data = mapData[code];

  $("countryEmpty").hidden = true;
  $("countryDetails").hidden = false;

  $("selectedCountryName").textContent = name;
  $("selectedValue").textContent =
    data ? data.value.toFixed(1) + "%" : "No data";

  $("selectedYear").textContent = data ? data.year : "Unavailable";
  $("selectedRegion").textContent = regionFor(code);

  $("countryAnalysis").textContent = data
    ? `${name} has ${data.value.toFixed(1)}% of parliamentary seats held by women in ${data.year}. This value can be compared with other countries and regional patterns. The statistic measures representation, but does not by itself explain the political, economic or social factors influencing the result.`
    : `Data for ${name} was not available in the loaded dataset. Missing information should not be interpreted as zero representation.`;

  $("addComparison").disabled = !data;
}

function addMapInteractions(feature, layer) {
  const code = isoCode(feature);
  const name = countryName(feature);
  const data = mapData[code];

  layer.bindTooltip(
    data
      ? `${name}<br>${data.value.toFixed(1)}% · ${data.year}`
      : `${name}<br>Data unavailable`,
    { sticky: true }
  );

  layer.on("click", () => selectCountry(feature, layer));

  layer.on("mouseover", function() {
    if (this !== selectedFeatureLayer) {
      this.setStyle({ weight: 2, color: "#c6a46a" });
    }
  });

  layer.on("mouseout", function() {
    if (this !== selectedFeatureLayer && countryLayer) {
      countryLayer.resetStyle(this);
    }
  });
}

async function loadMap() {
  const status = $("mapStatus");

  if (!window.L) {
    status.textContent = "Map library unavailable.";
    return;
  }

  try {
    status.textContent = "Loading geographic data…";

    mapInstance = L.map("worldMap", {
      minZoom: 1,
      maxZoom: 5,
      scrollWheelZoom: false,
      zoomControl: true
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

    if (!geoResponse.ok) throw new Error("Geographic dataset unavailable.");

    const geoJSON = await geoResponse.json();
    const latest = latestCountryValues(rows);

    Object.assign(mapData, latest);
    geoFeatures.push(...geoJSON.features);

    countryLayer = L.geoJSON(geoJSON, {
      style: featureStyle,
      onEachFeature: addMapInteractions
    }).addTo(mapInstance);

    status.textContent = "Map loaded. Click a country to explore its data.";
    mapInstance.invalidateSize();

  } catch (error) {
    console.error(error);
    status.textContent = "Map could not load. Check your connection or data sources.";
  }
}


/* ---------- REGION FILTER ---------- */

$("regionFilter")?.addEventListener("change", function() {
  const region = this.value;

  if (!countryLayer) return;

  countryLayer.eachLayer(layer => {
    const code = isoCode(layer.feature);
    const countryRegionName = regionFor(code);

    if (region === "all" || countryRegionName === region) {
      layer.setStyle({
        opacity: 1,
        fillOpacity: .9
      });
      layer.getElement?.()?.classList.remove("filtered-out");
    } else {
      layer.setStyle({
        opacity: .15,
        fillOpacity: .08
      });
    }
  });
});

$("resetMap")?.addEventListener("click", () => {
  if (!countryLayer) return;

  $("regionFilter").value = "all";
  $("countrySearch").value = "";
  $("searchResults").innerHTML = "";

  countryLayer.eachLayer(layer => countryLayer.resetStyle(layer));

  mapInstance.setView([20, 0], 2);

  clearSelectionHighlight();

  $("countryEmpty").hidden = false;
  $("countryDetails").hidden = true;

  selectedCountryCode = null;
});


/* ---------- COUNTRY SEARCH ---------- */

$("countrySearch")?.addEventListener("input", function() {
  const query = this.value.trim().toLowerCase();
  const results = $("searchResults");

  results.innerHTML = "";

  if (!query || !geoFeatures.length) return;

  const matches = geoFeatures
    .filter(f => countryName(f).toLowerCase().includes(query))
    .slice(0, 8);

  matches.forEach(feature => {
    const name = countryName(feature);
    const button = document.createElement("button");

    button.className = "search-result";
    button.textContent = name;
    button.type = "button";

    button.addEventListener("click", () => {
      const layer = countryLayer.getLayers().find(
        l => isoCode(l.feature) === isoCode(feature)
      );

      if (layer) {
        mapInstance.fitBounds(layer.getBounds(), { maxZoom: 4 });
        selectCountry(feature, layer);
      }

      results.innerHTML = "";
      $("countrySearch").value = name;
    });

    results.appendChild(button);
  });
});


/* ---------- COUNTRY COMPARISON ---------- */

function renderComparison() {
  const list = $("compareList");
  if (!list) return;

  list.innerHTML = "";

  comparison.forEach(item => {
    const row = document.createElement("div");
    row.className = "compare-country";

    const label = document.createElement("span");
    label.textContent = `${item.name} · ${item.value.toFixed(1)}% (${item.year})`;

    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.type = "button";

    remove.addEventListener("click", () => {
      const index = comparison.findIndex(c => c.code === item.code);
      if (index >= 0) comparison.splice(index, 1);
      renderComparison();
    });

    row.append(label, remove);
    list.appendChild(row);
  });

  updateCompareChart();
}

function updateCompareChart() {
  if (!window.Chart || !$("compareChart")) return;

  if (compareChartInstance) compareChartInstance.destroy();

  if (!comparison.length) {
    compareChartInstance = null;
    return;
  }

  compareChartInstance = new Chart($("compareChart"), {
    type: "bar",
    data: {
      labels: comparison.map(c => c.name),
      datasets: [{
        label: "Women in Parliament (%)",
        data: comparison.map(c => c.value),
        backgroundColor: "#39739e",
        borderRadius: 6
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
          max: 100,
          title: { display: true, text: "Seats held by women (%)" }
        }
      }
    }
  });
}

$("addComparison")?.addEventListener("click", () => {
  if (!selectedCountryCode || !mapData[selectedCountryCode]) return;

  const item = {
    code: selectedCountryCode,
    name: mapData[selectedCountryCode].name,
    value: mapData[selectedCountryCode].value,
    year: mapData[selectedCountryCode].year
  };

  if (comparison.some(c => c.code === item.code)) return;

  if (comparison.length >= 3) {
    alert("You can compare up to three countries. Remove a country to add another.");
    return;
  }

  comparison.push(item);
  renderComparison();
});

$("clearCompare")?.addEventListener("click", () => {
  comparison.length = 0;
  renderComparison();
});


/* ---------- VIDEO EMBED ---------- */

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

      if (id) embedURL = "https://www.youtube-nocookie.com/embed/" + id;
      else if (url.pathname.startsWith("/embed/"))
        embedURL = "https://www.youtube-nocookie.com" + url.pathname;
    }

    if (url.hostname === "youtu.be") {
      embedURL = "https://www.youtube-nocookie.com/embed/" +
        url.pathname.substring(1);
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


/* ---------- INITIALIZATION ---------- */

loadCountryComparison();
loadIndiaRepresentation();
loadGlobalTrend();
loadFertility();
loadMaternal();
loadMap();
