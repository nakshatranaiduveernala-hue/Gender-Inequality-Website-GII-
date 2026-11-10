
// Smooth scrolling for navigation links
document.querySelectorAll('nav a, .main-button').forEach(link => {
  link.addEventListener('click', function(event) {
    const target = document.querySelector(this.getAttribute('href'));

    if (target) {
      event.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Reveal sections as you scroll
const sections = document.querySelectorAll('.content-section');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12
});

sections.forEach(section => {
  section.classList.add('reveal');
  observer.observe(section);
});

// Highlight the current navigation section
const navLinks = document.querySelectorAll('nav a');

window.addEventListener('scroll', () => {
  let current = '';

  document.querySelectorAll('main section[id]').forEach(section => {
    if (window.scrollY >= section.offsetTop - 180) {
      current = section.id;
    }
  });

  navLinks.forEach(link => {
    link.classList.toggle(
      'active',
      link.getAttribute('href') === '#' + current
    );
  });
});
