/* BEYOND THE DIVIDE
   Interactive navigation, World Bank charts and no-key Leaflet map.
*/

const nav = document.getElementById("mainNav");
const menuToggle = document.getElementById("menuToggle");
const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav-link");

function showPage(id) {
  pages.forEach(page => page.classList.toggle("active", page.id === id));

  navLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + id);
  });

  nav.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "trends") {
    setTimeout(() => Object.values(charts).forEach(chart => chart.resize()), 100);
  }

  if (id === "indicator") {
    setTimeout(() => {
      if (worldMap) worldMap.invalidateSize();
    }, 150);
  }
}

navLinks.forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const id = link.getAttribute("href").slice(1);
    showPage(id);
    history.replaceState(null, "", "#" + id);
  });
});

document.querySelectorAll(".brand, .primary-link").forEach(link => {
  link.addEventListener("click", event => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      event.preventDefault();
      showPage(href.slice(1));
    }
  });
});

menuToggle.addEventListener("click", () => nav.classList.toggle("open"));

const initialPage = location.hash ? location.hash.slice(1) : "home";
if (document.getElementById(initialPage)) showPage(initialPage);

/* WORLD BANK DATA */

const countryCodes = {
  India: "IND",
  Rwanda: "RWA",
  Sweden: "SWE",
  Japan: "JPN",
  "United States": "USA",
  Bangladesh: "BGD",
  Nepal: "NPL",
  Pakistan: "PAK",
  "United Kingdom": "GBR",
  Brazil: "BRA"
};

const countryNames = Object.fromEntries(
  Object.entries(countryCodes).map(([name, code]) => [code, name])
);

const indicatorInfo = {
  "SG.GEN.PARL.ZS": {
    title: "Women in national parliaments",
    unit: "%",
    higherIsBetter: true
  },
  "SP.ADO.TFRT": {
    title: "Adolescent fertility rate",
    unit: " births per 1,000",
    higherIsBetter: false
  },
  "SH.STA.MMRT": {
    title: "Maternal mortality ratio",
    unit: " deaths per 100,000 live births",
    higherIsBetter: false
  }
};

const chartCountries = [
  "RWA", "SWE", "GBR", "USA", "IND", "BRA", "BGD", "PAK", "JPN", "NPL"
];

const charts = {};

async function fetchCountryIndicator(indicator, countryCode) {
  const url =
    `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=70`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("World Bank request failed");

  const json = await response.json();
  const observations = json[1] || [];

  const latest = observations.find(item =>
    item.value !== null && item.value !== undefined
  );

  return latest ? {
    value: Number(latest.value),
    year: latest.date
  } : null;
}

async function fetchAllCountries(indicator) {
  const results = await Promise.all(
    chartCountries.map(async code => {
      try {
        const result = await fetchCountryIndicator(indicator, code);
        return {
          code,
          name: countryNames[code] || code,
          value: result ? result.value : null,
          year: result ? result.year : "No data"
        };
      } catch {
        return {
          code,
          name: countryNames[code] || code,
          value: null,
          year: "Unavailable"
        };
      }
    })
  );
  return results;
}

function createBarChart(canvasId, data, label, suffix = "") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const available = data.filter(item => item.value !== null);

  charts[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: available.map(item => item.name),
      datasets: [{
        label,
        data: available.map(item => item.value),
        backgroundColor: available.map(() => "#4f86a8"),
        borderColor: "#24577b",
        borderWidth: 1,
        borderRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context =>
              `${context.parsed.y.toFixed(1)}${suffix}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#e8eef2" },
          ticks: { color: "#687b89" }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: "#536777",
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
}

async function loadCharts() {
  try {
    const [parliament, fertility, maternal] = await Promise.all([
      fetchAllCountries("SG.GEN.PARL.ZS"),
      fetchAllCountries("SP.ADO.TFRT"),
      fetchAllCountries("SH.STA.MMRT")
    ]);

    createBarChart(
      "parliamentChart",
      parliament,
      "Women in Parliament",
      "%"
    );

    createBarChart(
      "fertilityChart",
      fertility,
      "Adolescent fertility rate"
    );

    createBarChart(
      "maternalChart",
      maternal,
      "Maternal mortality ratio"
    );
  } catch (error) {
    console.error("Chart data could not be loaded:", error);
    document.querySelectorAll(".chart-note").forEach(note => {
      note.textContent += " If the chart is blank, the data service may be temporarily unavailable; try refreshing the page.";
    });
  }
}

loadCharts();

/* INTERACTIVE WORLD MAP
   Uses Leaflet + OpenStreetMap tiles + public GeoJSON.
   No API key or paid map account is required.
*/

let worldMap = null;
let countryLayer = null;
let currentMapData = {};
let currentGeoJSON = null;

const mapStatus = document.getElementById("mapStatus");
const mapSelector = document.getElementById("mapIndicator");

function mapColour(value, indicator) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "#dce4e9";
  }

  const ranges = {
    "SG.GEN.PARL.ZS": [0, 10, 20, 30, 40, 50],
    "SP.ADO.TFRT": [0, 10, 25, 50, 100, 150],
    "SH.STA.MMRT": [0, 20, 50, 100, 300, 600]
  };

  const scale = ranges[indicator] || ranges["SG.GEN.PARL.ZS"];

  if (value <= scale[1]) return "#e3edf3";
  if (value <= scale[2]) return "#c4d9e6";
  if (value <= scale[3]) return "#8fb4ca";
  if (value <= scale[4]) return "#4f86a8";
  return "#173e5c";
}

function getFeatureCode(feature) {
  const properties = feature.properties || {};

  const possibleCodes = [
    properties.ISO_A3,
    properties.ISO3,
    properties.ADM0_A3,
    properties.iso_a3,
    properties.SOV_A3
  ];

  return possibleCodes.find(code =>
    code && code !== "-99" && code.length === 3
  );
}

function createCountryStyle(feature, indicator) {
  const code = getFeatureCode(feature);
  const value = code && currentMapData[code]
    ? currentMapData[code].value
    : null;

  return {
    fillColor: mapColour(value, indicator),
    weight: 0.7,
    opacity: 1,
    color: "#ffffff",
    fillOpacity: 0.85
  };
}

function countryPopup(feature) {
  const code = getFeatureCode(feature);
  const record = code ? currentMapData[code] : null;
  const country =
    feature.properties.ADMIN ||
    feature.properties.name ||
    feature.properties.NAME ||
    code ||
    "Country";

  if (!record || record.value === null) {
    return `<strong>${country}</strong><br>Data unavailable for this indicator.`;
  }

  const info = indicatorInfo[mapSelector.value];

  return `
    <strong>${country}</strong><br>
    ${info.title}: <b>${record.value.toFixed(1)}${info.unit}</b><br>
    Observation year: ${record.year}
  `;
}

function onEachCountry(feature, layer) {
  layer.bindPopup(countryPopup(feature));

  layer.on({
    mouseover: event => {
      event.target.setStyle({
        weight: 2,
        color: "#102b46",
        fillOpacity: 1
      });
      event.target.bringToFront();
    },
    mouseout: event => {
      if (countryLayer) countryLayer.resetStyle(event.target);
    }
  });
}

async function loadIndicatorMap(indicator) {
  if (!worldMap) return;

  mapStatus.textContent = "Loading the latest available country observations…";

  try {
    const response = await fetch(
      `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000`
    );

    if (!response.ok) throw new Error("Could not retrieve indicator data");

    const json = await response.json();
    const rows = json[1] || [];

    currentMapData = {};

    // Keep the latest non-null observation for each country.
    rows.forEach(row => {
      const code = row.countryiso3code;
      if (!code || row.value === null || row.value === undefined) return;

      if (!currentMapData[code]) {
        currentMapData[code] = {
          value: Number(row.value),
          year: row.date
        };
      }
    });

    if (countryLayer) worldMap.removeLayer(countryLayer);

    countryLayer = L.geoJSON(currentGeoJSON, {
      style: feature => createCountryStyle(feature, indicator),
      onEachFeature: onEachCountry
    }).addTo(worldMap);

    const count = Object.keys(currentMapData).length;
    mapStatus.textContent =
      `${count} country observations loaded. Select a country to view its value and observation year. Countries without available data are grey.`;
  } catch (error) {
    console.error("Map data error:", error);
    mapStatus.textContent =
      "The map could not load live indicator data. Check your internet connection and refresh the page.";
  }
}

async function initialiseMap() {
  const mapElement = document.getElementById("worldMap");
  if (!mapElement || typeof L === "undefined") {
    mapStatus.textContent = "The map library could not load.";
    return;
  }

  worldMap = L.map("worldMap", {
    scrollWheelZoom: false,
    worldCopyJump: true
  }).setView([18, 10], 2);

  // OpenStreetMap tiles are free to use with attribution.
  // This does not require a Mapbox, CARTO or Google API key.
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 6
  }).addTo(worldMap);

  try {
    const geoResponse = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );

    if (!geoResponse.ok) throw new Error("Country boundaries unavailable");

    currentGeoJSON = await geoResponse.json();
    await loadIndicatorMap(mapSelector.value);
  } catch (error) {
    console.error("Map boundary error:", error);
    mapStatus.textContent =
      "Country boundaries could not be loaded. Please refresh the page or try again later.";
  }
}

mapSelector.addEventListener("change", () => {
  loadIndicatorMap(mapSelector.value);
});

initialiseMap();

/* VIDEO EMBED */

document.getElementById("loadVideo").addEventListener("click", () => {
  const input = document.getElementById("videoUrl").value.trim();
  const container = document.getElementById("videoContainer");

  let videoId = "";

  try {
    const url = new URL(input);

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.slice(1);
    } else if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2];
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2];
      }
    }
  } catch {
    container.innerHTML = "<p>Please enter a valid YouTube link.</p>";
    return;
  }

  if (!videoId) {
    container.innerHTML = "<p>That link was not recognised as a YouTube video. Please check it and try again.</p>";
    return;
  }

  container.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}"
      title="Project awareness speech"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;
});
