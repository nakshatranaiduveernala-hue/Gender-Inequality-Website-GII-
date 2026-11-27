/* =========================================================
   BEYOND THE NUMBERS
   COMPLETE INTERACTIVE SYSTEM
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL CONFIGURATION
   ========================================================= */

const SITE_CONFIG = {

  worldBankBase:
    "https://api.worldbank.org/v2",

  geoJsonURL:
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",

  defaultIndicator:
    "SG.GEN.PARL.ZS",

  defaultYear:
    "2023",

  startYear:
    1990,

  endYear:
    2025,

  mapColors: [
    "#dce9f5",
    "#a8c8e2",
    "#78a8cc",
    "#477fa9",
    "#275b83",
    "#163c61"
  ],

  chartLimit:
    15

};

/* =========================================================
   INDICATOR CONFIGURATION
   ========================================================= */

const INDICATORS = {

  "SG.GEN.PARL.ZS": {

    name:
      "Women in national parliament (%)",

    shortName:
      "Women in parliament",

    unit:
      "%",

    description:
      "Percentage of seats held by women in national parliaments.",

    reverse:
      false,

    decimals:
      1

  },

  "SP.ADO.TFRT": {

    name:
      "Adolescent fertility rate",

    shortName:
      "Adolescent fertility",

    unit:
      "",

    description:
      "Births per 1,000 women ages 15–19.",

    reverse:
      true,

    decimals:
      1

  },

  "SH.STA.MMRT": {

    name:
      "Maternal mortality ratio",

    shortName:
      "Maternal mortality",

    unit:
      "",

    description:
      "Maternal deaths per 100,000 live births.",

    reverse:
      true,

    decimals:
      0

  }

};

/* =========================================================
   STATE
   ========================================================= */

const STATE = {

  currentPage:
    "home",

  indicator:
    SITE_CONFIG.defaultIndicator,

  year:
    SITE_CONFIG.defaultYear,

  map:
    null,

  geoLayer:
    null,

  geoData:
    null,

  data:
    [],

  countryData:
    new Map(),

  countryLayers:
    new Map(),

  chart:
    null,

  loading:
    false,

  mapInitialized:
    false,

  mapError:
    null,

  searchQuery:
    "",

  lastLoadedIndicator:
    null,

  lastLoadedYear:
    null,

  selectedCountry:
    null

};

/* =========================================================
   DOM HELPERS
   ========================================================= */

function getElement(id) {

  return document.getElementById(id);

}

function query(selector) {

  return document.querySelector(selector);

}

function queryAll(selector) {

  return Array.from(
    document.querySelectorAll(selector)
  );

}

function setText(id, text) {

  const element = getElement(id);

  if (!element) return;

  element.textContent =
    text;

}

function setHTML(id, html) {

  const element = getElement(id);

  if (!element) return;

  element.innerHTML =
    html;

}

/* =========================================================
   SAFE TEXT
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(pageId) {

  const target =
    getElement(pageId);

  if (!target) {

    console.warn(
      "Page not found:",
      pageId
    );

    return;

  }

  queryAll(".page-section")
    .forEach(section => {

      section.classList.remove(
        "active"
      );

    });

  target.classList.add(
    "active"
  );

  STATE.currentPage =
    pageId;

  queryAll(".nav-item")
    .forEach(button => {

      button.classList.remove(
        "active"
      );

      if (
        button.dataset.page ===
        pageId
      ) {

        button.classList.add(
          "active"
        );

      }

    });

  closeMobileNavigation();

  window.scrollTo({

    top: 0,

    behavior: "smooth"

  });

  if (
    pageId === "indicator"
  ) {

    initializeMap();

    setTimeout(() => {

      if (
        STATE.map
      ) {

        STATE.map.invalidateSize();

      }

    }, 250);

  }

}

function setupNavigation() {

  queryAll(".nav-item")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.page
          );

        }
      );

    });

  queryAll("[data-goto]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.goto
          );

        }
      );

    });

}

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {

  const button =
    getElement("mobileMenuButton");

  const sidebar =
    getElement("sidebar");

  if (
    !button ||
    !sidebar
  ) {

    return;

  }

  button.addEventListener(
    "click",
    () => {

      sidebar.classList.toggle(
        "mobile-open"
      );

    }
  );

  document.addEventListener(
    "click",
    event => {

      if (
        !sidebar.classList.contains(
          "mobile-open"
        )
      ) {

        return;

      }

      if (
        sidebar.contains(
          event.target
        ) ||
        button.contains(
          event.target
        )
      {

        return;

      }

      closeMobileNavigation();

    }
  );

}

function closeMobileNavigation() {

  const sidebar =
    getElement("sidebar");

  if (!sidebar) return;

  sidebar.classList.remove(
    "mobile-open"
  );

}

/* =========================================================
   YEAR SELECTOR
   ========================================================= */

function setupYearSelector() {

  const select =
    getElement("yearSelect");

  if (!select) return;

  select.innerHTML = "";

  for (
    let year =
      SITE_CONFIG.endYear;

    year >=
      SITE_CONFIG.startYear;

    year--
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      String(year);

    option.textContent =
      String(year);

    select.appendChild(
      option
    );

  }

  select.value =
    SITE_CONFIG.defaultYear;

  select.addEventListener(
    "change",
    () => {

      STATE.year =
        select.value;

    }
  );

}

/* =========================================================
   INDICATOR SELECTOR
   ========================================================= */

function setupIndicatorSelector() {

  const select =
    getElement("indicatorSelect");

  if (!select) return;

  select.addEventListener(
    "change",
    () => {

      STATE.indicator =
        select.value;

      const indicator =
        INDICATORS[
          STATE.indicator
        ];

      if (
        indicator
      ) {

        updateIndicatorDescription();

      }

    }
  );

}

/* =========================================================
   DESCRIPTION
   ========================================================= */

function updateIndicatorDescription() {

  const indicator =
    INDICATORS[
      STATE.indicator
    ];

  if (!indicator) return;

  setText(
    "indicatorStatus",
    indicator.description
  );

}

/* =========================================================
   STATUS DISPLAY
   ========================================================= */

function updateStatus(
  message,
  type = "normal"
) {

  const element =
    getElement(
      "indicatorStatus"
    );

  if (!element) return;

  element.textContent =
    message;

  element.dataset.status =
    type;

}

/* =========================================================
   FETCH HELPERS
   ========================================================= */

async function fetchJSON(
  url,
  timeout = 20000
) {

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {

    const response =
      await fetch(
        url,
        {

          signal:
            controller.signal,

          cache:
            "no-store"

        }
      );

    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }

    return await response.json();

  } finally {

    clearTimeout(
      timeoutId
    );

  }

}

/* =========================================================
   WORLD BANK API
   ========================================================= */

function makeWorldBankURL(
  indicator,
  year
) {

  return (
    SITE_CONFIG.worldBankBase +
    "/country/all/indicator/" +
    encodeURIComponent(
      indicator
    ) +
    "?date=" +
    encodeURIComponent(
      year
    ) +
    "&format=json&per_page=2000"
  );

}

async function fetchIndicatorData(
  indicator,
  year
) {

  const url =
    makeWorldBankURL(
      indicator,
      year
    );

  const result =
    await fetchJSON(
      url
    );

  if (
    !Array.isArray(
      result
    ) ||
    !result[1]
  ) {

    return [];

  }

  return result[1]
    .filter(
      item => {

        return (
          item &&
          item.value !== null &&
          item.country &&
          item.country.id
        );

      }
    );

}

/* =========================================================
   GEOJSON
   ========================================================= */

async function fetchGeoJSON() {

  if (
    STATE.geoData
  ) {

    return STATE.geoData;

  }

  const data =
    await fetchJSON(
      SITE_CONFIG.geoJsonURL
    );

  if (
    !data ||
    !Array.isArray(
      data.features
    )
  {

    throw new Error(
      "Invalid GeoJSON data"
    );

  }

  STATE.geoData =
    data;

  return data;

}

/* =========================================================
   COUNTRY CODE NORMALIZATION
   ========================================================= */

const CODE_FIXES = {

  "-99":
    null,

  "ROM":
    "ROU",

  "KOS":
    "XKX",

  "XKX":
    "XKX",

  "PSE":
    "PSE",

  "PSX":
    "PSE",

  "ZAR":
    "COD",

  "TMP":
    "TLS",

  "SDS":
    "SSD",

  "SCG":
    "SRB"

};

function normalizeCountryCode(
  code
) {

  if (
    !code
  ) {

    return null;

  }

  const normalized =
    String(code)
      .trim()
      .toUpperCase();

  if (
    Object.prototype
      .hasOwnProperty.call(
        CODE_FIXES,
        normalized
      )
  {

    return CODE_FIXES[
      normalized
    ];

  }

  return normalized;

}

/* =========================================================
   GEOJSON CODE EXTRACTOR
   ========================================================= */

function getGeoCode(
  feature
) {

  if (
    !feature ||
    !feature.properties
  {

    return null;

  }

  const properties =
    feature.properties;

  const candidates = [

    properties.ISO_A3,

    properties.iso_a3,

    properties.ADM0_A3,

    properties.adm0_a3,

    properties.SOV_A3,

    properties.sov_a3,

    properties.ISO3,

    properties.iso3,

    properties.A3,

    properties.id

  ];

  for (
    const candidate
    of candidates
  {

    if (
      candidate &&
      String(candidate)
        .length >= 3
    {

      const code =
        normalizeCountryCode(
          candidate
        );

      if (
        code
      {

        return code;

      }

    }

  }

  return null;

}

/* =========================================================
   COUNTRY NAME
   ========================================================= */

function getCountryName(
  feature
) {

  if (
    !feature ||
    !feature.properties
  {

    return "Unknown";

  }

  const properties =
    feature.properties;

  return (

    properties.ADMIN ||

    properties.name ||

    properties.NAME ||

    properties.name_en ||

    properties.NAME_EN ||

    "Unknown"

  );

}

/* =========================================================
   BUILD COUNTRY DATA
   ========================================================= */

function buildCountryData(
  rawData
) {

  const map =
    new Map();

  rawData.forEach(
    item => {

      if (
        !item ||
        !item.country
      {

        return;

      }

      const code =
        normalizeCountryCode(
          item.country.id
        );

      if (
        !code
      {

        return;

      }

      map.set(
        code,
        {

          code,

          country:
            item.country.value,

          value:
            Number(
              item.value
            ),

          year:
            item.date,

          indicator:
            item.indicator?.value

        }
      );

    }
  );

  return map;

}

/* =========================================================
   MAP COLOR
   ========================================================= */

function getMapColor(
  value,
  values
) {

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(
      Number(value)
    )
  {

    return "#e5e9ee";

  }

  if (
    values.length === 0
  {

    return "#e5e9ee";

  }

  const sorted =
    values
      .slice()
      .sort(
        (a,b) =>
          a-b
      );

  const min =
    sorted[0];

  const max =
    sorted[
      sorted.length - 1
    ];

  if (
    min === max
  {

    return SITE_CONFIG
      .mapColors[3];

  }

  const normalized =
    (
      Number(value) -
      min
    ) /
    (
      max -
      min
    );

  const index =
    Math.max(
      0,
      Math.min(
        SITE_CONFIG
          .mapColors
          .length - 1,

        Math.floor(
          normalized *
          SITE_CONFIG
            .mapColors
            .length
        )
      )
    );

  return SITE_CONFIG
    .mapColors[
      index
    ];

}

/* =========================================================
   MAP STYLE
   ========================================================= */

function createMapStyle(
  feature
) {

  const code =
    getGeoCode(
      feature
    );

  const item =
    STATE.countryData
      .get(
        code
      );

  const values =
    STATE.data.map(
      record =>
        record.value
    );

  const value =
    item
      ? item.value
      : null;

  return {

    fillColor:
      getMapColor(
        value,
        values
      ),

    fillOpacity:
      item
        ? .82
        : .30,

    color:
      "#ffffff",

    weight:
      .7,

    opacity:
      .85

  };

}

/* =========================================================
   MAP POPUP
   ========================================================= */

function formatValue(
  value
) {

  const indicator =
    INDICATORS[
      STATE.indicator
    ];

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(
      Number(value)
    )
  {

    return "No data";

  }

  const decimals =
    indicator
      ? indicator.decimals
      : 1;

  const formatted =
    Number(value)
      .toLocaleString(
        undefined,
        {

          minimumFractionDigits:
            decimals,

          maximumFractionDigits:
            decimals

        }
      );

  if (
    indicator &&
    indicator.unit
  {

    return (
      formatted +
      indicator.unit
    );

  }

  return formatted;

}

function createPopupContent(
  feature
) {

  const code =
    getGeoCode(
      feature
    );

  const name =
    getCountryName(
      feature
    );

  const item =
    STATE.countryData
      .get(
        code
      );

  const value =
    item
      ? formatValue(
          item.value
        )
      : "No data";

  const indicator =
    INDICATORS[
      STATE.indicator
    ];

  const indicatorName =
    indicator
      ? indicator.shortName
      : STATE.indicator;

  return `

    <div class="map-popup">

      <strong>
        ${escapeHTML(name)}
      </strong>

      <div>
        ${escapeHTML(indicatorName)}
      </div>

      <div>
        <strong>
          ${escapeHTML(value)}
        </strong>
      </div>

      <div>
        Year:
        ${escapeHTML(STATE.year)}
      </div>

    </div>

  `;

}

/* =========================================================
   COUNTRY HIGHLIGHT
   ========================================================= */

function highlightCountry(
  layer
) {

  if (
    !layer
  {

    return;

  }

  layer.setStyle({

    weight:
      2.5,

    color:
      "#c6a66b",

    fillOpacity:
      .95

  });

  if (
    layer.bringToFront
  {

    layer.bringToFront();

  }

}

function resetCountryStyle(
  layer
) {

  if (
    STATE.geoLayer
  {

    STATE.geoLayer
      .resetStyle(
        layer
      );

  }

}

/* =========================================================
   MAP EVENTS
   ========================================================= */

function attachMapEvents(
  feature,
  layer
) {

  const name =
    getCountryName(
      feature
    );

  layer.bindPopup(
    createPopupContent(
      feature
    )
  );

  layer.on({

    mouseover:
      event => {

        highlightCountry(
          event.target
        );

      },

    mouseout:
      event => {

        resetCountryStyle(
          event.target
        );

      },

    click:
      event => {

        STATE.selectedCountry =
          name;

        event.target
          .openPopup();

      }

  });

  const code =
    getGeoCode(
      feature
    );

  if (
    code
  {

    STATE.countryLayers
      .set(
        code,
        layer
      );

  }

}

/* =========================================================
   INITIALIZE MAP
   ========================================================= */

function initializeMap() {

  if (
    STATE.mapInitialized
  {

    return;

  }

  const mapElement =
    getElement(
      "worldMap"
    );

  if (
    !mapElement
  {

    return;

  }

  if (
    !window.L
  {

    updateStatus(
      "Leaflet could not load. Check your internet connection.",
      "error"
    );

    return;

  }

  STATE.map =
    L.map(
      mapElement,
      {

        zoomControl:
          true,

        scrollWheelZoom:
          false,

        worldCopyJump:
          true

      }
    );

  STATE.map
    .setView(
      [20, 0],
      2
    );

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    {

      attribution:
        '&copy; OpenStreetMap contributors &copy; CARTO',

      subdomains:
        "abcd",

      maxZoom:
        18

    }
  )
  .addTo(
    STATE.map
  );

  STATE.mapInitialized =
    true;

  loadMapData();

}

/* =========================================================
   LOAD MAP DATA
   ========================================================= */

async function loadMapData() {

  try {

    updateStatus(
      "Loading geographical boundaries...",
      "normal"
    );

    const geoData =
      await fetchGeoJSON();

    renderGeoJSON(
      geoData
    );

    updateStatus(
      "Map ready. Select a country to view its data.",
      "success"
    );

    await updateMapData();

  } catch (
    error
  ) {

    console.error(
      "Map initialization error:",
      error
    );

    updateStatus(
      "The map could not load. Check your internet connection and try again.",
      "error"
    );

  }

}

/* =========================================================
   RENDER GEOJSON
   ========================================================= */

function renderGeoJSON(
  geoData
) {

  if (
    !STATE.map
  {

    return;

  }

  if (
    STATE.geoLayer
  {

    STATE.map
      .removeLayer(
        STATE.geoLayer
      );

  }

  STATE.countryLayers =
    new Map();

  STATE.geoLayer =
    L.geoJSON(
      geoData,
      {

        style:
          createMapStyle,

        onEachFeature:
          attachMapEvents

      }
    )
    .addTo(
      STATE.map
    );

}

/* =========================================================
   UPDATE MAP DATA
   ========================================================= */

async function updateMapData() {

  if (
    STATE.loading
  {

    return;

  }

  STATE.loading =
    true;

  try {

    STATE.indicator =
      getElement(
        "indicatorSelect"
      )?.value ||
      STATE.indicator;

    STATE.year =
      getElement(
        "yearSelect"
      )?.value ||
      STATE.year;

    updateStatus(
      "Fetching data from the World Bank...",
      "normal"
    );

    const rawData =
      await fetchIndicatorData(
        STATE.indicator,
        STATE.year
      );

    STATE.data =
      rawData
        .map(
          item => {

            return {

              code:
                normalizeCountryCode(
                  item.country.id
                ),

              country:
                item.country.value,

              value:
                Number(
                  item.value
                ),

              year:
                item.date

            };

          }
        )
        .filter(
          item => {

            return (
              item.code &&
              Number.isFinite(
                item.value
              )
            );

          }
        );

    STATE.countryData =
      buildCountryData(
        rawData
      );

    STATE.lastLoadedIndicator =
      STATE.indicator;

    STATE.lastLoadedYear =
      STATE.year;

    if (
      STATE.geoData
    {

      renderGeoJSON(
        STATE.geoData
      );

    }

    updateLegend();

    updateStatistics();

    updateChart();

    updateTable();

    updateStatus(

      STATE.data.length
        ? (
          STATE.data.length +
          " countries with data for " +
          STATE.year +
          "."
        )
        : (
          "No data found for this indicator and year."
        ),

      STATE.data.length
        ? "success"
        : "warning"

    );

  } catch (
    error
  ) {

    console.error(
      "Data loading error:",
      error
    );

    updateStatus(
      "Data could not be retrieved. Please try another year or indicator.",
      "error"
    );

  } finally {

    STATE.loading =
      false;

  }

}

/* =========================================================
   LEGEND
   ========================================================= */

function updateLegend() {

  const container =
    getElement(
      "legend"
    );

  if (
    !container
  {

    return;

  }

  const values =
    STATE.data.map(
      item =>
        item.value
    )
    .sort(
      (a,b) =>
        a-b
    );

  if (
    values.length === 0
  {

    container.innerHTML =
      "<p>No legend available.</p>";

    return;

  }

  const min =
    values[0];

  const max =
    values[
      values.length - 1
    ];

  const steps =
    SITE_CONFIG
      .mapColors
      .length;

  const items =
    [];

  for (
    let index = 0;

    index < steps;

    index++
  {

    const lower =
      min +
      (
        max -
        min
      ) *
      index /
      steps;

    const upper =
      min +
      (
        max -
        min
      ) *
      (
        index + 1
      ) /
      steps;

    items.push({

      color:
        SITE_CONFIG
          .mapColors[
            index
          ],

      label:
        (
          lower.toFixed(1) +
          "–" +
          upper.toFixed(1)
        )

    });

  }

  container.innerHTML =
    items
      .map(
        item => `

          <div class="legend-item">

            <span
              class="legend-color"
              style="background:${item.color}"
            ></span>

            <span>
              ${escapeHTML(item.label)}
            </span>

          </div>

        `
      )
      .join("");

}

/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics() {

  const values =
    STATE.data.map(
      item =>
        item.value
    );

  if (
    values.length === 0
  {

    setText(
      "countriesWithData",
      "0"
    );

    setText(
      "globalMean",
      "—"
    );

    setText(
      "highestValue",
      "—"
    );

    setText(
      "lowestValue",
      "—"
    );

    return;

  }

  const sum =
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    );

  const mean =
    sum /
    values.length;

  const max =
    Math.max(
      ...values
    );

  const min =
    Math.min(
      ...values
    );

  setText(
    "countriesWithData",
    values.length
      .toLocaleString()
  );

  setText(
    "globalMean",
    formatValue(
      mean
    )
  );

  setText(
    "highestValue",
    formatValue(
      max
    )
  );

  setText(
    "lowestValue",
    formatValue(
      min
    )
  );

}

/* =========================================================
   CHART
   ========================================================= */

function updateChart() {

  const canvas =
    getElement(
      "countryChart"
    );

  if (
    !canvas
  {

    return;

  }

  if (
    !window.Chart
  {

    console.warn(
      "Chart.js unavailable"
    );

    return;

  }

  const sorted =
    STATE.data
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value
      )
      .slice(
        0,
        SITE_CONFIG
          .chartLimit
      );

  const labels =
    sorted.map(
      item =>
        item.country
    );

  const values =
    sorted.map(
      item =>
        item.value
    );

  if (
    STATE.chart
  {

    STATE.chart
      .destroy();

  }

  STATE.chart =
    new Chart(
      canvas,
      {

        type:
          "bar",

        data:
          {

            labels,

            datasets:
              [

                {

                  label:
                    INDICATORS[
                      STATE.indicator
                    ]?.shortName ||
                    "Value",

                  data:
                    values,

                  backgroundColor:
                    "#234e78",

                  borderColor:
                    "#c6a66b",

                  borderWidth:
                    1,

                  borderRadius:
                    5,

                  maxBarThickness:
                    28

                }

              ]

          },

        options:
          {

            responsive:
              true,

            maintainAspectRatio:
              false,

            animation:
              {

                duration:
                  450

              },

            plugins:
              {

                legend:
                  {

                    display:
                      false

                  },

                tooltip:
                  {

                    callbacks:
                      {

                        label:
                          context => {

                            return (
                              formatValue(
                                context.parsed.y
                              )
                            );

                          }

                      }

                  }

              },

            scales:
              {

                x:
                  {

                    ticks:
                      {

                        maxRotation:
                          55,

                        minRotation:
                          35,

                        font:
                          {

                            size:
                              10

                          }

                      },

                    grid:
                      {

                        display:
                          false

                      }

                  },

                y:
                  {

                    beginAtZero:
                      true,

                    ticks:
                      {

                        font:
                          {

                            size:
                              10

                          }

                      }

                  }

              }

          }

      }
    );

}

/* =========================================================
   TABLE
   ========================================================= */

function updateTable() {

  const body =
    getElement(
      "countryTableBody"
    );

  if (
    !body
  {

    return;

  }

  const sorted =
    STATE.data
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value
      );

  if (
    sorted.length === 0
  {

    body.innerHTML = `

      <tr>

        <td colspan="3">
          No data available.
        </td>

      </tr>

    `;

    return;

  }

  body.innerHTML =
    sorted
      .map(
        item => `

          <tr>

            <td>
              ${escapeHTML(item.country)}
            </td>

            <td>
              ${escapeHTML(
                formatValue(
                  item.value
                )
              )}
            </td>

            <td>
              ${escapeHTML(
                STATE.year
              )}
            </td>

          </tr>

        `
      )
      .join("");

}

/* =========================================================
   SEARCH
   ========================================================= */

function setupCountrySearch() {

  const input =
    getElement(
      "countrySearch"
    );

  if (
    !input
  {

    return;

  }

  input.addEventListener(
    "input",
    () => {

      STATE.searchQuery =
        input.value
          .trim()
          .toLowerCase();

      searchCountry();

    }
  );

}

function searchCountry() {

  const query =
    STATE.searchQuery;

  if (
    !query ||
    !STATE.map
  {

    return;

  }

  const matched =
    STATE.data.find(
      item => {

        return (
          item.country
            .toLowerCase()
            .includes(
              query
            ) ||
          item.code
            .toLowerCase()
            .includes(
              query
            )
        );

      }
    );

  if (
    !matched
  {

    updateStatus(
      "No matching country found.",
      "warning"
    );

    return;

  }

  const layer =
    STATE.countryLayers
      .get(
        matched.code
      );

  if (
    layer &&
    layer.getBounds
  {

    STATE.map
      .fitBounds(
        layer.getBounds(),
        {

          padding:
            [30,30],

          maxZoom:
            5

        }
      );

    layer
      .openPopup();

    updateStatus(
      "Showing " +
      matched.country +
      ".",
      "success"
    );

  } else {

    updateStatus(
      "Country data exists but its map boundary could not be matched.",
      "warning"
    );

  }

}

/* =========================================================
   UPDATE BUTTON
   ========================================================= */

function setupRefreshButton() {

  const button =
    getElement(
      "refreshMapButton"
    );

  if (
    !button
  {

    return;

  }

  button.addEventListener(
    "click",
    async () => {

      STATE.indicator =
        getElement(
          "indicatorSelect"
        )?.value ||
        STATE.indicator;

      STATE.year =
        getElement(
          "yearSelect"
        )?.value ||
        STATE.year;

      await updateMapData();

    }
  );

}

/* =========================================================
   DATA RELOAD ON SELECT CHANGE
   ========================================================= */

function setupDataControls() {

  const indicator =
    getElement(
      "indicatorSelect"
    );

  const year =
    getElement(
      "yearSelect"
    );

  if (
    indicator
  {

    indicator.addEventListener(
      "change",
      () => {

        STATE.indicator =
          indicator.value;

        updateIndicatorDescription();

      }
    );

  }

  if (
    year
  {

    year.addEventListener(
      "change",
      () => {

        STATE.year =
          year.value;

      }
    );

  }

}

/* =========================================================
   INITIAL LOAD
   ========================================================= */

function initializeWebsite() {

  setupNavigation();

  setupMobileNavigation();

  setupYearSelector();

  setupIndicatorSelector();

  setupDataControls();

  setupCountrySearch();

  setupRefreshButton();

  updateIndicatorDescription();

}

/* =========================================================
   DOCUMENT READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeWebsite
  );

} else {

  initializeWebsite();

}

/* =========================================================
   END OF SCRIPT
   ========================================================= */
