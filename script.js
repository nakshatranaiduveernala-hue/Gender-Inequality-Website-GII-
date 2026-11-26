(() => {
  const nav = document.getElementById("nav");
  const menu = document.getElementById("menu");

  function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(id);
    if (page) page.classList.add("active");

    document.querySelectorAll("#nav a").forEach(a =>
      a.classList.toggle("active", a.hash === "#" + id)
    );

    nav.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (id === "indicator" && map) {
      setTimeout(() => map.invalidateSize(), 250);
    }
  }

  document.querySelectorAll("#nav a").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      showPage(a.hash.substring(1));
    });
  });

  document.querySelectorAll('a[href^="#"]:not(#nav a)').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.hash.substring(1);
      if (document.getElementById(id)?.classList.contains("page")) {
        e.preventDefault();
        showPage(id);
      }
    });
  });

  menu.addEventListener("click", () => nav.classList.toggle("open"));

  document.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => {
      img.alt += " (image unavailable)";
      img.style.background = "linear-gradient(135deg,#dcebf5,#9dc8df)";
      img.style.minHeight = "120px";
    }, { once: true });
  });

  const countries = [
    ["India", "IND"], ["Nepal", "NPL"], ["Bangladesh", "BGD"],
    ["Pakistan", "PAK"], ["United States", "USA"], ["Rwanda", "RWA"],
    ["Sweden", "SWE"], ["Japan", "JPN"]
  ];

  const indicators = {
    "SG.GEN.PARL.ZS": {
      title: "Women in Parliament (%)",
      desc: "Percentage of seats in national parliaments held by women. It measures representation, not necessarily influence or policy outcomes.",
      why: "Representation is one dimension of participation in decision-making. Consider it alongside rights, institutions, participation and policy.",
      limit: "Seat share does not measure influence, representation of all groups or policy outcomes. National averages can hide local differences."
    },
    "SP.ADO.TFRT": {
      title: "Adolescent fertility rate",
      desc: "Births per 1,000 women ages 15–19. This indicator reflects a range of social, health, education and economic conditions.",
      why: "Rates can relate to education, access to health services, social conditions and opportunity. These associations do not establish one cause.",
      limit: "Rates do not describe individual experiences or establish why rates differ. Data may be estimated or unevenly available."
    },
    "SH.STA.MMRT": {
      title: "Maternal mortality ratio",
      desc: "Maternal deaths per 100,000 live births. Estimates reflect health risks and access to quality services.",
      why: "This indicator can help explore health-system access and disparities, alongside other evidence.",
      limit: "Estimates, definitions, data quality and context matter. This indicator alone cannot explain outcomes."
    }
  };

  const charts = {};

  function makeChart(id, type, labels, datasets, unit = "") {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return;

    if (charts[id]) charts[id].destroy();

    charts[id] = new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: datasets.length > 1 }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: !!unit, text: unit }
          },
          x: {
            ticks: { autoSkip: true, maxRotation: 30 }
          }
        }
      }
    });
  }

  async function worldBank(country, indicator) {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=100`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Data request failed");

    const data = await response.json();

    return (data[1] || [])
      .filter(d => d.value !== null)
      .map(d => ({ year: Number(d.date), value: Number(d.value) }))
      .sort((a, b) => a.year - b.year);
  }

  function latest(data) {
    return data.length ? data[data.length - 1] : null;
  }

  async function comparisonChart(indicator, canvasId, selectedCountries = countries) {
    try {
      const series = await Promise.all(
        selectedCountries.map(c => worldBank(c[1], indicator))
      );

      const values = series.map(d => latest(d)?.value ?? null);

      makeChart(canvasId, "bar",
        selectedCountries.map(c => c[0]),
        [{
          label: indicators[indicator].title,
          data: values,
          backgroundColor: "#78b9dc"
        }],
        indicators[indicator].title
      );
    } catch (error) {
      const canvas = document.getElementById(canvasId);
      if (canvas && canvas.parentElement) {
        canvas.parentElement.insertAdjacentHTML(
          "beforeend",
          '<p class="caption">Data could not load. Check your connection.</p>'
        );
      }
    }
  }

  async function loadIndiaChart() {
    await comparisonChart("SG.GEN.PARL.ZS", "indiaChart");
  }

  async function loadTrendChart() {
    try {
      const data = await worldBank("WLD", "SG.GEN.PARL.ZS");

      makeChart("trendChart", "line",
        data.map(d => d.year),
        [{
          label: "World (%)",
          data: data.map(d => d.value),
          borderColor: "#2879b4",
          backgroundColor: "#2879b4",
          tension: 0.25
        }],
        "% seats"
      );
    } catch (error) {
      const canvas = document.getElementById("trendChart");
      if (canvas && canvas.parentElement) {
        canvas.parentElement.insertAdjacentHTML(
          "beforeend",
          '<p class="caption">Global series could not load.</p>'
        );
      }
    }
  }

  let map = null;
  let mapLayer = null;
  let selectedIndicator = "SG.GEN.PARL.ZS";

  function initMap() {
    if (map || !document.getElementById("map")) return;

    if (!window.L) {
      document.getElementById("map").textContent =
        "Map library could not load. Check your connection.";
      return;
    }

    map = L.map("map").setView([18, 10], 2);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      maxZoom: 8
    }).addTo(map);
  }

  async function loadMap() {
    initMap();
    if (!map) return;

    try {
      const response = await fetch(
        `https://api.worldbank.org/v2/country/all/indicator/${selectedIndicator}?format=json&per_page=20000`
      );

      if (!response.ok) throw new Error("Data request failed");

      const json = await response.json();
      const values = {};

      (json[1] || []).forEach(d => {
        if (d.countryiso3code && d.value !== null) {
          const code = d.countryiso3code;
          const year = Number(d.date);

          if (!values[code] || year > values[code].year) {
            values[code] = {
              value: Number(d.value),
              year
            };
          }
        }
      });

      const geoResponse = await fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
      );

      if (!geoResponse.ok) throw new Error("Map data failed");

      const geoJSON = await geoResponse.json();

      const all = Object.values(values).map(v => v.value);
      const min = Math.min(...all);
      const max = Math.max(...all);

      function colour(value) {
        if (value === undefined || value === null) return "#e3ebf0";
        if (max === min) return "#5798c5";

        const t = (value - min) / (max - min);

        if (t < .2) return "#d8e9f4";
        if (t < .4) return "#a6cee3";
        if (t < .6) return "#75b5d7";
        if (t < .8) return "#3b86b8";
        return "#174b78";
      }

      if (mapLayer) map.removeLayer(mapLayer);

      mapLayer = L.geoJSON(geoJSON, {
        style: feature => {
          const p = feature.properties || {};
          const code = p["ISO3166-1-Alpha-3"] || p.ADM0_A3 || p.iso_a3 || p.ISO_A3;
          return {
            fillColor: colour(values[code]?.value),
            color: "#fff",
            weight: .5,
            fillOpacity: .86
          };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          const code = p["ISO3166-1-Alpha-3"] || p.ADM0_A3 || p.iso_a3 || p.ISO_A3;
          const record = values[code];
          const name = p.name || p.ADMIN || code;

          layer.bindTooltip(
            `${name}: ${record ? record.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " · " + record.year : "No data"}`
          );
        }
      }).addTo(map);

      map.invalidateSize();
    } catch (error) {
      document.getElementById("map").innerHTML =
        "Map or data could not load. Check your internet connection.";
    }
  }

  function updateIndicator() {
    const id = selectedIndicator;
    const info = indicators[id];

    const chartTitle = document.querySelector("#indicator .chart-panel h2");
    if (chartTitle) chartTitle.textContent = info.title;

    comparisonChart(id, "indicatorChart");
    loadMap();
  }

  document.getElementById("indicatorSelect").addEventListener("change", e => {
    selectedIndicator = e.target.value;
    updateIndicator();
  });

  document.getElementById("updateChart").addEventListener("click", () => {
    const selected = Array.from(
      document.getElementById("countrySelect").selectedOptions
    ).map(option => {
      const match = countries.find(c => c[1] === option.value);
      return match;
    }).filter(Boolean);

    comparisonChart(selectedIndicator, "indicatorChart", selected);
  });

  document.getElementById("loadVideo").addEventListener("click", () => {
    const input = document.getElementById("videoUrl").value.trim();
    const box = document.getElementById("videoFrame");

    if (!input) {
      box.textContent = "Please paste a YouTube link.";
      return;
    }

    try {
      const url = new URL(input);
      let id = "";

      if (url.hostname === "youtu.be") {
        id = url.pathname.slice(1);
      } else if (url.hostname.includes("youtube.com")) {
        id = url.searchParams.get("v") ||
             url.pathname.split("/").filter(Boolean).pop();
      }

      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
        box.textContent = "Please enter a valid YouTube link.";
        return;
      }

      box.innerHTML = "";

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}`;
      iframe.title = "Presentation video";
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");

      box.appendChild(iframe);
    } catch (error) {
      box.textContent = "Invalid link. Paste a YouTube URL.";
    }
  });

  window.addEventListener("resize", () => {
    Object.values(charts).forEach(chart => chart.resize());
  });

  loadIndiaChart();
  loadTrendChart();
  comparisonChart(selectedIndicator, "globalCountryChart");
  comparisonChart(selectedIndicator, "indicatorChart");
  loadMap();

})();
