(() => {
  const FAV_KEY = "vpk-favorites";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* —— Избранное —— */
  function readFavs() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeFavs(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
    updateFavCount();
  }

  function updateFavCount() {
    const n = readFavs().length;
    document.querySelectorAll("[data-fav-count]").forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function isFav(id) {
    return readFavs().some((item) => item.id === id);
  }

  function toggleFav(product) {
    const list = readFavs();
    const idx = list.findIndex((item) => item.id === product.id);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(product);
    writeFavs(list);
    return idx < 0;
  }

  function syncFavButtons() {
    document.querySelectorAll("[data-fav-toggle]").forEach((btn) => {
      const card = btn.closest("[data-product-id]");
      if (!card) return;
      const id = card.dataset.productId;
      const active = isFav(id);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-label", active ? "Убрать из избранного" : "В избранное");
      btn.title = active ? "Убрать из избранного" : "В избранное";
    });
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fav-toggle]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest("[data-product-id]");
    if (!card) return;
    const product = {
      id: card.dataset.productId,
      title: card.dataset.title || card.querySelector("h3")?.textContent || "Товар",
      meta: card.dataset.meta || card.querySelector(".slide-info p")?.textContent || "",
      img: card.dataset.img || card.querySelector("img")?.src || "",
    };
    toggleFav(product);
    syncFavButtons();
    renderFavoritesPage();
  });

  function renderFavoritesPage() {
    const listEl = document.querySelector("[data-fav-list]");
    const emptyEl = document.querySelector("[data-fav-empty]");
    if (!listEl) return;

    const favs = readFavs();
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = favs.length > 0;

    favs.forEach((item) => {
      const article = document.createElement("article");
      article.className = "fav-item";
      article.dataset.productId = item.id;
      article.dataset.title = item.title;
      article.dataset.meta = item.meta;
      article.dataset.img = item.img;
      article.innerHTML = `
        <img src="${item.img}" alt="${item.title}" />
        <div>
          <h3>${item.title}</h3>
          <p>${item.meta}</p>
        </div>
        <button type="button" class="fav-btn is-active" data-fav-toggle aria-label="Убрать из избранного" title="Убрать из избранного">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 21.35 10.55 20.03C5.4 15.36 2 12.27 2 8.5A4.5 4.5 0 0 1 6.5 4 5.2 5.2 0 0 1 12 6.09 5.2 5.2 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.77-3.4 6.86-8.55 11.54Z"/></svg>
        </button>
      `;
      listEl.appendChild(article);
    });
  }

  updateFavCount();
  syncFavButtons();
  renderFavoritesPage();

  /* —— Рассылка —— */
  const newsForm = document.querySelector("[data-newsletter]");
  if (newsForm) {
    newsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = document.querySelector("[data-newsletter-note]");
      if (note) note.hidden = false;
      newsForm.reset();
    });
  }

  /* —— Карусель —— */
  document.querySelectorAll("[data-carousel]").forEach(initCarousel);

  function getVisibleCount(root) {
    if (!root.classList.contains("popular-carousel")) return 1;
    const w = root.offsetWidth;
    if (w < 560) return 1;
    if (w < 860) return 2;
    return 3;
  }

  function initCarousel(root) {
    const track = root.querySelector(".carousel-track");
    const allSlides = [...root.querySelectorAll(".slide")];
    const prevBtn = root.querySelector(".carousel-btn.prev");
    const nextBtn = root.querySelector(".carousel-btn.next");
    const dotsWrap = root.querySelector(".carousel-dots");
    const filters = [...(root.closest(".catalog")?.querySelectorAll(".filter") || [])];

    if (!track || !allSlides.length || !prevBtn || !nextBtn || !dotsWrap) return;

    const isCards = root.classList.contains("popular-carousel");
    let index = 0;
    let touchStartX = 0;
    let activeFilter = "all";
    let visibleCount = getVisibleCount(root);

    function visibleSlides() {
      return allSlides.filter((slide) => {
        if (slide.classList.contains("is-hidden")) return false;
        if (activeFilter === "all") return true;
        return slide.dataset.cat === activeFilter;
      });
    }

    function maxIndex() {
      const count = visibleSlides().length;
      return Math.max(0, count - (isCards ? visibleCount : 1));
    }

    function slideStep() {
      return isCards ? 100 / visibleCount : 100;
    }

    function rebuildDots() {
      dotsWrap.innerHTML = "";
      const pages = isCards ? maxIndex() + 1 : visibleSlides().length;
      for (let i = 0; i < pages; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Слайд ${i + 1}`);
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
      }
    }

    function applyFilter(filter) {
      activeFilter = filter;
      allSlides.forEach((slide) => {
        const show = filter === "all" || slide.dataset.cat === filter;
        slide.classList.toggle("is-hidden", !show);
      });
      filters.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.filter === filter));
      rebuildDots();
      goTo(0);
    }

    function goTo(i) {
      const slides = visibleSlides();
      if (!slides.length) return;

      const cap = maxIndex();
      if (i < 0) index = cap;
      else if (i > cap) index = 0;
      else index = i;

      track.style.transform = `translateX(-${index * slideStep()}%)`;

      allSlides.forEach((slide) => slide.classList.remove("is-active"));
      const activeSlide = isCards ? slides[Math.min(index, slides.length - 1)] : slides[index];
      if (activeSlide) activeSlide.classList.add("is-active");

      [...dotsWrap.querySelectorAll("button")].forEach((dot, n) => {
        dot.classList.toggle("is-active", n === index);
      });
    }

    function refreshLayout() {
      visibleCount = getVisibleCount(root);
      root.style.setProperty("--visible", String(visibleCount));
      rebuildDots();
      goTo(Math.min(index, maxIndex()));
    }

    prevBtn.addEventListener("click", () => goTo(index - 1));
    nextBtn.addEventListener("click", () => goTo(index + 1));

    filters.forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter || "all"));
    });

    root.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    root.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(dx) < 40) return;
        goTo(dx < 0 ? index + 1 : index - 1);
      },
      { passive: true }
    );

    window.addEventListener("resize", refreshLayout);

    applyFilter("all");
    if (isCards) refreshLayout();
  }
})();
