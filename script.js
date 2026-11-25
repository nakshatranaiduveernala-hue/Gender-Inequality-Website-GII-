"use strict";

/* ========================================================
   BEYOND THE DIVIDE
   Navigation, chart rendering, interactive world map
======================================================== */

const $ = (selector) => document.querySelector(selector);

/* NAVIGATION */

const nav = $("#mainNav");
const menuToggle = $("#menuToggle");

menuToggle?.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll("#mainNav a").forEach(link => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll("#mainNav a");

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
}, { rootMargin: "-30% 0px -60% 0px" });

sections.forEach(section => observer.observe(section));


/* CHARTS */

Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = "#647e98";
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = "#081d36";
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 4;

function makeLineChart(id, labels, values, title) {
  const canvas = document.getElementById(id);
  if (!canvas) return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: values,
        borderColor: "#2b6c9e",
        backgroundColor: "rgba(43,108,158,.12)",
        fill: true,
        tension: .35,
        pointRadius: 5,
        pointHoverRadius: 8,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        intersect: false,
        mode: "index"
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#e4ebf1" },
          title: {
            display: true,
            text: "Percentage (%)"
          }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
}


/* GLOBAL TREND
   Endpoint comparison only.
   Add verified intermediate data if you want a full time series.
*/

makeLineChart(
  "globalTrendChart",
  ["1995", "2025"],
  [11.3, 27.2],
  "Global representation"
);

makeLineChart(
  "trendChart",
  ["1995", "2025"],
  [11.3, 27.2],
  "Global representation"
);


/* INDIA TREND */

makeLineChart(
  "indiaChart",
  ["1995", "2025"],
  [7.2, 13.8],
  "India representation"
);


/* INTERACTIVE WORLD MAP */

const mapStatus = $("#mapStatus");

const worldMap = L.map("worldMap", {
  zoomControl: true,
  scrollWheelZoom: false,
  minZoom: 1,
  maxZoom: 5
}).setView([20, 0], 2);

const mapData = new Map();

function mapColour(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "#e6edf2";
  }

  if (value < 10) return "#dceaf3";
  if (value < 20) return "#a9c9df";
  if (value < 30) return "#6f9fbe";
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
    p.iso3 ||
    p["ISO3166-1-Alpha-3"] ||
    p.A3 ||
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
    "Unknown country"
  );
}

function countryStyle(feature) {
  const code = countryCode(feature);
  const value = code ? mapData.get(code) : null;

  return {
    fillColor: mapColour(value),
    fillOpacity: .9,
    color: "#ffffff",
    weight: .7
  };
}

function onCountryFeature(feature, layer) {
  const code = countryCode(feature);
  const name = countryName(feature);
  const value = code ? mapData.get(code) : null;

  const display = value === null || value === undefined
    ? "Data unavailable"
    : value.toFixed(1) + "%";

  layer.bindTooltip(
    `<strong>${name}</strong><br>Women in parliament: ${display}`,
    { sticky: true }
  );

  layer.on({
    mouseover: function() {
      this.setStyle({
        weight: 2,
        color: "#081d36",
        fillOpacity: 1
      });
    },

    mouseout: function() {
      this.setStyle(countryStyle(feature));
    },

    click: function() {
      this.setStyle({
        weight: 3,
        color: "#d1ad68"
      });
    }
  });
}

async function loadWorldMap() {
  try {
    mapStatus.textContent = "Loading country boundaries and data…";

    const geoURL =
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

    const wbURL =
      "https://api.worldbank.org/v2/country/all/indicator/SG.GEN.PARL.ZS?format=json&date=2024&per_page=400";

    const [geoResponse, dataResponse] = await Promise.all([
      fetch(geoURL),
      fetch(wbURL)
    ]);

    if (!geoResponse.ok || !dataResponse.ok) {
      throw new Error("Map sources could not be reached.");
    }

    const geoJSON = await geoResponse.json();
    const wbJSON = await dataResponse.json();

    if (!wbJSON || !wbJSON[1]) {
      throw new Error("Indicator data unavailable.");
    }

    wbJSON[1].forEach(row => {
      if (row.countryiso3code && row.value !== null) {
        mapData.set(row.countryiso3code, Number(row.value));
      }
    });

    L.geoJSON(geoJSON, {
      style: countryStyle,
      onEachFeature: onCountryFeature
    }).addTo(worldMap);

    mapStatus.textContent =
      "Country data loaded. Hover or tap a country to view its data.";

  } catch (error) {
    mapStatus.textContent =
      "The map could not retrieve country data. Check the linked data sources.";

    console.error("Map loading error:", error);
  }
}

loadWorldMap();


/* IMAGE FALLBACKS */

document.querySelectorAll(".leader-image img").forEach(img => {
  img.addEventListener("error", function() {
    this.parentElement.classList.add("image-error");
  });
});


/* END */
