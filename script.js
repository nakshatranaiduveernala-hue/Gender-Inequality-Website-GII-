// Navigation for smaller screens
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

// Shared chart styling
const gold = "#b99a61";
const navy = "#243a54";
const muted = "#7d8790";
const grid = "rgba(36,58,84,.10)";

Chart.defaults.font.family = '"DM Sans", Arial, sans-serif';
Chart.defaults.color = muted;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = "#17283f";
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.titleFont = { weight: "600" };
Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };

// Chart 1: Women in national parliaments
new Chart(document.getElementById("parliamentChart"), {
  type: "bar",
  data: {
    labels: ["2015", "2026"],
    datasets: [{
      data: [22.3, 27.4],
      backgroundColor: [
        "rgba(185,154,97,.55)",
        gold
      ],
      borderRadius: 5,
      maxBarThickness: 70
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: c => `${c.raw}% of seats`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 40,
        grid: { color: grid },
        ticks: {
          callback: v => `${v}%`,
          stepSize: 10
        }
      },
      x: {
        grid: { display: false }
      }
    }
  }
});

// Chart 2: Women in management
new Chart(document.getElementById("managementChart"), {
  type: "bar",
  data: {
    labels: ["2015", "2025"],
    datasets: [{
      data: [26.9, 30.5],
      backgroundColor: [
        "rgba(36,58,84,.55)",
        navy
      ],
      borderRadius: 5,
      barThickness: 34
    }]
  },
  options: {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: c => `${c.raw}% of managerial positions`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 40,
        grid: { color: grid },
        ticks: {
          callback: v => `${v}%`,
          stepSize: 10
        }
      },
      y: {
        grid: { display: false }
      }
    }
  }
});

// Chart 3: Unpaid care work
new Chart(document.getElementById("careChart"), {
  type: "bar",
  data: {
    labels: ["Women", "Men"],
    datasets: [{
      data: [4.2, 1.7],
      backgroundColor: [gold, navy],
      borderRadius: 5,
      maxBarThickness: 115
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: c => `${c.raw} hours per day`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        grid: { color: grid },
        ticks: {
          callback: v => `${v} hrs`,
          stepSize: 1
        }
      },
      x: {
        grid: { display: false }
      }
    }
  }
});

// Interactive context map
// Markers show places discussed in the website,
// not statistical rankings.
if (
  document.getElementById("equalityMap") &&
  window.L
) {
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
      text: "India focus: education, work, representation and implementation of equality protections.",
      color: gold
    },
    {
      name: "Ethiopia",
      coords: [9.1, 40.5],
      text: "Education example: UNICEF has documented efforts to support female teachers and girls' learning.",
      color: navy
    },
    {
      name: "Global reporting",
      coords: [0, 0],
      text: "UN global reporting brings together indicators from countries around the world.",
      color: navy
    }
  ];

  points.forEach(point => {
    const marker = L.circleMarker(point.coords, {
      radius: 8,
      color: point.color,
      fillColor: point.color,
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map);

    marker.bindPopup(
      `<strong>${point.name}</strong><br>${point.text}`
    );
  });
}
