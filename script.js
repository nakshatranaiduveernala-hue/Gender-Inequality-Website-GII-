
document.addEventListener("DOMContentLoaded", () => {

  // MOBILE NAVIGATION
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.textContent = isOpen ? "×" : "☰";
    });

    mainNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "☰";
      });
    });
  }

  // SMOOTH NAVIGATION
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));

      if (target) {
        event.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });

  // ACTIVE NAVIGATION LINK
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll("#mainNav a");

  function updateActiveLink() {
    let current = "";

    sections.forEach(section => {
      if (window.scrollY >= section.offsetTop - 150) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === "#" + current
      );
    });
  }

  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();

  // BACK TO TOP
  const backToTop = document.getElementById("backToTop");

  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("show", window.scrollY > 500);
    });

    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // CHART DEFAULT SETTINGS
  const chartText = "#263344";
  const gold = "#b58b4c";
  const navy = "#263b53";
  const paleGold = "#e4d2ad";

  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = chartText;

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "#ebe5da"
        },
        ticks: {
          callback: value => value + "%"
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // GLOBAL WOMEN'S PARLIAMENTARY REPRESENTATION
  const globalCanvas = document.getElementById("globalChart");

  if (globalCanvas) {
    new Chart(globalCanvas, {
      type: "line",
      data: {
        labels: ["2015", "2020", "2023", "2025", "2026"],
        datasets: [{
          label: "Seats held by women",
          data: [22.3, 25.5, 26.9, 27.2, 27.4],
          borderColor: gold,
          backgroundColor: "rgba(181,139,76,0.15)",
          pointBackgroundColor: navy,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: context => context.parsed.y + "% of seats"
            }
          }
        }
      }
    });
  }

  // INDIA LABOUR-FORCE PARTICIPATION
  const workCanvas = document.getElementById("indiaWorkChart");

  if (workCanvas) {
    new Chart(workCanvas, {
      type: "bar",
      data: {
        labels: ["Women", "Men"],
        datasets: [{
          label: "Labour-force participation",
          data: [35.1, 76.4],
          backgroundColor: [gold, navy],
          borderRadius: 5,
          maxBarThickness: 85
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: context => context.parsed.y + "%"
            }
          }
        }
      }
    });
  }

  // INDIA SECONDARY EDUCATION ATTAINMENT
  const educationCanvas = document.getElementById("educationChart");

  if (educationCanvas) {
    new Chart(educationCanvas, {
      type: "bar",
      data: {
        labels: ["Women", "Men"],
        datasets: [{
          label: "At least some secondary education",
          data: [43.5, 61.1],
          backgroundColor: [gold, navy],
          borderRadius: 5,
          maxBarThickness: 65
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: context => context.parsed.y + "%"
            }
          }
        }
      }
    });
  }

  // INTERACTIVE WORLD MAP
  const mapElement = document.getElementById("worldMap");

  if (mapElement && typeof L !== "undefined") {
    const map = L.map("worldMap", {
      scrollWheelZoom: false
    }).setView([20, 15], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map);

    const locations = [
      {
        name: "New York, USA",
        coordinates: [40.7128, -74.0060],
        description: "The United Nations headquarters. The UN works with countries to advance gender equality and the Sustainable Development Goals."
      },
      {
        name: "Geneva, Switzerland",
        coordinates: [46.2044, 6.1432],
        description: "Home to international organisations and human-rights institutions that work on equality and non-discrimination."
      },
      {
        name: "New Delhi, India",
        coordinates: [28.6139, 77.2090],
        description: "A reference point for exploring gender equality research, policy and women's opportunities in India."
      },
      {
        name: "Nairobi, Kenya",
        coordinates: [-1.2921, 36.8219],
        description: "Home to UN Environment Programme and UN-Habitat headquarters, and a centre for international development work."
      }
    ];

    locations.forEach(place => {
      L.marker(place.coordinates)
        .addTo(map)
        .bindPopup(
          `<strong>${place.name}</strong><br>${place.description}`
        );
    });

    setTimeout(() => map.invalidateSize(), 300);
  }

});
