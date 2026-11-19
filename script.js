
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    if (menuToggle) menuToggle.textContent = "☰";
  });
});

if (typeof Chart !== "undefined") {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = "#6c706a";
  Chart.defaults.animation.duration = 1000;

  const gridColor = "rgba(32,42,38,.10)";
  const green = "#405c4c";
  const terracotta = "#b56c50";
  const gold = "#b99b69";
  const paleGreen = "#93aa97";

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle"
        }
      },
      tooltip: {
        backgroundColor: "#202a26",
        padding: 12,
        titleFont: {
          family: "'Playfair Display', serif",
          size: 15
        },
        bodyFont: {
          family: "'DM Sans', sans-serif"
        }
      }
    },
    scales: {
      x: {
        grid: {display: false},
        border: {display: false}
      },
      y: {
        beginAtZero: true,
        grid: {color: gridColor},
        border: {display: false},
        ticks: {padding: 8}
      }
    }
  };

  const parliamentCanvas = document.getElementById("parliamentChart");
  if (parliamentCanvas) {
    new Chart(parliamentCanvas, {
      type: "line",
      data: {
        labels: ["2015", "2017", "2019", "2021", "2023", "2025"],
        datasets: [{
          label: "Women in parliament (%)",
          data: [22.8, 23.4, 24.3, 25.5, 26.5, 27.2],
          borderColor: green,
          backgroundColor: "rgba(64,92,76,.13)",
          fill: true,
          tension: .35,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: terracotta
        }]
      },
      options: {
        ...commonOptions,
        scales: {
          x: {
            grid: {display: false},
            border: {display: false}
          },
          y: {
            min: 20,
            max: 30,
            grid: {color: gridColor},
            border: {display: false},
            ticks: {
              callback: value => value + "%"
            }
          }
        }
      }
    });
  }

  const managementCanvas = document.getElementById("managementChart");
  if (managementCanvas) {
    new Chart(managementCanvas, {
      type: "bar",
      data: {
        labels: ["2015", "2017", "2019", "2021", "2023"],
        datasets: [{
          label: "Women in management (%)",
          data: [27.7, 28.1, 28.3, 29.2, 30.0],
          backgroundColor: [
            "#93aa97",
            "#77917e",
            "#66836d",
            "#52705b",
            "#405c4c"
          ],
          borderRadius: 7,
          borderSkipped: false,
          barPercentage: .62
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          legend: {display: false}
        },
        scales: {
          x: {
            grid: {display: false},
            border: {display: false}
          },
          y: {
            min: 20,
            max: 35,
            grid: {color: gridColor},
            border: {display: false},
            ticks: {
              callback: value => value + "%"
            }
          }
        }
      }
    });
  }

  const careCanvas = document.getElementById("careChart");
  if (careCanvas) {
    new Chart(careCanvas, {
      type: "doughnut",
      data: {
        labels: ["Women", "Remaining share"],
        datasets: [{
          data: [76, 24],
          backgroundColor: [terracotta, "#ded7c9"],
          borderWidth: 0,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 25,
              usePointStyle: true,
              pointStyle: "circle"
            }
          },
          tooltip: {
            backgroundColor: "#202a26",
            padding: 12,
            callbacks: {
              label: context => context.label + ": " + context.raw + "%"
            }
          }
        }
      }
    });
  }

  const indiaPoliticsCanvas = document.getElementById("indiaPoliticsChart");
  if (indiaPoliticsCanvas) {
    new Chart(indiaPoliticsCanvas, {
      type: "bar",
      data: {
        labels: [
          "1952",
          "1962",
          "1977",
          "1984",
          "1991",
          "2004",
          "2014",
          "2019",
          "2024"
        ],
        datasets: [{
          label: "Women elected to Lok Sabha",
          data: [22, 31, 19, 41, 36, 45, 62, 78, 75],
          backgroundColor: [
            "#ded7c9",
            "#ded7c9",
            "#ded7c9",
            "#ded7c9",
            "#ded7c9",
            "#93aa97",
            "#66836d",
            "#52705b",
            terracotta
          ],
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: .65
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          legend: {display: false}
        },
        scales: {
          x: {
            grid: {display: false},
            border: {display: false}
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: {color: gridColor},
            border: {display: false},
            ticks: {stepSize: 20}
          }
        }
      }
    });
  }
}
