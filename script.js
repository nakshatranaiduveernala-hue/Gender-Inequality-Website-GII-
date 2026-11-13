
document.addEventListener("DOMContentLoaded", () => {

  // MOBILE NAVIGATION
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      mainNav.classList.toggle("open");

      menuToggle.setAttribute(
        "aria-expanded",
        mainNav.classList.contains("open")
      );
    });

    mainNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // SMOOTH SCROLLING
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const targetId = link.getAttribute("href");
      const target = document.querySelector(targetId);

      if (target) {
        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        history.replaceState(null, "", targetId);
      }
    });
  });

  // ACTIVE NAVIGATION LINKS
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll("#mainNav a");

  function updateNavigation() {
    let currentSection = "";

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 160;

      if (window.scrollY >= sectionTop) {
        currentSection = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");

      if (link.getAttribute("href") === "#" + currentSection) {
        link.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", updateNavigation);
  updateNavigation();

  // REVEAL ANIMATIONS
  const cards = document.querySelectorAll(".content-card");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12
    });

    cards.forEach(card => {
      card.classList.add("reveal");
      observer.observe(card);
    });
  } else {
    cards.forEach(card => card.classList.add("visible"));
  }

  // BACK TO TOP SUPPORT
  const backToTop = document.getElementById("backToTop");

  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.style.display =
        window.scrollY > 500 ? "block" : "none";
    });

    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

});
