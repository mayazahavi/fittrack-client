const testimonialCarousel = document.querySelector('#testimonials');
if (testimonialCarousel) {
  const carousel = new bootstrap.Carousel(testimonialCarousel, {
    interval: 2000,
    ride: 'carousel',
    pause: false,
    wrap: true
  });
} 
