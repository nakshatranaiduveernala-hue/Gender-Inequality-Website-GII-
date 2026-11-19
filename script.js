// MOBILE NAVIGATION
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

mainNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});


// GRAPH DEFAULTS
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = "#68746d";

const gridColor = "rgba(104,116,109,0.15)";


// GRAPH 1 — GLOBAL PARLIAMENT
new Chart(document.getElementById("parliamentChart"), {
  type: "line",
  data: {
    labels: ["2015", "2025"],
    datasets: [{
      label: "Women in national parliaments",
      data: [22.8, 27.2],
      borderColor: "#b86b50",
      backgroundColor: "#b86b50",
      borderWidth: 3,
      pointRadius: 7,
      pointHoverRadius: 9,
      tension: 0.35
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
          label: context => context.parsed.y + "%"
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 40,
        ticks: {
          callback: value => value + "%"
        },
        grid: {
          color: gridColor
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


// GRAPH 2 — GLOBAL MANAGEMENT
new Chart(document.getElementById("managementChart"), {
  type: "line",
  data: {
    labels: ["2015", "2023"],
    datasets: [{
      label: "Women in management",
      data: [27.7, 30.0],
      borderColor: "#526b5b",
      backgroundColor: "#526b5b",
      borderWidth: 3,
      pointRadius: 7,
      pointHoverRadius: 9,
      tension: 0.35
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
          label: context => context.parsed.y + "%"
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 50,
        ticks: {
          callback: value => value + "%"
        },
        grid: {
          color: gridColor
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


// GRAPH 3 — UNPAID CARE SHARE
new Chart(document.getElementById("careChart"), {
  type: "doughnut",
  data: {
    labels: ["Women", "Remaining share"],
    datasets: [{
      data: [76, 24],
      backgroundColor: ["#b86b50", "#dce5db"],
      borderWidth: 0,
      hoverOffset: 8
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
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
        callbacks: {
          label: context =>
            context.label + ": " + context.parsed + "%"
        }
      }
    }
  }
});


// GRAPH 4 — INDIA LOK SABHA
new Chart(document.getElementById("indiaChart"), {
  type: "line",
  data: {
    labels: [
      "1951",
      "1957",
      "1967",
      "1977",
      "1984",
      "1989",
      "1991",
      "1996",
      "2004",
      "2009",
      "2014",
      "2019",
      "2024"
    ],
    datasets: [{
      label: "Women in Lok Sabha",
      data: [
        3.8,
        5.5,
        5.9,
        3.3,
        7.8,
        5.0,
        7.2,
        7.2,
        8.3,
        10.8,
        11.4,
        14.4,
        13.7
      ],
      borderColor: "#b86b50",
      backgroundColor: "#b86b50",
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 7,
      tension: 0.3
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
          label: context => context.parsed.y + "%"
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 20,
        ticks: {
          callback: value => value + "%"
        },
        grid: {
          color: gridColor
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
