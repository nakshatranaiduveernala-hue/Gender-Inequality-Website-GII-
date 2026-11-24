const navButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");

function showPage(pageId) {
  pages.forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navButtons.forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

const indicatorNames = {
  "SP.ADO.TFRT": "Adolescent fertility rate",
  "SH.STA.MMRT": "Maternal mortality ratio",
  "SG.GEN.PARL.ZS": "Women in parliament"
};

const worldMap = document.getElementById("worldMap");
const mapSelect = document.getElementById("mapIndicator");
const mapCountryName = document.getElementById("mapCountryName");
const mapCountryValue = document.getElementById("mapCountryValue");
const mapCountryInfo = document.getElementById("mapCountryInfo");
const tooltip = document.getElementById("tooltip");

let mapFeatures = [];
let mapData = {};
let mapProjection = null;

const formatNumber = value => {
  if (value === null || value === undefined) return "No data";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
};

async function fetchIndicator(country, indicator) {
  const url =
    `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=100`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Data request failed");

  const result = await response.json();
  if (!result || !result[1]) return [];

  return result[1].filter(item => item.value !== null);
}

async function loadMapData() {
  const indicator = mapSelect.value;

  worldMap.innerHTML = '<p class="loading">Loading country statistics…</p>';

  try {
    const response = await fetch(
      `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000`
    );

    const result = await response.json();
    mapData = {};

    (result[1] || []).forEach(item => {
      const code = item.countryiso3code;
      if (!code || !item.value) return;

      if (
        !mapData[code] ||
        Number(item.date) > Number(mapData[code].year)
      ) {
        mapData[code] = {
          value: item.value,
          year: item.date,
          name: item.country.value
        };
      }
    });

    drawMap();
  } catch (error) {
    worldMap.innerHTML =
      '<p class="loading">Map data could not load. Please check your internet connection.</p>';
  }
}

async function loadWorldMap() {
  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    );

    const topology = await response.json();
    const geo = topojson.feature(
      topology,
      topology.objects.countries
    );

    mapFeatures = geo.features;

    const projection = d3ProjectionFallback(mapFeatures);
    mapProjection = projection;

    await loadMapData();
  } catch (error) {
    worldMap.innerHTML =
      '<p class="loading">The map could not be loaded. Try refreshing the page.</p>';
  }
}

function d3ProjectionFallback(features) {
  const width = 900;
  const height = 420;

  const points = features.flatMap(feature => {
    const coordinates = feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates.flat()
      : feature.geometry.coordinates.flat(2);

    return coordinates;
  });

  return function project(coordinate) {
    const longitude = coordinate[0];
    const latitude = coordinate[1];

    return [
      ((longitude + 180) / 360) * width,
      ((90 - latitude) / 180) * height
    ];
  };
}

function pathFromGeometry(geometry, project) {
  let path = "";

  function addRing(ring) {
    ring.forEach((coordinate, index) => {
      const [x, y] = project(coordinate);
      path += `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    });
    path += "Z";
  }

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(addRing);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(polygon => polygon.forEach(addRing));
  }

  return path;
}

function drawMap() {
  if (!mapFeatures.length) return;

  const width = 900;
  const height = 420;

  const values = Object.values(mapData).map(item => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  let paths = "";

  mapFeatures.forEach(feature => {
    const code = String(feature.id).padStart(3, "0");
    const value = mapData[code];

    let shade = "#dce8e9";

    if (value && max !== min) {
      const fraction = (value.value - min) / (max - min);
      const red = Math.round(218 - fraction * 160);
      const green = Math.round(232 - fraction * 105);
      const blue = Math.round(231 - fraction * 75);
      shade = `rgb(${red},${green},${blue})`;
    }

    const path = pathFromGeometry(feature.geometry, mapProjection);

    paths += `<path d="${path}" fill="${shade}" data-code="${code}" tabindex="0" role="button" aria-label="${value?.name || "Country"}" />`;
  });

  worldMap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="World map showing country indicator values">
      ${paths}
    </svg>
  `;

  worldMap.querySelectorAll("path").forEach(path => {
    const code = path.dataset.code;
    const value = mapData[code];

    path.addEventListener("mouseenter", event => {
      if (!value) return;
      tooltip.style.display = "block";
      tooltip.textContent = `${value.name}: ${formatNumber(value.value)}`;
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY + 12}px`;
    });

    path.addEventListener("mousemove", event => {
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY + 12}px`;
    });

    path.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    path.addEventListener("click", () => {
      showCountry(code);
    });

    path.addEventListener("focus", () => showCountry(code));
  });
}

function showCountry(code) {
  const value = mapData[code];

  if (!value) {
    mapCountryName.textContent = "No available data";
    mapCountryValue.textContent = "—";
    mapCountryInfo.textContent =
      "The selected country does not have a value for this indicator in the retrieved dataset.";
    return;
  }

  mapCountryName.textContent = value.name;
  mapCountryValue.textContent = formatNumber(value.value);
  mapCountryInfo.textContent =
    `${indicatorNames[mapSelect.value]} · ${value.year}. This is the latest observation returned for this country.`;
}

mapSelect.addEventListener("change", loadMapData);

// INDIA CHART

let indiaChart = null;
const indiaSelect = document.getElementById("indiaIndicator");

async function loadIndiaChart() {
  const indicator = indiaSelect.value;
  const note = document.getElementById("indiaChartNote");

  note.textContent = "Retrieving India's data…";

  try {
    const records = await fetchIndicator("IND", indicator);
    const sorted = records
      .sort((a, b) => Number(a.date) - Number(b.date));

    renderChart(
      "indiaChart",
      indiaChart,
      sorted.map(item => item.date),
      sorted.map(item => item.value),
      indicatorNames[indicator],
      chart => indiaChart = chart
    );

    note.textContent =
      `Source: World Bank. Latest observation: ${sorted.at(-1)?.date || "Not available"}.`;
  } catch (error) {
    note.textContent = "India's data could not be retrieved.";
  }
}

indiaSelect.addEventListener("change", loadIndiaChart);

// TRENDS CHART

let trendChart = null;
const trendIndicator = document.getElementById("trendIndicator");
const trendCountry = document.getElementById("trendCountry");

async function loadTrendChart() {
  const indicator = trendIndicator.value;
  const country = trendCountry.value;

  const note = document.getElementById("trendNote");
  const title = document.getElementById("trendTitle");

  title.textContent =
    `${trendCountry.options[trendCountry.selectedIndex].text} · ${indicatorNames[indicator]}`;

  note.textContent = "Retrieving historical observations…";

  try {
    const records = await fetchIndicator(country, indicator);
    const sorted = records.sort(
      (a, b) => Number(a.date) - Number(b.date)
    );

    renderChart(
      "trendChart",
      trendChart,
      sorted.map(item => item.date),
      sorted.map(item => item.value),
      indicatorNames[indicator],
      chart => trendChart = chart
    );

    note.textContent =
      `Source: World Bank. ${sorted.length} available observations returned.`;
  } catch (error) {
    note.textContent = "Trend data could not be retrieved.";
  }
}

trendIndicator.addEventListener("change", loadTrendChart);
trendCountry.addEventListener("change", loadTrendChart);

// CHART RENDERER

function renderChart(canvasId, existingChart, labels, values, label, setChart) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || typeof Chart === "undefined") return;

  if (existingChart) existingChart.destroy();

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: "#47718e",
        backgroundColor: "rgba(114,170,165,.15)",
        fill: true,
        tension: .3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#102b43",
          padding: 12
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxTicksLimit: 10
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: "#e8edef"
          }
        }
      }
    }
  });

  setChart(chart);
}

// START

loadWorldMap();
loadIndiaChart();
loadTrendChart();
