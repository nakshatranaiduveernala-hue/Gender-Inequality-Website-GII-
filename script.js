
document.addEventListener("DOMContentLoaded", function () {

  // MOBILE NAVIGATION
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      mainNav.classList.toggle("open");
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
      });
    });
  }

  // NAVIGATION ACTIVE LINK
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll("#mainNav a");

  window.addEventListener("scroll", function () {
    let currentSection = "";

    sections.forEach(function (section) {
      const sectionTop = section.offsetTop - 150;

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
  });

  // ANIMATED CHART BARS
  const chartBars = document.querySelectorAll(".bar-fill");

  const chartObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const finalWidth = bar.getAttribute("data-width");

        if (finalWidth) {
          bar.style.width = finalWidth;
        }

        chartObserver.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });

  chartBars.forEach(function (bar) {
    chartObserver.observe(bar);
  });

  // CLICKABLE WORLD MAP REGIONS
  const regionButtons = document.querySelectorAll(".region-button");
  const regionInfo = document.getElementById("regionInfo");

  const regionDetails = {
    global: {
      title: "Global picture",
      text: "Gender inequality exists in different forms around the world. Access to education, employment, healthcare and leadership can vary depending on location and social conditions."
    },
    asia: {
      title: "Asia",
      text: "Across parts of Asia, women and girls continue to face barriers linked to unequal opportunities, social expectations and access to decision-making."
    },
    africa: {
      title: "Africa",
      text: "In some African countries, girls face challenges such as limited access to education, early marriage and unequal economic opportunities. Experiences differ between communities."
    },
    europe: {
      title: "Europe",
      text: "Many European countries have introduced policies supporting gender equality. However, pay differences, unequal representation and stereotypes remain challenges."
    },
    americas: {
      title: "The Americas",
      text: "Across North, Central and South America, progress has been made in education and political participation, but inequality and discrimination have not disappeared."
    },
    oceania: {
      title: "Oceania",
      text: "Gender equality efforts in Oceania include improving women's leadership, employment opportunities and access to services, including in remote communities."
    }
  };

  regionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const region = button.getAttribute("data-region");
      const details = regionDetails[region];

      if (!details || !regionInfo) return;

      regionButtons.forEach(function (item) {
        item.classList.remove("active");
      });

      button.classList.add("active");

      regionInfo.innerHTML =
        "<h3>" + details.title + "</h3><p>" + details.text + "</p>";
    });
  });

  // SCROLL REVEAL ANIMATIONS
  const revealElements = document.querySelectorAll(
    ".section-heading, .learning-grid article, .issue-grid article, .solution-grid article, .criteria-grid article, .stat-card, .chart-panel, .experience-grid article"
  );

  revealElements.forEach(function (element) {
    element.classList.add("reveal");
  });

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach(function (element) {
    revealObserver.observe(element);
  });

});
