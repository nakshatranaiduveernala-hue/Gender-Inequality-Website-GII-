document.addEventListener("DOMContentLoaded", function () {

  // MOBILE NAVIGATION
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      const isOpen = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ACTIVE NAVIGATION LINK
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".main-nav a");

  function updateActiveLink() {
    let currentSection = "";

    sections.forEach(function (section) {
      const sectionTop = section.offsetTop - 140;

      if (window.scrollY >= sectionTop) {
        currentSection = section.getAttribute("id");
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove("active");

      if (link.getAttribute("href") === "#" + currentSection) {
        link.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();

  // BACK TO TOP BUTTON
  const backToTop = document.getElementById("backToTop");

  if (backToTop) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 450) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    });

    backToTop.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // CHART DEFAULTS
  Chart.defaults.font.family = "'DM Sans', Arial, sans-serif";
  Chart.defaults.color = "#777b80";

  // CHART 1: WOMEN IN NATIONAL PARLIAMENTS
  const parliamentCanvas = document.getElementById("parliamentChart");

  if (parliamentCanvas && typeof Chart !== "undefined") {
    new Chart(parliamentCanvas, {
      type: "line",
      data: {
        labels: ["2015", "2026"],
        datasets: [{
          label: "Women holding parliamentary seats",
          data: [22.3, 27.4],
          borderColor: "#c6a66a",
          backgroundColor: "rgba(198, 166, 106, 0.16)",
          pointBackgroundColor: "#17283f",
          pointBorderColor: "#c6a66a",
          pointBorderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
          fill: true,
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.parsed.y + "% of parliamentary seats";
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 40,
            ticks: {
              callback: function (value) {
                return value + "%";
              }
            },
            grid: {
              color: "rgba(23, 40, 63, 0.08)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // CHART 2: UNPAID WORK
  const careCanvas = document.getElementById("careChart");

  if (careCanvas && typeof Chart !== "undefined") {
    new Chart(careCanvas, {
      type: "bar",
      data: {
        labels: ["Women", "Men"],
        datasets: [{
          label: "Average hours per day",
          data: [4.2, 1.7],
          backgroundColor: ["#c6a66a", "#263b53"],
          borderRadius: 4,
          maxBarThickness: 85
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.parsed.y + " hours per day";
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                return value + " hrs";
              }
            },
            grid: {
              color: "rgba(23, 40, 63, 0.08)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // INTERACTIVE WORLD MAP
  const mapElement = document.getElementById("equalityMap");

  if (mapElement && typeof L !== "undefined") {
    const map = L.map("equalityMap", {
      scrollWheelZoom: false
    }).setView([22, 15], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map);

    const locations = [
      {
        name: "United Nations Headquarters",
        city: "New York, United States",
        coordinates: [40.7489, -73.9680],
        description: "The United Nations works with countries to promote human rights, development and gender equality."
      },
      {
        name: "UN Women Headquarters",
        city: "New York, United States",
        coordinates: [40.7505, -73.9690],
        description: "UN Women supports the rights and empowerment of women and girls around the world."
      },
      {
        name: "United Nations Office at Geneva",
        city: "Geneva, Switzerland",
        coordinates: [46.2267, 6.1403],
        description: "The Geneva office hosts international work and discussions on human rights and global cooperation."
      },
      {
        name: "African Union Headquarters",
        city: "Addis Ababa, Ethiopia",
        coordinates: [8.9806, 38.7578],
        description: "The African Union is a continental organisation that works with member states on development, cooperation and equality."
      }
    ];

    locations.forEach(function (location) {
      L.marker(location.coordinates)
        .addTo(map)
        .bindPopup(
          "<strong>" + location.name + "</strong><br>" +
          location.city + "<br><br>" +
          location.description
        );
    });

    setTimeout(function () {
      map.invalidateSize();
    }, 300);
  }

});
