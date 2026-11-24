// ==========================================
// MOBILE NAVIGATION
// ==========================================

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {

  menuToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.textContent = open ? "✕" : "☰";
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    });
  });

}


// ==========================================
// IMAGE ERROR HANDLING
// ==========================================

document.querySelectorAll("img").forEach(img => {

  img.addEventListener("error", () => {
    img.dataset.failed = "true";
  });

});


// ==========================================
// CHARTS
// ==========================================

if (typeof Chart !== "undefined") {

  Chart.defaults.font.family = "DM Sans, Arial, sans-serif";
  Chart.defaults.color = "#657783";

  const blue = "#2c6487";
  const navy = "#183e5a";
  const lightBlue = "#9dbdd3";

  function createLineChart(id, labels, values, label, max) {

    const canvas = document.getElementById(id);

    if (!canvas) return;

    new Chart(canvas, {

      type: "line",

      data: {

        labels: labels,

        datasets: [{

          label: label,

          data: values,

          borderColor: blue,

          backgroundColor: "rgba(44,100,135,0.12)",

          fill: true,

          tension: 0.25,

          pointRadius: 4,

          pointHoverRadius: 6,

          pointBackgroundColor: "#ffffff",

          pointBorderColor: blue,

          pointBorderWidth: 2,

          borderWidth: 3

        }]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        interaction: {

          intersect: false,

          mode: "index"

        },

        plugins: {

          legend: {

            position: "bottom",

            labels: {

              boxWidth: 12,

              padding: 15

            }

          }

        },

        scales: {

          y: {

            beginAtZero: true,

            suggestedMax: max,

            grid: {

              color: "rgba(100,120,135,0.15)"

            },

            title: {

              display: true,

              text: "Percentage"

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


// GLOBAL PARLIAMENT

  createLineChart(

    "parliamentChart",

    ["2015", "2020", "2025"],

    [22.3, 25.5, 27.2],

    "Women elected (%)",

    40

  );


// WOMEN IN MANAGEMENT

  createLineChart(

    "managementChart",

    ["2015", "2020", "2025"],

    [26.9, 28.2, 30.0],

    "Women in managerial positions (%)",

    40

  );


// UNPAID CARE

  const careCanvas = document.getElementById("careChart");

  if (careCanvas) {

    new Chart(careCanvas, {

      type: "bar",

      data: {

        labels: ["Women", "Men"],

        datasets: [{

          label: "Illustrative relative units",

          data: [2.5, 1],

          backgroundColor: [navy, lightBlue],

          borderRadius: 6,

          maxBarThickness: 130

        }]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {

            display: false

          }

        },

        scales: {

          y: {

            beginAtZero: true,

            title: {

              display: true,

              text: "Illustrative relative units"

            }

          }

        }

      }

    });

  }


// INDIA LOK SABHA HISTORY

  createLineChart(

    "indiaChart",

    [

      "1951",

      "1957",

      "1962",

      "1967",

      "1971",

      "1977",

      "1980",

      "1984",

      "1989",

      "1991",

      "1996",

      "1998",

      "1999",

      "2004",

      "2009",

      "2014",

      "2019",

      "2024"

    ],

    [

      4.4,

      4.5,

      6.3,

      5.9,

      4.9,

      3.5,

      5.9,

      8.1,

      5.5,

      7.0,

      7.4,

      8.1,

      9.0,

      8.3,

      10.9,

      11.4,

      14.4,

      13.6

    ],

    "Women elected (%)",

    20

  );

}


// ==========================================
// SCROLL LINK BEHAVIOUR
// ==========================================

document.querySelectorAll('a[href^="#"]').forEach(link => {

  link.addEventListener("click", function(event) {

    const target = document.querySelector(this.getAttribute("href"));

    if (target) {

      event.preventDefault();

      target.scrollIntoView({

        behavior: "smooth",

        block: "start"

      });

    }

  });

});
