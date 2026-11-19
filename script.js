// Responsive navigation
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle?.addEventListener("click", () => {
  const opened = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(opened));
});

mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

// Charts using sourced global data
const gold = "#b99a61";
const navy = "#243a54";
const muted = "#7d8790";
const grid = "rgba(36,58,84,.10)";

if (window.Chart) {
  Chart.defaults.font.family = '"DM Sans", Arial, sans-serif';
  Chart.defaults.color = muted;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = "#17283f";
  Chart.defaults.plugins.tooltip.padding = 12;

  const makeChart = (id, labels, values, options = {}) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: options.colors || [gold, navy],
          borderRadius: 5,
          maxBarThickness: options.maxBarThickness || 70
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: context => options.format(context.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: options.max,
            grid: { color: grid },
            ticks: {
              stepSize: options.step,
              callback: value => value + "%"
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  };

  // Indicator 1: Parliamentary representation
  // World Bank Gender Data Portal / IPU
  makeChart(
    "parliamentChart",
    ["2015", "2025"],
    [22.8, 27.2],
    {
      max: 40,
      step: 10,
      format: value => value + "% of parliamentary seats held by women"
    }
  );

  // Indicator 2: Women in managerial positions
  // UN SDG Statistical Annex 2025
  makeChart(
    "managementChart",
    ["2015", "2023"],
    [27.7, 30.0],
    {
      max: 40,
      step: 10,
      format: value => value + "% of managerial positions held by women",
      colors: ["rgba(36,58,84,.55)", navy]
    }
  );

  // Indicator 3: Global unpaid-care estimate
  // UN report E/CN.5/2026/4
  makeChart(
    "careChart",
    ["Women", "Remaining share"],
    [76, 24],
    {
      max: 100,
      step: 25,
      format: value => value + "% of the estimated global share of unpaid care work",
      colors: [gold, navy],
      maxBarThickness: 115
    }
  );
}

// Interactive context map
// These markers are examples, not rankings.
if (document.getElementById("equalityMap") && window.L) {
  const map = L.map("equalityMap", {
    scrollWheelZoom: false
  }).setView([19, 43], 2);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 6
    }
  ).addTo(map);

  const points = [
    {
      name: "India",
      coords: [22.5, 79],
      text: "Country focus: education, work, representation and policy implementation.",
      color: gold
    },
    {
      name: "Ethiopia",
      coords: [9.1, 40.5],
      text: "Example referenced in international education and gender initiatives.",
      color: navy
    },
    {
      name: "Global reporting",
      coords: [0, 0],
      text: "International institutions compile indicators and comparative reports.",
      color: navy
    }
  ];

  points.forEach(point => {
    L.circleMarker(point.coords, {
      radius: 8,
      color: point.color,
      fillColor: point.color,
      fillOpacity: .9,
      weight: 2
    })
      .addTo(map)
      .bindPopup(`<strong>${point.name}</strong><br>${point.text}`);
  });
}
