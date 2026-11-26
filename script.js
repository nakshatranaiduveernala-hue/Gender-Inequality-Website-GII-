(() => {
  "use strict";

  /* ---------------- NAVIGATION ---------------- */

  const nav = document.getElementById("mainNav");
  const menuToggle = document.getElementById("menuToggle");

  function showPage(id) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains("page")) return;

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    target.classList.add("active");

    document.querySelectorAll("#mainNav a").forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === "#" + id);
    });

    nav.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (id === "indicator" && worldMap) {
      setTimeout(() => worldMap.invalidateSize(), 250);
    }
  }

  document.querySelectorAll("#mainNav a").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showPage(link.getAttribute("href").slice(1));
    });
  });

  document.querySelectorAll('a[href^="#"]:not(#mainNav a)').forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href").slice(1);
      if (document.getElementById(id)?.classList.contains("page")) {
        event.preventDefault();
        showPage(id);
      }
    });
  });

  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });


  /* ---------------- IMAGE FALLBACK ---------------- */

  document.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => {
      img.classList.add("image-unavailable");
      img.alt = img.alt + " — image could not be loaded";
    }, { once: true });
  });


  /* ---------------- DATA SETTINGS ---------------- */

  const countryList = [
    { name: "India", code: "IND", region: "South Asia" },
    { name: "Nepal", code: "NPL", region: "South Asia" },
    { name: "Bangladesh", code: "BGD", region: "South Asia" },
    { name: "Pakistan", code: "PAK", region: "South Asia" },
    { name: "United States", code: "USA", region: "North America" },
    { name: "Rwanda", code: "RWA", region: "Africa" },
    { name: "Sweden", code: "SWE", region: "Europe" },
    { name: "Japan", code: "JPN", region: "East Asia" }
  ];

  const indicatorInfo = {
    "SG.GEN.PARL.ZS": {
      title: "Women in Parliament",
      unit: "% of seats",
      description: "Percentage of seats in national parliaments held by women."
    },
    "SP.ADO.TFRT": {
      title: "Adolescent fertility rate",
      unit: "Births per 1,000 women ages 15–19",
      description: "Annual births per 1,000 women in the 15–19 age group."
    },
    "SH.STA.MMRT": {
      title: "Maternal mortality ratio",
      unit: "Deaths per 100,000 live births",
      description: "Maternal deaths per 100,000 live births."
    }
  };

  const chartInstances = {};

  function drawChart(id, type, labels, datasets, yTitle = "") {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return;

    if (chartInstances[id]) {
      chartInstances[id].destroy();
    }

    chartInstances[id] = new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: "bottom"
          },
          tooltip: {
            callbacks: {
              label: context => {
                const value = context.parsed.y;
                return `${context.dataset.label}: ${Number(value).toLocaleString(undefined, {
                  maximumFractionDigits: 2
                })}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: Boolean(yTitle),
              text: yTitle
            },
            grid: { color: "#e7eef4" }
          },
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxRotation: 35
            }
          }
        }
      }
    });
  }


  /* ---------------- WORLD BANK API ---------------- */

  async function getCountryData(countryCode, indicator) {
    const url =
      `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=100`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("World Bank request failed");
    }

    const json = await response.json();

    return (json[1] || [])
      .filter(item => item.value !== null && item.value !== undefined)
      .map(item => ({
        year: Number(item.date),
        value: Number(item.value)
      }))
      .sort((a, b) => a.year - b.year);
  }

  async function getAllCountryData(indicator) {
    const url =
      `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("World Bank data request failed");
    }

    const json = await response.json();
    const records = json[1] || [];
    const latest = {};

    records.forEach(item => {
      if (!item.countryiso3code || item.value === null || item.value === undefined) {
        return;
      }

      const code = item.countryiso3code;
      const year = Number(item.date);

      if (!latest[code] || year > latest[code].year) {
        latest[code] = {
          value: Number(item.value),
          year,
          name: item.country?.value || code
        };
      }
    });

    return latest;
  }

  function latestRecord(series) {
    return series.length ? series[series.length - 1] : null;
  }

  function addChartMessage(id, message) {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (parent.querySelector(".data-message")) return;

    const note = document.createElement("p");
    note.className = "data-message chart-note";
    note.textContent = message;
    parent.appendChild(note);
  }


  /* ---------------- INDIA CHART ---------------- */

  async function loadIndiaChart() {
    try {
      const results = await Promise.all(
        countryList.map(country =>
          getCountryData(country.code, "SG.GEN.PARL.ZS")
        )
      );

      const values = results.map(series => latestRecord(series)?.value ?? null);

      drawChart(
        "indiaChart",
        "bar",
        countryList.map(country => country.name),
        [{
          label: "Women in parliament (%)",
          data: values,
          backgroundColor: "#5599c4",
          borderRadius: 5
        }],
        "% of parliamentary seats"
      );
    } catch (error) {
      addChartMessage("indiaChart", "Country data could not load. Please check your internet connection.");
    }
  }


  /* ---------------- TRENDS CHARTS ---------------- */

  async function loadGlobalTrend() {
    try {
      const series = await getCountryData("WLD", "SG.GEN.PARL.ZS");

      drawChart(
        "globalTrendChart",
        "line",
        series.map(item => item.year),
        [{
          label: "World (%)",
          data: series.map(item => item.value),
          borderColor: "#286b9b",
          backgroundColor: "#9bcde8",
          pointRadius: 2,
          tension: 0.25,
          fill: true
        }],
        "% of seats"
      );
    } catch (error) {
      addChartMessage("globalTrendChart", "Global trend data could not load.");
    }
  }

  async function loadCountryChart() {
    try {
      const results = await Promise.all(
        countryList.map(country =>
          getCountryData(country.code, "SG.GEN.PARL.ZS")
        )
      );

      const values = results.map(series => latestRecord(series)?.value ?? null);

      drawChart(
        "countryChart",
        "bar",
        countryList.map(country => country.name),
        [{
          label: "Latest available value (%)",
          data: values,
          backgroundColor: "#78b4d6",
          borderRadius: 5
        }],
        "% of seats"
      );
    } catch (error) {
      addChartMessage("countryChart", "Country comparison data could not load.");
    }
  }

  async function loadRegionalChart() {
    try {
      const results = await Promise.all(
        countryList.map(country =>
          getCountryData(country.code, "SG.GEN.PARL.ZS")
        )
      );

      const grouped = {};

      countryList.forEach((country, index) => {
        const record = latestRecord(results[index]);
        if (!record) return;

        if (!grouped[country.region]) grouped[country.region] = [];
        grouped[country.region].push(record.value);
      });

      const labels = Object.keys(grouped);
      const averages = labels.map(region => {
        const values = grouped[region];
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      });

      drawChart(
        "regionChart",
        "bar",
        labels,
        [{
          label: "Sample country average (%)",
          data: averages,
          backgroundColor: "#326f9d",
          borderRadius: 5
        }],
        "% of seats"
      );
    } catch (error) {
      addChartMessage("regionChart", "Regional sample data could not load.");
    }
  }

  async function loadDistributionChart() {
    try {
      const data = await getAllCountryData("SG.GEN.PARL.ZS");
      const values = Object.values(data).map(item => item.value);

      const groups = [
        { label: "0–9.9%", min: 0, max: 10 },
        { label: "10–19.9%", min: 10, max: 20 },
        { label: "20–29.9%", min: 20, max: 30 },
        { label: "30–39.9%", min: 30, max: 40 },
        { label: "40–49.9%", min: 40, max: 50 },
        { label: "50%+", min: 50, max: Infinity }
      ];

      const counts = groups.map(group =>
        values.filter(value => value >= group.min && value < group.max).length
      );

      drawChart(
        "distributionChart",
        "bar",
        groups.map(group => group.label),
        [{
          label: "Number of countries",
          data: counts,
          backgroundColor: "#5599c4",
          borderRadius: 5
        }],
        "Number of countries"
      );
    } catch (error) {
      addChartMessage("distributionChart", "Distribution data could not load.");
    }
  }


  /* ---------------- INDICATOR COMPARISON ---------------- */

  async function loadIndicatorComparison(indicator) {
    try {
      const results = await Promise.all(
        countryList.map(country => getCountryData(country.code, indicator))
      );

      const values = results.map(series => latestRecord(series)?.value ?? null);

      drawChart(
        "indicatorComparisonChart",
        "bar",
        countryList.map(country => country.name),
        [{
          label: indicatorInfo[indicator].title,
          data: values,
          backgroundColor: "#5599c4",
          borderRadius: 5
        }],
        indicatorInfo[indicator].unit
      );
    } catch (error) {
      addChartMessage("indicatorComparisonChart", "Indicator comparison data could not load.");
    }
  }

  const comparisonSelect = document.getElementById("comparisonIndicator");

  comparisonSelect.addEventListener("change", () => {
    loadIndicatorComparison(comparisonSelect.value);
  });


  /* ---------------- WORLD MAP ---------------- */

  let worldMap = null;
  let countryLayer = null;
  let mapValues = {};
  let currentMapIndicator = "SG.GEN.PARL.ZS";

  function getFeatureCode(properties) {
    return (
      properties["ISO3166-1-Alpha-3"] ||
      properties.ISO_A3 ||
      properties.iso_a3 ||
      properties.ADM0_A3 ||
      properties.adm0_a3 ||
      properties.SOV_A3 ||
      null
    );
  }

  function mapColour(value, minimum, maximum) {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return "#e5edf2";
    }

    if (maximum === minimum) return "#5599c4";

    const fraction = (value - minimum) / (maximum - minimum);

    if (fraction < 0.2) return "#d7e8f2";
    if (fraction < 0.4) return "#a7cde2";
    if (fraction < 0.6) return "#76afd1";
    if (fraction < 0.8) return "#4388b5";
    return "#174b78";
  }

  function createMap() {
    if (worldMap || !document.getElementById("worldMap")) return;

    if (!window.L) {
      document.getElementById("worldMap").textContent =
        "The map library could not load. Please check your internet connection.";
      return;
    }

    worldMap = L.map("worldMap", {
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 7
    }).setView([18, 10], 2);

    /* OpenStreetMap tiles: no CARTO API-key watermark */
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 7
    }).addTo(worldMap);
  }

  async function loadWorldMap() {
    createMap();
    if (!worldMap) return;

    const infoBox = document.getElementById("mapInfo");
    infoBox.textContent = "Loading country data…";

    try {
      const [data, geoResponse] = await Promise.all([
        getAllCountryData(currentMapIndicator),
        fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      ]);

      if (!geoResponse.ok) throw new Error("Map boundaries unavailable");

      const geoData = await geoResponse.json();
      mapValues = data;

      const values = Object.values(data).map(item => item.value);
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);

      if (countryLayer) {
        worldMap.removeLayer(countryLayer);
      }

      countryLayer = L.geoJSON(geoData, {
        style: feature => {
          const code = getFeatureCode(feature.properties || {});
          const record = data[code];

          return {
            fillColor: mapColour(record?.value, minimum, maximum),
            weight: 0.65,
            color: "#ffffff",
            fillOpacity: 0.9
          };
        },

        onEachFeature: (feature, layer) => {
          const properties = feature.properties || {};
          const code = getFeatureCode(properties);
          const record = data[code];
          const countryName =
            properties.ADMIN ||
            properties.name ||
            properties.NAME ||
            code ||
            "Country";

          const displayValue = record
            ? `${record.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${record.year})`
            : "No data available";

          layer.bindTooltip(
            `${countryName}: ${displayValue}`,
            { sticky: true }
          );

          layer.on("click", () => {
            infoBox.innerHTML = "";

            const heading = document.createElement("strong");
            heading.textContent = countryName;

            const detail = document.createElement("p");
            detail.textContent = record
              ? `${indicatorInfo[currentMapIndicator].title}: ${record.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicatorInfo[currentMapIndicator].unit}. Data year: ${record.year}.`
              : "No observation was returned for this country and indicator.";

            infoBox.append(heading, detail);
          });
        }
      }).addTo(worldMap);

      infoBox.textContent =
        "Map loaded. Select a country to view its latest available value. Grey countries have no returned observation.";

      worldMap.invalidateSize();
    } catch (error) {
      infoBox.textContent =
        "The map data could not load. The map uses OpenStreetMap tiles and public country-boundary data; check your internet connection.";
    }
  }

  document.getElementById("mapIndicator").addEventListener("change", event => {
    currentMapIndicator = event.target.value;
    loadWorldMap();
  });


  /* ---------------- SPEECH VIDEO EMBED ---------------- */

  document.getElementById("embedVideo").addEventListener("click", () => {
    const input = document.getElementById("videoLink").value.trim();
    const container = document.getElementById("videoContainer");

    if (!input) {
      container.textContent = "Paste a YouTube link first.";
      return;
    }

    try {
      const url = new URL(input);
      let videoId = "";

      if (url.hostname === "youtu.be") {
        videoId = url.pathname.replace("/", "").split("/")[0];
      } else if (
        url.hostname === "www.youtube.com" ||
        url.hostname === "youtube.com" ||
        url.hostname === "m.youtube.com"
      ) {
        videoId = url.searchParams.get("v") ||
          url.pathname.split("/").filter(Boolean).pop();
      }

      if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        container.textContent = "That does not look like a valid YouTube video link.";
        return;
      }

      container.innerHTML = "";

      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
      frame.title = "Student speech presentation";
      frame.allowFullscreen = true;
      frame.loading = "lazy";
      frame.referrerPolicy = "strict-origin-when-cross-origin";

      container.appendChild(frame);
    } catch (error) {
      container.textContent = "Please enter a valid YouTube URL.";
    }
  });


  /* ---------------- STARTUP ---------------- */

  loadIndiaChart();
  loadGlobalTrend();
  loadCountryChart();
  loadRegionalChart();
  loadDistributionChart();
  loadIndicatorComparison("SG.GEN.PARL.ZS");
  loadWorldMap();

})();
