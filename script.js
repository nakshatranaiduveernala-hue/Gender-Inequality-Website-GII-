/* =====================================================
   BEYOND THE DIVIDE
   Interactive map, navigation, charts and data
   ===================================================== */

(() => {
  "use strict";

  /* ================= NAVIGATION ================= */

  const nav = document.getElementById("mainNav");
  const menuToggle = document.getElementById("menuToggle");
  const pages = document.querySelectorAll(".page");
  const navButtons = document.querySelectorAll(".nav-link");

  function openPage(id) {
    const page = document.getElementById(id);
    if (!page) return;

    pages.forEach(p => p.classList.remove("active"));
    page.classList.add("active");

    navButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.tab === id);
    });

    nav?.classList.remove("open");

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Re-render canvases when their tab becomes visible.
    setTimeout(() => {
      Object.values(chartInstances).forEach(chart => {
        if (chart && chart.canvas && chart.canvas.offsetWidth > 0) {
          chart.draw();
        }
      });
    }, 120);
  }

  document.querySelectorAll("[data-tab]").forEach(element => {
    element.addEventListener("click", () => {
      const tab = element.dataset.tab;
      if (tab) openPage(tab);
    });
  });

  menuToggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });


  /* ================= DATA DEFINITIONS ================= */

  const INDICATORS = {
    fertility: {
      name: "Adolescent fertility rate",
      code: "SP.ADO.TFRT",
      unit: "births per 1,000 girls aged 15–19",
      shortUnit: "births / 1,000",
      description:
        "The annual number of births per 1,000 women aged 15–19. It can reflect differences in healthcare access, education, social conditions, policies and other factors.",
      source: "World Bank",
      format: value => Number(value).toFixed(1)
    },

    mortality: {
      name: "Maternal mortality ratio",
      code: "SH.STA.MMRT",
      unit: "maternal deaths per 100,000 live births",
      shortUnit: "deaths / 100,000",
      description:
        "Maternal deaths per 100,000 live births. Differences can reflect healthcare access, quality of care, infrastructure, socioeconomic conditions and other factors.",
      source: "World Bank",
      format: value => Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 1
      })
    },

    parliament: {
      name: "Women in Parliament",
      code: "SG.GEN.PARL.ZS",
      unit: "percentage of parliamentary seats held by women",
      shortUnit: "seats (%)",
      description:
        "The percentage of seats in national parliament held by women. The measure can help examine political representation and differences in participation.",
      source: "World Bank",
      format: value => Number(value).toFixed(1) + "%"
    }
  };

  const WORLD_BANK = "https://api.worldbank.org/v2";

  const INDIA_CODE = "IND";

  const mapTooltip = document.getElementById("mapTooltip");
  const countryDataPanel = document.getElementById("countryData");
  const profileCountry = document.getElementById("profileCountry");
  const mapStatus = document.getElementById("mapStatus");
  const mapSvg = document.getElementById("worldMap");

  let currentIndicator = "fertility";
  let selectedCountry = null;
  let geoFeatures = [];
  let countryValues = {};
  let countryShapes = {};
  let mapLoaded = false;
  let mapUnavailable = false;

  /* ================= API ================= */

  async function fetchJSON(url) {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Request failed: " + response.status);
    }

    return response.json();
  }

  async function getWorldBankSeries(indicator, country = "all") {
    const url =
      `${WORLD_BANK}/country/${country}/indicator/${indicator}` +
      `?format=json&per_page=20000&date=2000:2024`;

    const response = await fetchJSON(url);

    if (!Array.isArray(response) || !Array.isArray(response[1])) {
      throw new Error("World Bank data unavailable.");
    }

    return response[1].filter(item =>
      item &&
      item.value !== null &&
      item.countryiso3code &&
      item.date
    );
  }

  function newestValues(series) {
    const result = {};

    series.forEach(item => {
      const code = item.countryiso3code;
      const year = Number(item.date);
      const value = Number(item.value);

      if (!code || !Number.isFinite(value)) return;

      if (!result[code] || year > result[code].year) {
        result[code] = {
          value,
          year,
          name: item.country?.value || code
        };
      }
    });

    return result;
  }

  async function loadIndicatorData(indicatorKey) {
    const indicator = INDICATORS[indicatorKey];
    const series = await getWorldBankSeries(indicator.code);
    return newestValues(series);
  }

  /* ================= MAP ================= */

  function isoCode(feature) {
    const p = feature.properties || {};

    return (
      p.ISO_A3 ||
      p.iso_a3 ||
      p.ADM0_A3 ||
      p.ISO3 ||
      p.iso3 ||
      p.iso_a3_eh ||
      null
    );
  }

  function countryName(feature) {
    const p = feature.properties || {};

    return (
      p.ADMIN ||
      p.name ||
      p.NAME ||
      p.NAME_EN ||
      p.NAME_LONG ||
      p.SOVEREIGNT ||
      "Country"
    );
  }

  // Simple equirectangular projection.
  function project(coord) {
    const lon = coord[0];
    const lat = coord[1];

    const x = (lon + 180) / 360 * 1000;
    const y = (90 - lat) / 180 * 500;

    return [x, y];
  }

  function coordinatesToPath(coords) {
    if (!coords || !coords.length) return "";

    let path = "";

    coords.forEach((ring, ringIndex) => {
      ring.forEach((point, pointIndex) => {
        const [x, y] = project(point);
        path += (pointIndex === 0 ? "M" : "L") +
          x.toFixed(2) + " " + y.toFixed(2);
      });

      path += "Z";
    });

    return path;
  }

  function geometryToPath(geometry) {
    if (!geometry) return "";

    if (geometry.type === "Polygon") {
      return geometry.coordinates
        .map(coordinatesToPath)
        .join(" ");
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .map(polygon => coordinatesToPath(polygon))
        .join(" ");
    }

    return "";
  }

  async function loadWorldMap() {
    mapStatus.textContent = "Loading map boundaries…";

    const mapSources = [
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    ];

    let geoData = null;

    for (const url of mapSources) {
      try {
        geoData = await fetchJSON(url);
        if (geoData?.features?.length) break;
      } catch (error) {
        console.warn("Map source unavailable:", error);
      }
    }

    if (!geoData?.features?.length) {
      mapUnavailable = true;
      mapStatus.textContent = "Map boundaries unavailable";
      mapSvg.innerHTML = "";
      return;
    }

    geoFeatures = geoData.features;

    drawMap();

    mapLoaded = true;
    mapStatus.textContent = "Map loaded";
  }

  function drawMap() {
    if (!mapSvg || !geoFeatures.length) return;

    mapSvg.innerHTML = "";
    countryShapes = {};

    geoFeatures.forEach(feature => {
      const code = isoCode(feature);
      if (!code) return;

      const pathData = geometryToPath(feature.geometry);
      if (!pathData) return;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      path.setAttribute("d", pathData);
      path.setAttribute("class", "country-shape");
      path.setAttribute("fill", "#324963");
      path.setAttribute("data-code", code);
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", countryName(feature));

      path.addEventListener("mouseenter", event => {
        showTooltip(feature, event);
      });

      path.addEventListener("mousemove", event => {
        positionTooltip(event);
      });

      path.addEventListener("mouseleave", () => {
        mapTooltip.style.display = "none";
      });

      path.addEventListener("click", () => {
        selectCountry(feature);
      });

      path.addEventListener("focus", () => {
        selectCountry(feature);
      });

      path.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCountry(feature);
        }
      });

      mapSvg.appendChild(path);
      countryShapes[code] = path;
    });

    recolourMap();
  }

  function valuesForMap() {
    return countryValues;
  }

  function mapValue(code) {
    return valuesForMap()[code]?.value ?? null;
  }

  function mapColour(value, min, max) {
    if (value === null || !Number.isFinite(value)) {
      return "#324963";
    }

    if (max === min) return "#9cb9d8";

    const t = (value - min) / (max - min);

    const palette = [
      [222, 235, 247],
      [166, 198, 225],
      [105, 151, 190],
      [55, 94, 139],
      [27, 51, 81]
    ];

    const scaled = Math.max(0, Math.min(1, t)) * 4;
    const index = Math.min(3, Math.floor(scaled));
    const fraction = scaled - index;

    const a = palette[index];
    const b = palette[index + 1];

    const r = Math.round(a[0] + (b[0] - a[0]) * fraction);
    const g = Math.round(a[1] + (b[1] - a[1]) * fraction);
    const bl = Math.round(a[2] + (b[2] - a[2]) * fraction);

    return `rgb(${r},${g},${bl})`;
  }

  function recolourMap() {
    if (!mapLoaded) return;

    const values = Object.values(countryValues)
      .map(item => item.value)
      .filter(value => Number.isFinite(value));

    if (!values.length) {
      mapStatus.textContent = "No country data available";
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    Object.entries(countryShapes).forEach(([code, path]) => {
      const value = mapValue(code);
      path.setAttribute(
        "fill",
        value === null ? "#324963" : mapColour(value, min, max)
      );
    });

    mapStatus.textContent = "Data loaded";
  }

  function positionTooltip(event) {
    const rect = document.getElementById("mapViewport")
      .getBoundingClientRect();

    let x = event.clientX - rect.left + 12;
    let y = event.clientY - rect.top + 12;

    const width = mapTooltip.offsetWidth || 180;
    const height = mapTooltip.offsetHeight || 100;

    if (x + width > rect.width) x = x - width - 25;
    if (y + height > rect.height) y = y - height - 25;

    mapTooltip.style.left = Math.max(4, x) + "px";
    mapTooltip.style.top = Math.max(4, y) + "px";
  }

  function showTooltip(feature, event) {
    const code = isoCode(feature);
    const data = countryValues[code];
    const indicator = INDICATORS[currentIndicator];

    mapTooltip.innerHTML = `
      <strong>${escapeHTML(countryName(feature))}</strong>
      ${
        data
          ? `${indicator.format(data.value)}<br>
             <small>${escapeHTML(indicator.shortUnit)} · ${data.year}</small>`
          : `<small>No data available for this country in this series.</small>`
      }
    `;

    mapTooltip.style.display = "block";
    positionTooltip(event);
  }

  function selectCountry(feature) {
    const code = isoCode(feature);
    const name = countryName(feature);

    selectedCountry = code;

    Object.values(countryShapes).forEach(path => {
      path.classList.remove("selected");
    });

    countryShapes[code]?.classList.add("selected");

    profileCountry.textContent = name;

    const data = countryValues[code];
    const indicator = INDICATORS[currentIndicator];

    if (!data) {
      countryDataPanel.innerHTML = `
        <p class="empty-state">
          No available value for this country in the selected
          indicator and period.
        </p>
      `;
    } else {
      countryDataPanel.innerHTML = `
        <div class="country-metric">
          <span>${escapeHTML(indicator.name)}</span>
          <strong>${indicator.format(data.value)}</strong>
          <small>${escapeHTML(indicator.shortUnit)}</small>
        </div>

        <div class="country-metric">
          <span>Data year</span>
          <strong>${data.year}</strong>
        </div>

        <div class="country-metric">
          <span>Data source</span>
          <small>World Bank</small>
        </div>
      `;
    }

    document.getElementById("insightText").textContent =
      data
        ? `The ${indicator.name.toLowerCase()} for ${name} is ` +
          `${indicator.format(data.value)} in ${data.year}. ` +
          `This value should be interpreted alongside the country's ` +
          `geographical context, policies, healthcare access, ` +
          `economic conditions and other evidence.`
        : `Data for ${name} is unavailable in this selected ` +
          `indicator series. Missing data does not imply ` +
          `that inequality is absent.`;
  }

  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, character => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  /* ================= INDICATOR SWITCH ================= */

  const indicatorButtons = document.querySelectorAll(".indicator-choice");

  indicatorButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const key = button.dataset.indicator;
      if (!key || !INDICATORS[key]) return;

      currentIndicator = key;

      indicatorButtons.forEach(b => {
        b.classList.toggle("active", b.dataset.indicator === key);
      });

      const indicator = INDICATORS[key];

      document.getElementById("mapIndicatorName").textContent =
        indicator.name;

      const definition = document.getElementById("indicatorDefinition");

      definition.innerHTML = `
        <span class="eyebrow">INDICATOR DEFINITION</span>
        <h3>${escapeHTML(indicator.name)}</h3>
        <p>${escapeHTML(indicator.description)}</p>
      `;

      document.getElementById("atlasSource").textContent =
        `${indicator.source} indicator series: ${indicator.code}`;

      profileCountry.textContent = "Loading data…";
      countryDataPanel.innerHTML =
        `<p class="empty-state">Retrieving data…</p>`;

      mapStatus.textContent = "Loading indicator…";

      try {
        countryValues = await loadIndicatorData(key);
        recolourMap();

        if (selectedCountry) {
          const feature = geoFeatures.find(f =>
            isoCode(f) === selectedCountry
          );
          if (feature) selectCountry(feature);
        } else {
          profileCountry.textContent = "Select a country";
          countryDataPanel.innerHTML =
            `<p class="empty-state">
              Hover over a country or tap it to explore
              available indicator data.
            </p>`;
        }
      } catch (error) {
        console.error(error);
        mapStatus.textContent = "Indicator data unavailable";
        countryDataPanel.innerHTML =
          `<p class="empty-state">
            The data source could not be reached.
            Please try again later.
          </p>`;
      }
    });
  });


  /* ================= CANVAS CHARTS ================= */

  const chartInstances = {};

  function createChart(canvasId, series, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const chart = {
      canvas,
      series,
      options,
      hoverIndex: -1,
      draw() {
        drawCanvasChart(this);
      }
    };

    chartInstances[canvasId] = chart;

    canvas.addEventListener("mousemove", event => {
      chart.hoverIndex = getHoverIndex(chart, event);
      chart.draw();
    });

    canvas.addEventListener("mouseleave", () => {
      chart.hoverIndex = -1;
      chart.draw();
    });

    chart.draw();

    return chart;
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    return { width: rect.width, height: rect.height, dpr };
  }

  function drawCanvasChart(chart) {
    const canvas = chart.canvas;
    const ctx = canvas.getContext("2d");
    const { width, height, dpr } = resizeCanvas(canvas);

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const data = chart.series
      .filter(item => Number.isFinite(item.value))
      .sort((a, b) => a.year - b.year);

    if (!data.length) {
      drawNoData(ctx, width, height);
      return;
    }

    const padding = {
      left: 48,
      right: 15,
      top: 20,
      bottom: 36
    };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const min = Math.min(...data.map(d => d.value));
    const max = Math.max(...data.map(d => d.value));

    const range = max - min || 1;

    const yMin = chart.options.zeroBaseline
      ? Math.min(0, min)
      : min - range * .12;

    const yMax = max + range * .12;

    function x(index) {
      return padding.left + (
        data.length === 1
          ? plotWidth / 2
          : index / (data.length - 1) * plotWidth
      );
    }

    function y(value) {
      return padding.top +
        ((yMax - value) / (yMax - yMin)) * plotHeight;
    }

    // Grid
    ctx.strokeStyle = "#e3e9f0";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const gy = padding.top + (i / 4) * plotHeight;

      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(width - padding.right, gy);
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = "#738092";
    ctx.font = "10px DM Sans, sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const value = yMax - (i / 4) * (yMax - yMin);
      const gy = padding.top + (i / 4) * plotHeight;

      ctx.fillText(
        formatAxisValue(value),
        padding.left - 8,
        gy + 3
      );
    }

    ctx.textAlign = "center";

    const labelCount = Math.min(6, data.length);

    for (let i = 0; i < labelCount; i++) {
      const index = labelCount === 1
        ? 0
        : Math.round(i * (data.length - 1) / (labelCount - 1));

      ctx.fillText(
        String(data[index].year),
        x(index),
        height - 10
      );
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = "#577ba6";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";

    data.forEach((item, index) => {
      const px = x(index);
      const py = y(item.value);

      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();

    // Fill under the line
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0].value));

    data.forEach((item, index) => {
      ctx.lineTo(x(index), y(item.value));
    });

    ctx.lineTo(x(data.length - 1), padding.top + plotHeight);
    ctx.lineTo(x(0), padding.top + plotHeight);
    ctx.closePath();

    ctx.fillStyle = "rgba(87,123,166,.12)";
    ctx.fill();

    // Points
    data.forEach((item, index) => {
      const px = x(index);
      const py = y(item.value);

      ctx.beginPath();
      ctx.arc(px, py, chart.hoverIndex === index ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = chart.hoverIndex === index
        ? "#203d61"
        : "#577ba6";
      ctx.fill();
    });

    // Hover guide
    if (chart.hoverIndex >= 0 && chart.hoverIndex < data.length) {
      const item = data[chart.hoverIndex];
      const px = x(chart.hoverIndex);
      const py = y(item.value);

      ctx.beginPath();
      ctx.strokeStyle = "#aab9ca";
      ctx.setLineDash([4, 4]);
      ctx.moveTo(px, padding.top);
      ctx.lineTo(px, padding.top + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      const label = `${item.year}: ${formatAxisValue(item.value)}`;
      const labelWidth = ctx.measureText(label).width + 20;
      const labelX = Math.max(
        5,
        Math.min(width - labelWidth - 5, px - labelWidth / 2)
      );

      const labelY = Math.max(20, py - 20);

      ctx.fillStyle = "#101b2b";
      ctx.fillRect(labelX, labelY - 16, labelWidth, 24);

      ctx.fillStyle = "#ffffff";
      ctx.font = "10px DM Sans, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, labelX + 10, labelY);
    }
  }

  function drawNoData(ctx, width, height) {
    ctx.fillStyle = "#738092";
    ctx.font = "12px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Data unavailable",
      width / 2,
      height / 2
    );
  }

  function formatAxisValue(value) {
    return Number(value).toLocaleString(undefined, {
      maximumFractionDigits: 1
    });
  }

  function getHoverIndex(chart, event) {
    const data = chart.series
      .filter(item => Number.isFinite(item.value))
      .sort((a, b) => a.year - b.year);

    if (!data.length) return -1;

    const rect = chart.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    const padding = {
      left: 48,
      right: 15
    };

    const plotWidth = rect.width - padding.left - padding.right;

    const index = data.length === 1
      ? 0
      : Math.round(
          ((mouseX - padding.left) / plotWidth) *
          (data.length - 1)
        );

    return Math.max(0, Math.min(data.length - 1, index));
  }

  function dataFromSeries(series) {
    return series.map(item => ({
      year: Number(item.date),
      value: Number(item.value)
    })).filter(item =>
      Number.isFinite(item.year) &&
      Number.isFinite(item.value)
    );
  }

  function chartAnalysis(series, indicatorKey) {
    const values = series
      .filter(item => Number.isFinite(item.value))
      .sort((a, b) => a.year - b.year);

    if (values.length < 2) {
      return "Not enough available data to calculate a trend.";
    }

    const first = values[0];
    const last = values[values.length - 1];

    const change = last.value - first.value;

    const direction = change > 0
      ? "increased"
      : change < 0
        ? "decreased"
        : "remained unchanged";

    const indicator = INDICATORS[indicatorKey];

    return `From ${first.year} to ${last.year}, the value ` +
      `${direction} from ${indicator.format(first.value)} ` +
      `to ${indicator.format(last.value)}. This describes ` +
      `the observed change, but further evidence is needed ` +
      `to explain its causes.`;
  }

  /* ================= INDIA SERIES ================= */

  async function loadIndiaCharts() {
    const chartMap = {
      fertility: {
        chart: "indiaAFRChart",
        value: "indiaAFR",
        year: "indiaAFRYear",
        analysis: "indiaAFRAnalysis"
      },

      mortality: {
        chart: "indiaMMRChart",
        value: "indiaMMR",
        year: "indiaMMRYear",
        analysis: "indiaMMRAnalysis"
      },

      parliament: {
        chart: "indiaParliamentChart",
        value: "indiaParliament",
        year: "indiaParliamentYear",
        analysis: "indiaParliamentAnalysis"
      }
    };

    for (const key of Object.keys(chartMap)) {
      const config = chartMap[key];

      try {
        const series = await getWorldBankSeries(
          INDICATORS[key].code,
          INDIA_CODE
        );

        const filtered = series
          .filter(item =>
            item.countryiso3code === INDIA_CODE &&
            item.value !== null
          )
          .sort((a, b) => Number(a.date) - Number(b.date));

        const chartSeries = dataFromSeries(filtered);

        if (!chartSeries.length) {
          throw new Error("No series values returned.");
        }

        const latest = chartSeries[chartSeries.length - 1];

        document.getElementById(config.value).textContent =
          INDICATORS[key].format(latest.value);

        document.getElementById(config.year).textContent =
          `Latest available year: ${latest.year}`;

        document.getElementById(config.analysis).textContent =
          chartAnalysis(chartSeries, key);

        createChart(config.chart, chartSeries);

        const trendCanvas = document.getElementById(
          key === "fertility"
            ? "trendAFRChart"
            : key === "mortality"
              ? "trendMMRChart"
              : "trendParliamentChart"
        );

        if (trendCanvas) {
          createChart(trendCanvas.id, chartSeries);
        }

      } catch (error) {
        console.warn("India data unavailable:", key, error);

        document.getElementById(config.value).textContent = "—";
        document.getElementById(config.year).textContent =
          "Data unavailable";

        document.getElementById(config.analysis).textContent =
          "The data source could not be reached. " +
          "No value has been substituted.";

        createChart(config.chart, []);
      }
    }
  }

  /* ================= IMAGE FALLBACK ================= */

  document.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => {
      img.style.display = "none";

      const parent = img.parentElement;

      if (parent) {
        parent.classList.add("image-unavailable");
      }
    });
  });

  /* ================= INITIALISATION ================= */

  async function initialise() {
    await loadWorldMap();

    try {
      countryValues = await loadIndicatorData(currentIndicator);
      recolourMap();
    } catch (error) {
      console.error("Initial indicator data unavailable:", error);
      mapStatus.textContent = "Data unavailable";
    }

    loadIndiaCharts();
  }

  initialise();

  window.addEventListener("resize", () => {
    Object.values(chartInstances).forEach(chart => {
      if (chart.canvas.offsetWidth > 0) chart.draw();
    });
  });

})();
