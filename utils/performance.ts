// Performance optimization utilities for landing page

// Preload critical fonts
export const preloadFonts = () => {
  if (typeof window !== "undefined") {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = "/fonts/inter-var.woff2";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
};

// Lazy load images with intersection observer
export const lazyLoadImages = () => {
  if (typeof window !== "undefined" && "IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove("lazy");
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img);
    });
  }
};

// Optimize animations based on user preferences
export const respectReducedMotion = () => {
  if (typeof window !== "undefined") {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      document.documentElement.style.setProperty(
        "--animation-duration",
        "0.01ms"
      );
      document.documentElement.style.setProperty(
        "--transition-duration",
        "0.01ms"
      );
    }
  }
};

// Critical CSS injection
export const injectCriticalCSS = () => {
  const criticalCSS = `
    .hero-section { 
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
    }
    .loading-spinner {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;

  if (typeof window !== "undefined") {
    const style = document.createElement("style");
    style.textContent = criticalCSS;
    document.head.appendChild(style);
  }
};

// Prefetch important routes
export const prefetchRoutes = () => {
  if (typeof window !== "undefined") {
    const routesToPrefetch = ["/canvas", "/pricing", "/docs"];

    routesToPrefetch.forEach((route) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = route;
      document.head.appendChild(link);
    });
  }
};

// Initialize all performance optimizations
export const initPerformanceOptimizations = () => {
  preloadFonts();
  respectReducedMotion();
  injectCriticalCSS();

  // Delay non-critical optimizations
  setTimeout(() => {
    lazyLoadImages();
    prefetchRoutes();
  }, 100);
};
