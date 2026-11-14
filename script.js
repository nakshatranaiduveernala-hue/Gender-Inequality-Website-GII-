/* =====================================
   THE EQUALITY PROJECT
   Website interactions and visualisations
===================================== */


/* MOBILE NAVIGATION */

const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    navigation.classList.toggle("open");
  });

  navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
    });
  });
}


/* ACTIVE NAVIGATION LINK */

const pageSections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll(".navigation a");

const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.remove("active");

          if (link.getAttribute("href") === "#" + entry.target.id) {
            link.classList.add("active");
          }
        });
      }
    });
  },
  {
    rootMargin: "-30% 0px -60% 0px"
  }
);

pageSections.forEach(section => {
  sectionObserver.observe(section);
});


/* CHART DEFAULT SETTINGS */

Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = "#263b53";

const gold = "#c6a66a";
const navy = "#17283f";
const muted = "#77766f";
const ivory = "#f7f4ed";


/* CHART 1: WOMEN IN PARLIAMENT
   Vertical bar chart
*/

const parliamentCanvas = document.getElementById("parliamentChart");

if (parliamentCanvas) {
  new Chart(parliamentCanvas, {
    type: "bar",

    data: {
      labels: ["2015", "2026"],

      datasets: [{
        label: "Women's share of parliamentary seats",
        data: [22.3, 27.5],

        backgroundColor: [
          "rgba(198, 166, 106, 0.65)",
          navy
        ],

        borderColor: [
          gold,
          navy
        ],

        borderWidth: 1,
        borderRadius: 5,
        maxBarThickness: 100
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: true,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            label: context => context.parsed.y + "%"
          }
        }
      },

      scales: {
        y: {
          beginAtZero: true,
          max: 35,

          title: {
            display: true,
            text: "Percentage of seats"
          },

          grid: {
            color: "#e8e2d7"
          },

          ticks: {
            callback: value => value + "%"
          }
        },

        x: {
          grid: {
            display: false
          },

          title: {
            display: true,
            text: "Year"
          }
        }
      }
    }
  });
}


/* CHART 2: UNPAID CARE WORK
   Horizontal bar chart
*/

const careCanvas = document.getElementById("careChart");

if (careCanvas) {
  new Chart(careCanvas, {
    type: "bar",

    data: {
      labels: ["Women", "Men"],

      datasets: [{
        label: "Average hours per day",

        data: [4.2, 1.7],

        backgroundColor: [
          gold,
          navy
        ],

        borderRadius: 5,
        maxBarThickness: 65
      }]
    },

    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: true,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            label: context => context.parsed.x + " hours per day"
          }
        }
      },

      scales: {
        x: {
          beginAtZero: true,
          max: 5,

          title: {
            display: true,
            text: "Average hours per day"
          },

          grid: {
            color: "#e8e2d7"
          }
        },

        y: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}


/* CHART 3: PARLIAMENTARY REPRESENTATION
   Doughnut chart
*/

const representationCanvas =
  document.getElementById("representationChart");

if (representationCanvas) {
  new Chart(representationCanvas, {
    type: "doughnut",

    data: {
      labels: ["Women", "Men"],

      datasets: [{
        data: [27.5, 72.5],

        backgroundColor: [
          gold,
          navy
        ],

        borderColor: ivory,
        borderWidth: 5,
        hoverOffset: 8
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "65%",

      plugins: {
        legend: {
          position: "bottom",

          labels: {
            padding: 22,
            usePointStyle: true
          }
        },

        tooltip: {
          callbacks: {
            label: context =>
              context.label + ": " + context.parsed + "%"
          }
        }
      }
    }
  });
}


/* INTERACTIVE WORLD MAP */

const mapElement = document.getElementById("equalityMap");

if (mapElement && typeof L !== "undefined") {

  const map = L.map("equalityMap", {
    scrollWheelZoom: false
  }).setView([20, 15], 2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }
  ).addTo(map);

  const locations = [
    {
      name: "United Nations Headquarters",
      city: "New York, USA",
      coordinates: [40.7484, -73.9680],
      description:
        "The United Nations works with countries on international cooperation and the Sustainable Development Goals."
    },

    {
      name: "UN Women Headquarters",
      city: "New York, USA",
      coordinates: [40.7505, -73.9934],
      description:
        "UN Women works to advance women's rights, leadership and gender equality."
    },

    {
      name: "African Union Headquarters",
      city: "Addis Ababa, Ethiopia",
      coordinates: [8.9806, 38.7578],
      description:
        "The African Union is a continental organisation that works with African countries on shared development goals."
    },

    {
      name: "UNESCO Headquarters",
      city: "Paris, France",
      coordinates: [48.8492, 2.3066],
      description:
        "UNESCO works internationally on education, science, culture and cooperation."
    }
  ];

  const goldMarker = L.divIcon({
    className: "custom-map-marker",

    html: `
      <div style="
        width: 17px;
        height: 17px;
        background: #c6a66a;
        border: 3px solid #17283f;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      "></div>
    `,

    iconSize: [17, 17],
    iconAnchor: [8, 8]
  });

  locations.forEach(location => {

    L.marker(location.coordinates, {
      icon: goldMarker
    })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: Arial, sans-serif; max-width: 220px;">
          <strong style="color: #17283f;">
            ${location.name}
          </strong>

          <p style="margin: 5px 0; color: #77766f;">
            ${location.city}
          </p>

          <p style="font-size: 12px; line-height: 1.5;">
            ${location.description}
          </p>
        </div>
      `);
  });

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}'
