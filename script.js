/* =========================================
   BEYOND THE DIVIDE
   Navigation + Data Visualisations
========================================= */

// Mobile navigation
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

// =====================================================
// DATA
// =====================================================
// THESE ARE ILLUSTRATIVE VALUES FOR THE DESIGN.
// Replace with verified figures and years before submission.
// Do not present them as actual country statistics.
//
// For your final data, use:
// Adolescent fertility rate: World Bank SP.ADO.TFRT
// Maternal mortality ratio: World Bank SH.STA.MMRT
// Women in parliament: IPU / World Bank SG.GEN.PARL.ZS
// =====================================================

const sampleData = {
  afr: {
    labels: ["Country A", "Country B", "Country C", "Country D", "Country E"],
    values: [18, 32, 47, 65, 95],
    unit: "Births per 1,000 girls aged 15–19"
  },

  mmr: {
    labels: ["Country A", "Country B", "Country C", "Country D", "Country E"],
    values: [22, 55, 95, 180, 290],
    unit: "Deaths per 100,000 live births"
  },

  wip: {
    labels: ["Country A", "Country B", "Country C", "Country D", "Country E"],
    values: [15, 24, 31, 38, 48],
    unit: "Percentage of seats"
  },

  india: {
    afr: {
      labels: ["2010", "2015", "2020", "2025"],
      values: [Illustrative1 = 45, Illustrative2 = 38, Illustrative3 = 28, Illustrative4 = 22]
    },

    mmr: {
      labels: ["2010", "2015", "2020", "2025"],
      values: [Illustrative5 = 210, Illustrative6 = 160, Illustrative7 = 110, Illustrative8 = 80]
    },

    wip: {
      labels: ["2010", "2015", "2020", "2025"],
      values: [Illustrative9 = 10, Illustrative10 = 12, Illustrative11 = 14, Illustrative12 = 17]
    }
  }
};

// =====================================================
// CANVAS CHART UTILITIES
// =====================================================

function prepareCanvas(canvas) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();

  if (rect.width === 0) return null;

  const ratio = window.devicePixelRatio || 1;
  const width = rect.width;
  const height = rect.height;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  return {
    ctx,
    width,
    height
  };
}

function drawGrid(ctx, width, height, padding, maxValue, divisions = 4) {
  ctx.strokeStyle = "#e5ebef";
  ctx.lineWidth = 1;

  for (let i = 0; i <= divisions; i++) {
    const y = padding.top +
      (height - padding.top - padding.bottom) * i / divisions;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
}

function drawBarChart(canvas, labels, values, options = {}) {
  const setup = prepareCanvas(canvas);
  if (!setup) return;

  const { ctx, width, height } = setup;

  const padding = {
    top: 18,
    right: 18,
    bottom: 45,
    left: 38
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = options.maxValue ||
    Math.max(...values) * 1.15;

  drawGrid(ctx, width, height, padding, maxValue);

  const slot = chartWidth / values.length;
  const barWidth = slot * .48;

  values.forEach((value, i) => {
    const barHeight = chartHeight * value / maxValue;
    const x = padding.left + slot * i + (slot - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;

    const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    gradient.addColorStop(0, options.color || "#5489a4");
    gradient.addColorStop(1, options.endColor || "#91b9c9");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 5);
    ctx.fill();

    ctx.fillStyle = "#526577";
    ctx.font = "11px DM Sans";
    ctx.textAlign = "center";

    ctx.fillText(
      labels[i],
      x + barWidth / 2,
      height - 12
    );

    if (options.showValues !== false) {
      ctx.fillStyle = "#263f53";
      ctx.font = "10px DM Sans";
      ctx.fillText(
        String(value),
        x + barWidth / 2,
        Math.max(12, y - 8)
      );
    }
  });
}

// Horizontal bar graph
function drawHorizontalBarChart(canvas, labels, values, options = {}) {
  const setup = prepareCanvas(canvas);
  if (!setup) return;

  const { ctx, width, height } = setup;

  const padding = {
    top: 20,
    right: 45,
    bottom: 20,
    left: 100
  };

  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  const maxValue = options.maxValue ||
    Math.max(...values) * 1.15;

  const slot = chartHeight / values.length;
  const barHeight = slot * .52;

  ctx.font = "11px DM Sans";
  ctx.textAlign = "right";

  values.forEach((value, i) => {
    const y = padding.top + slot * i + (slot - barHeight) / 2;
    const barWidth = chartWidth * value / maxValue;

    ctx.fillStyle = "#586d83";
    ctx.fillText(
      labels[i],
      padding.left - 10,
      y + barHeight / 2 + 4
    );

    const gradient = ctx.createLinearGradient(
      padding.left, 0, padding.left + barWidth, 0
    );

    gradient.addColorStop(0, options.color || "#5d91a5");
    gradient.addColorStop(1, options.endColor || "#a1c5cf");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(
      padding.left,
      y,
      barWidth,
      barHeight,
      5
    );
    ctx.fill();

    ctx.fillStyle = "#263f53";
    ctx.textAlign = "left";
    ctx.fillText(
      String(value),
      padding.left + barWidth + 8,
      y + barHeight / 2 + 4
    );
  });
}

// Line chart
function drawLineChart(canvas, labels, values, options = {}) {
  const setup = prepareCanvas(canvas);
  if (!setup) return;

  const { ctx, width, height } = setup;

  const padding = {
    top: 25,
    right: 25,
    bottom: 40,
    left: 40
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = options.maxValue ||
    Math.max(...values) * 1.15;

  drawGrid(ctx, width, height, padding, maxValue);

  const points = values.map((value, i) => ({
    x: padding.left + chartWidth * i / (values.length - 1 || 1),
    y: padding.top + chartHeight -
      chartHeight * value / maxValue
  }));

  // Fill area beneath line
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartHeight);

  points.forEach(point => {
    ctx.lineTo(point.x, point.y);
  });

  ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
  ctx.closePath();

  ctx.fillStyle = options.fill || "rgba(93,145,165,.12)";
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  points.forEach(point => {
    ctx.lineTo(point.x, point.y);
  });

  ctx.strokeStyle = options.color || "#5d91a5";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // Points and labels
  points.forEach((point, i) => {
    ctx.fillStyle = options.color || "#5d91a5";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#526577";
    ctx.font = "11px DM Sans";
    ctx.textAlign = "center";
    ctx.fillText(
      labels[i],
      point.x,
      height - 10
    );

    ctx.fillStyle = "#263f53";
    ctx.font = "10px DM Sans";
    ctx.fillText(
      String(values[i]),
      point.x,
      point.y - 12
    );
  });
}

// =====================================================
// GRAPH RENDERING
// =====================================================

function renderGraphs() {
  // Trends page — sample country comparison graphs

  drawHorizontalBarChart(
    document.getElementById("trendAFR"),
    sampleData.afr.labels,
    sampleData.afr.values,
    {
      color: "#5e91a5",
      endColor: "#b1d0d8"
    }
  );

  drawBarChart(
    document.getElementById("trendMMR"),
    sampleData.mmr.labels,
    sampleData.mmr.values,
    {
      color: "#d78e79",
      endColor: "#e9c1b3"
    }
  );

  drawLineChart(
    document.getElementById("trendWIP"),
    sampleData.wip.labels,
    sampleData.wip.values,
    {
      color: "#6479b3",
      fill: "rgba(100,121,179,.12)"
    }
  );

  // India — illustrative timelines

  drawLineChart(
    document.getElementById("indiaAFR"),
    sampleData.india.afr.labels,
    sampleData.india.afr.values,
    {
      color: "#5489a4",
      fill: "rgba(84,137,164,.12)"
    }
  );

  drawLineChart(
    document.getElementById("indiaMMR"),
    sampleData.india.mmr.labels,
    sampleData.india.mmr.values,
    {
      color: "#d78e79",
      fill: "rgba(215,142,121,.12)"
    }
  );

  drawBarChart(
    document.getElementById("indiaWIP"),
    sampleData.india.wip.labels,
    sampleData.india.wip.values,
    {
      color: "#6479b3",
      endColor: "#a6b5da"
    }
  );
}

// =====================================================
// RESIZE
// =====================================================

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    renderGraphs();
  }, 200);
});

// Initial rendering
renderGraphs();
