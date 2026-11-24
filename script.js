
/* NAVIGATION */

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


/* MYP TABS */

const mypTabs = document.querySelectorAll(".myp-tab");
const mypPanels = document.querySelectorAll(".myp-panel");

mypTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;

    mypTabs.forEach(t => t.classList.remove("active"));
    mypPanels.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});


/* IMAGE FALLBACK */

document.querySelectorAll("img").forEach(img => {
  img.addEventListener("error", () => {
    if (img.dataset.failed) return;
    img.dataset.failed = "true";

    img.style.display = "none";

    const parent = img.parentElement;
    parent.classList.add("image-fallback");

    if (!parent.querySelector(".fallback-label")) {
      const label = document.createElement("span");
      label.className = "fallback-label";
      label.textContent = "Beyond the Divide";
      parent.appendChild(label);
    }
  });
});


/* CHART SETTINGS */

function makeChart(id, labels, values, title, dark = false) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        borderColor: dark ? "#D6BD8E" : "#355B78",
        backgroundColor: dark ? "rgba(214,189,142,.15)" : "rgba(53,91,120,.12)",
        borderWidth: 3,
        fill: true,
        tension: .35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: dark ? "#D6BD8E" : "#355B78"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        y: {
          min: 0,
          max: 50,
          ticks: {
            callback: value => value + "%",
            color: dark ? "#D0D9E0" : "#647581",
            font: {
              size: 11
            }
          },
          grid: {
            color: dark ? "rgba(255,255,255,.1)" : "rgba(37,60,77,.1)"
          }
        },
        x: {
          ticks: {
            color: dark ? "#D0D9E0" : "#647581",
            font: {
              size: 11
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}


/* GLOBAL PARLIAMENT REPRESENTATION */

makeChart(
  "globalChart",
  ["1995", "2005", "2015", "2024"],
  [11.3, 16.0, 22.1, 26.9],
  "Women in parliament"
);


/* INDIA LOK SABHA REPRESENTATION */

makeChart(
  "indiaChart",
  ["1952", "1984", "2004", "2014", "2019", "2024"],
  [4.4, 8.1, 8.3, 11.4, 14.4, 13.6],
  "Women MPs",
  true
);
