const CART_KEY = 'bw_artist_cart_v1';
const FAVORITES_KEY = 'bw_artist_favorites_v1';
const CUSTOM_PRODUCTS_KEY = 'bw_artist_custom_products_v1';
const DELETED_PUBLISHED_KEY = 'bw_artist_deleted_published_v1';
const PUBLISHED_DATES_KEY = 'bw_artist_published_dates_v1';
const SALES_KEY = 'bw_artist_sales_v1';
const THEME_KEY = 'bw_artist_theme_v1';
const MANAGE_SESSION_KEY = 'bw_artist_manage_access_v1';
const MANAGE_ACCESS_CODE_KEY = 'bw_artist_manage_access_code_v1';
const MANAGE_DEFAULT_ACCESS_CODE = 'atelier2026';
const MANAGE_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;
const A11Y_PREFS_KEY = 'bw_artist_a11y_prefs_v1';
const HOME_LAYOUT_KEY = 'bw_artist_home_layout_v1';
const HOME_SECTION_SIZES_KEY = 'bw_artist_home_section_sizes_v1';
const HOME_BANNER_KEY = 'bw_artist_home_banner_v1';
const REVIEWS_KEY = 'bw_artist_reviews_v1';
const SOCIAL_LINKS_KEY = 'bw_artist_social_links_v1';

function normalizeImagePath(value) {
  const src = String(value || '').trim();
  if (!src) return '';
  if (src.includes('fakepath')) return '';
  if (/^[a-zA-Z]:\\/.test(src)) return '';
  if (src.startsWith('data:image')) return src;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) return src;
  if (src.startsWith('../jpg/')) return src.replace('../jpg/', 'jpg/');
  if (src.startsWith('./jpg/')) return src.slice(2);
  if (src.startsWith('/jpg/')) return `jpg/${src.slice(5)}`;
  return src;
}

function imageSrcOrFallback(value) {
  const src = normalizeImagePath(value);
  return src || 'jpg/gedicht.jpeg';
}

function normalizeStoredListImages(key) {
  const value = loadData(key);
  if (!Array.isArray(value)) return;

  let changed = false;
  const normalized = value.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const normalizedImage = normalizeImagePath(item.image);
    if (normalizedImage === (item.image || '')) return item;
    changed = true;
    return { ...item, image: normalizedImage };
  });

  if (changed) saveData(key, normalized);
}

function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function hasStoredValue(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Storage save failed:', error);
    announce('Opslaan mislukt: browser-opslag is vol. Gebruik een kleinere foto.');
    return false;
  }
}

const DEFAULT_SOCIAL_LINKS = [
  { id: 'instagram', label: 'Instagram', icon: 'bi-instagram', url: 'https://instagram.com' },
  { id: 'facebook', label: 'Facebook', icon: 'bi-facebook', url: 'https://facebook.com' },
  { id: 'youtube', label: 'YouTube', icon: 'bi-youtube', url: 'https://youtube.com' },
  { id: 'tiktok', label: 'TikTok', icon: 'bi-tiktok', url: 'https://tiktok.com' },
  { id: 'x', label: 'X', icon: 'bi-twitter-x', url: 'https://x.com' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin', url: 'https://linkedin.com' }
];

function normalizeSocialUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(candidate).toString();
  } catch (error) {
    return '';
  }
}

function normalizeSocialIcon(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'bi-globe2';
  const icon = raw.startsWith('bi-') ? raw : `bi-${raw}`;
  return /^bi-[a-z0-9-]+$/.test(icon) ? icon : 'bi-globe2';
}

function normalizeSocialId(value, fallback = 'social') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function normalizeSocialItem(item, index = 0) {
  const label = String(item?.label || item?.name || '').trim() || `Social ${index + 1}`;
  const id = normalizeSocialId(item?.id || label, `social-${index + 1}`);
  return {
    id,
    label,
    icon: normalizeSocialIcon(item?.icon),
    url: normalizeSocialUrl(item?.url || item?.href || '')
  };
}

function normalizeSocialLinks(value, options = {}) {
  const allowEmpty = Boolean(options?.allowEmpty);
  let sourceList = [];

  if (Array.isArray(value)) {
    sourceList = value;
  } else if (value && typeof value === 'object') {
    // Backward compatibility with old object format: { instagram: "...", ... }
    sourceList = Object.entries(value).map(([key, url]) => {
      const defaultItem = DEFAULT_SOCIAL_LINKS.find((item) => item.id === key);
      return {
        id: key,
        label: defaultItem?.label || key,
        icon: defaultItem?.icon || 'bi-globe2',
        url
      };
    });
  }

  if (!sourceList.length && !allowEmpty) {
    sourceList = DEFAULT_SOCIAL_LINKS;
  }

  const seen = new Set();
  const normalized = sourceList
    .map((item, index) => normalizeSocialItem(item, index))
    .map((item, index) => {
      let nextId = item.id;
      let i = 2;
      while (seen.has(nextId)) {
        nextId = `${item.id}-${i}`;
        i += 1;
      }
      seen.add(nextId);
      return { ...item, id: nextId };
    })
    .filter((item) => item.label);

  if (normalized.length) return normalized;
  if (allowEmpty) return [];
  return DEFAULT_SOCIAL_LINKS.map((item, index) => normalizeSocialItem(item, index));
}

function getSocialLinks() {
  const hasStored = hasStoredValue(SOCIAL_LINKS_KEY);
  return normalizeSocialLinks(loadData(SOCIAL_LINKS_KEY), { allowEmpty: hasStored });
}

function saveSocialLinks(links) {
  return saveData(SOCIAL_LINKS_KEY, normalizeSocialLinks(links, { allowEmpty: true }));
}

function injectSocialTopbar() {
  const nav = document.querySelector('.navbar');
  if (!nav || nav.querySelector('#socialTopbar')) return;

  const bar = document.createElement('div');
  bar.id = 'socialTopbar';
  bar.className = 'social-topbar';
  bar.innerHTML = '<div class="social-topbar-inner" aria-label="Social media links"></div>';
  nav.insertBefore(bar, nav.firstChild);
}

function renderSocialTopbarLinks() {
  injectSocialTopbar();
  const bar = document.getElementById('socialTopbar');
  const inner = bar?.querySelector('.social-topbar-inner');
  if (!bar || !inner) return;

  const links = getSocialLinks().filter((item) => item.url);
  if (!links.length) {
    bar.classList.add('d-none');
    inner.innerHTML = '';
    return;
  }

  bar.classList.remove('d-none');
  inner.innerHTML = links.map((item) => `
    <a class="social-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.label)}">
      <i class="bi ${escapeHtml(item.icon)}" aria-hidden="true"></i>
    </a>
  `).join('');
}

function safeRun(label, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`${label} mislukt:`, error);
  }
}

let liveRegion = null;

function ensureLiveRegion() {
  if (liveRegion) return liveRegion;
  const region = document.createElement('div');
  region.id = 'a11yLiveRegion';
  region.className = 'visually-hidden';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  document.body.appendChild(region);
  liveRegion = region;
  return liveRegion;
}

function announce(message) {
  const region = ensureLiveRegion();
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 20);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getCart() {
  const value = loadData(CART_KEY);
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => ({ ...item, image: normalizeImagePath(item?.image) }));
}

function getFavorites() {
  const value = loadData(FAVORITES_KEY);
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => ({ ...item, image: normalizeImagePath(item?.image) }));
}

function getCustomProducts() {
  const value = loadData(CUSTOM_PRODUCTS_KEY);
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => ({ ...item, image: normalizeImagePath(item?.image) }));
}

function getSales() {
  const value = loadData(SALES_KEY);
  return Array.isArray(value) ? value : [];
}

function getDeletedPublishedProductIds() {
  const value = loadData(DELETED_PUBLISHED_KEY);
  return Array.isArray(value) ? value : [];
}

function saveDeletedPublishedProductIds(ids) {
  saveData(DELETED_PUBLISHED_KEY, ids);
}

function getPublishedDatesMap() {
  const value = loadData(PUBLISHED_DATES_KEY);
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return value;
}

function savePublishedDatesMap(map) {
  saveData(PUBLISHED_DATES_KEY, map);
}

function formatPublishedDate(value) {
  if (!value) return 'Onbekend';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Onbekend';
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getPublishedCatalog() {
  return [
    { id: 'guitar-noir-echo', type: 'Guitar', title: 'Noir Echo', image: 'jpg/tekening2.jpg' },
    { id: 'guitar-inkline', type: 'Guitar', title: 'Inkline', image: 'jpg/tekening4.jpg' },
    { id: 'guitar-shadow-cedar', type: 'Guitar', title: 'Shadow Cedar', image: 'jpg/tekening5.jpg' },
    { id: 'sculpture-stone-current', type: 'Sculpture', title: 'Stone Current', image: 'jpg/tekening1.jpg' },
    { id: 'sculpture-quiet-arch', type: 'Sculpture', title: 'Quiet Arch', image: 'jpg/tekening3.jpg' },
    { id: 'sculpture-black-orbit', type: 'Sculpture', title: 'Black Orbit', image: 'jpg/tekening5.jpg' },
    { id: 'drawing-1', type: 'Drawing', title: 'Tekening I', image: 'jpg/tekening1.jpg' },
    { id: 'drawing-2', type: 'Drawing', title: 'Tekening II', image: 'jpg/tekening2.jpg' },
    { id: 'drawing-3', type: 'Drawing', title: 'Tekening III', image: 'jpg/tekening3.jpg' },
    { id: 'drawing-4', type: 'Drawing', title: 'Tekening IV', image: 'jpg/tekening4.jpg' },
    { id: 'drawing-5', type: 'Drawing', title: 'Tekening V', image: 'jpg/tekening5.jpg' },
    { id: 'poem-quiet-strings', type: 'Poem', title: 'Stille Snaren', image: 'jpg/gedicht.jpeg' },
    { id: 'poem-graphite-moon', type: 'Poem', title: 'Grafietmaan', image: 'jpg/gedicht.jpeg' },
    { id: 'poem-monochrome-prayer', type: 'Poem', title: 'Monochroom Gebed', image: 'jpg/gedicht.jpeg' }
  ];
}

function getHomepageDefaultLayout() {
  return {
    guitar: ['guitar-noir-echo', 'guitar-inkline', 'guitar-shadow-cedar', 'guitar-custom-list'],
    sculpture: ['sculpture-stone-current', 'sculpture-quiet-arch', 'sculpture-black-orbit'],
    poem: ['poem-quiet-strings', 'poem-graphite-moon', 'poem-monochrome-prayer'],
    drawing: ['drawing-1', 'drawing-2', 'drawing-3', 'drawing-4', 'drawing-5']
  };
}

function getHomepageLayout() {
  const defaults = getHomepageDefaultLayout();
  const value = loadData(HOME_LAYOUT_KEY);
  if (!value || Array.isArray(value) || typeof value !== 'object') return defaults;
  return {
    guitar: Array.isArray(value.guitar) ? value.guitar : defaults.guitar,
    sculpture: Array.isArray(value.sculpture) ? value.sculpture : defaults.sculpture,
    poem: Array.isArray(value.poem) ? value.poem : defaults.poem,
    drawing: Array.isArray(value.drawing) ? value.drawing : defaults.drawing
  };
}

function saveHomepageLayout(layout) {
  saveData(HOME_LAYOUT_KEY, layout);
}

function getHomepageDefaultSectionSizes() {
  return {
    guitar: 4,
    sculpture: 3,
    poem: 3,
    drawing: 5
  };
}

function getHomepageSectionSizes() {
  const defaults = getHomepageDefaultSectionSizes();
  const value = loadData(HOME_SECTION_SIZES_KEY);
  if (!value || Array.isArray(value) || typeof value !== 'object') return defaults;
  return {
    guitar: Number.isFinite(Number(value.guitar)) ? Math.max(1, Number(value.guitar)) : defaults.guitar,
    sculpture: Number.isFinite(Number(value.sculpture)) ? Math.max(1, Number(value.sculpture)) : defaults.sculpture,
    poem: Number.isFinite(Number(value.poem)) ? Math.max(1, Number(value.poem)) : defaults.poem,
    drawing: Number.isFinite(Number(value.drawing)) ? Math.max(1, Number(value.drawing)) : defaults.drawing
  };
}

function saveHomepageSectionSizes(sizes) {
  saveData(HOME_SECTION_SIZES_KEY, sizes);
}

function getHomepageBannerDefaults() {
  return {
    image: 'jpg/hero-banner.jpg',
    title: 'Tineke Kempenaar',
    subtitle: 'Maker in Lijn, Hout, Steen en Woord',
    primaryText: 'Start met gitaren',
    primaryLink: 'guitars.html',
    secondaryText: 'Bekijk favorieten',
    secondaryLink: 'favorites.html'
  };
}

function normalizeHomepageBanner(value) {
  const defaults = getHomepageBannerDefaults();
  if (!value || Array.isArray(value) || typeof value !== 'object') return defaults;
  return {
    image: normalizeImagePath(value.image) || defaults.image,
    title: String(value.title || defaults.title).trim() || defaults.title,
    subtitle: String(value.subtitle || defaults.subtitle).trim() || defaults.subtitle,
    primaryText: String(value.primaryText || defaults.primaryText).trim() || defaults.primaryText,
    primaryLink: String(value.primaryLink || defaults.primaryLink).trim() || defaults.primaryLink,
    secondaryText: String(value.secondaryText || defaults.secondaryText).trim() || defaults.secondaryText,
    secondaryLink: String(value.secondaryLink || defaults.secondaryLink).trim() || defaults.secondaryLink
  };
}

function getHomepageBanner() {
  return normalizeHomepageBanner(loadData(HOME_BANNER_KEY));
}

function saveHomepageBanner(banner) {
  return saveData(HOME_BANNER_KEY, normalizeHomepageBanner(banner));
}

function getHomepageSourceItemsByType(type) {
  const normalized = String(type || '').toLowerCase();
  const deletedIds = new Set(getDeletedPublishedProductIds());
  const published = getPublishedCatalog()
    .filter((item) => !deletedIds.has(item.id))
    .map((item) => ({ ...item, link: `${getProductLinkByType(item.type)}#${item.id}` }));
  const custom = getCustomProducts()
    .filter((item) => String(item.type || '').toLowerCase() === normalized)
    .map((item) => ({ ...item, link: `${getProductLinkByType(item.type)}#${item.id}` }));
  const helperItems = normalized === 'guitar'
    ? [{
      id: 'guitar-custom-list',
      type: 'Guitar',
      title: 'Aangepaste gitaren',
      image: 'jpg/tekening1.jpg',
      link: 'guitars.html#customGuitarList'
    }]
    : [];
  const all = [...published, ...custom, ...helperItems];
  return all.filter((item) => String(item.type || '').toLowerCase() === normalized);
}

function isValidManageAccessCode(code) {
  const normalized = String(code || '').trim();
  if (!normalized) return false;
  const savedCode = getManageAccessCode();
  return normalized === savedCode || normalized === MANAGE_DEFAULT_ACCESS_CODE;
}

function renderHomeFeaturedSection(type, containerId, maxItems, emptyText) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const sourceItems = getHomepageSourceItemsByType(type);
  const sourceMap = new Map(sourceItems.map((item) => [item.id, item]));
  const layout = getHomepageLayout();
  const configuredIds = (layout[type] || []).filter((id, index, arr) => arr.indexOf(id) === index);

  const selected = configuredIds
    .map((id) => sourceMap.get(id))
    .filter(Boolean);

  const fill = sourceItems.filter((item) => !configuredIds.includes(item.id));
  const items = [...selected, ...fill].slice(0, maxItems);

  if (!items.length) {
    container.innerHTML = `<div class="col-12"><p class="text-muted mb-0">${emptyText}</p></div>`;
    return;
  }

  const useFullWidthGrid = container.classList.contains('home-featured-grid--full');
  const wrapperClass = useFullWidthGrid ? 'home-featured-col' : 'col';

  container.innerHTML = items.map((item) => `
    <div class="${wrapperClass}">
      <a class="home-product-link" href="${item.link}">
        <article class="bw-card p-3 h-100">
          <img loading="lazy" decoding="async" src="${item.image || 'jpg/gedicht.jpeg'}" class="bw-thumb mb-3" alt="${item.title}" />
          <h3 class="h6 mb-1">${item.title}</h3>
          <p class="text-secondary mb-0">Bekijk product</p>
        </article>
      </a>
    </div>
  `).join('');
}

function renderHomepageBanner() {
  const hero = document.querySelector('.hero.hero-fullscreen');
  const title = document.getElementById('homeHeroTitle');
  const subtitle = document.getElementById('homeHeroSubtitle');
  const primaryBtn = document.getElementById('homeHeroPrimaryBtn');
  const secondaryBtn = document.getElementById('homeHeroSecondaryBtn');
  if (!hero || !title || !subtitle || !primaryBtn || !secondaryBtn) return;

  const banner = getHomepageBanner();
  const heroImage = imageSrcOrFallback(banner.image);
  hero.style.backgroundImage = `url("${heroImage.replaceAll('"', '\\"')}")`;
  title.textContent = banner.title;
  subtitle.textContent = banner.subtitle;
  primaryBtn.textContent = banner.primaryText;
  primaryBtn.setAttribute('href', banner.primaryLink);
  secondaryBtn.textContent = banner.secondaryText;
  secondaryBtn.setAttribute('href', banner.secondaryLink);
}

function renderHomepageFeaturedSections() {
  const sizes = getHomepageSectionSizes();
  renderHomeFeaturedSection('guitar', 'homeFeaturedGuitars', sizes.guitar, 'Nog geen gitaren geselecteerd.');
  renderHomeFeaturedSection('sculpture', 'homeFeaturedSculptures', sizes.sculpture, 'Nog geen beelden geselecteerd.');
  renderHomeFeaturedSection('poem', 'homeFeaturedPoems', sizes.poem, 'Nog geen gedichten geselecteerd.');
  renderHomeFeaturedSection('drawing', 'homeFeaturedDrawings', sizes.drawing, 'Nog geen tekeningen geselecteerd.');
}

function ensurePublishedTrackingDates() {
  const map = getPublishedDatesMap();
  const now = new Date().toISOString();
  let changed = false;

  getPublishedCatalog().forEach((item) => {
    if (!map[item.id]) {
      map[item.id] = now;
      changed = true;
    }
  });

  const customProducts = getCustomProducts();
  const normalizedCustomProducts = customProducts.map((item) => {
    if (item.publishedAt) {
      if (!map[item.id]) {
        map[item.id] = item.publishedAt;
        changed = true;
      }
      return item;
    }

    changed = true;
    const publishedAt = now;
    map[item.id] = publishedAt;
    return { ...item, publishedAt };
  });

  if (changed) {
    savePublishedDatesMap(map);
    saveData(CUSTOM_PRODUCTS_KEY, normalizedCustomProducts);
  }
}

function getProductLinkByType(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'guitar') return 'guitars.html';
  if (normalized === 'sculpture') return 'beeldhouwen.html';
  if (normalized === 'drawing') return 'drawings.html';
  if (normalized === 'poem') return 'poems.html';
  return 'favorites.html';
}

function chunkItems(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function formatReviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

function reviewStars(rating) {
  const safe = Math.max(1, Math.min(5, Math.round(Number(rating || 0))));
  return '★'.repeat(safe) + '☆'.repeat(5 - safe);
}

function shouldCollapseReviewText(text) {
  return String(text || '').trim().length > 170;
}

function getDefaultReviews() {
  return [
    { id: 'r1', name: 'Lotte', rating: 5, text: 'Prachtige afwerking en snelle communicatie.', createdAt: '2026-02-28T10:30:00Z' },
    { id: 'r2', name: 'Milan', rating: 5, text: 'De gitaar klinkt warm en ziet er uniek uit.', createdAt: '2026-02-27T14:45:00Z' },
    { id: 'r3', name: 'Sanne', rating: 4, text: 'Heel mooi gedicht op maat gemaakt.', createdAt: '2026-02-26T09:15:00Z' },
    { id: 'r4', name: 'Ruben', rating: 5, text: 'Topservice, aanrader voor kunstliefhebbers.', createdAt: '2026-02-25T16:20:00Z' },
    { id: 'r5', name: 'Eva', rating: 4, text: 'De tekening was precies zoals besproken.', createdAt: '2026-02-24T12:05:00Z' },
    { id: 'r6', name: 'Nora', rating: 5, text: 'Persoonlijk contact en super resultaat.', createdAt: '2026-02-23T11:10:00Z' },
    { id: 'r7', name: 'Daan', rating: 5, text: 'Kwaliteit is echt hoog, ik bestel opnieuw.', createdAt: '2026-02-22T15:40:00Z' },
    { id: 'r8', name: 'Iris', rating: 4, text: 'Mooi verpakt en snel geleverd.', createdAt: '2026-02-21T08:55:00Z' },
    { id: 'r9', name: 'Joris', rating: 5, text: 'Unieke stijl die je nergens anders ziet.', createdAt: '2026-02-20T13:35:00Z' },
    { id: 'r10', name: 'Fenna', rating: 5, text: 'Erg tevreden met de communicatie en kwaliteit.', createdAt: '2026-02-19T17:00:00Z' }
  ];
}

function normalizeReviewList(list) {
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || `review-${Date.now()}-${Math.random()}`),
      name: String(item.name || 'Anoniem'),
      rating: Math.max(1, Math.min(5, Math.round(Number(item.rating || 5)))),
      text: String(item.text || ''),
      createdAt: String(item.createdAt || new Date().toISOString())
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getReviews() {
  const hasStoredReviews = hasStoredValue(REVIEWS_KEY);
  const stored = loadData(REVIEWS_KEY);
  const source = hasStoredReviews
    ? (Array.isArray(stored) ? stored : [])
    : getDefaultReviews();
  const normalized = normalizeReviewList(source);
  saveData(REVIEWS_KEY, normalized);
  return normalized;
}

function addReview(review) {
  const stored = loadData(REVIEWS_KEY);
  const base = Array.isArray(stored) ? stored : [];
  const next = normalizeReviewList([{ ...review }, ...base]);
  saveData(REVIEWS_KEY, next);
}

function deleteReview(reviewId) {
  const id = String(reviewId || '').trim();
  if (!id) return;
  const next = getReviews().filter((item) => String(item.id) !== id);
  saveData(REVIEWS_KEY, normalizeReviewList(next));
}

function setupHomeFavoritesCarousel(carouselId, slidesLength) {
  const carouselEl = document.getElementById(carouselId);
  if (!carouselEl || slidesLength < 2 || typeof bootstrap === 'undefined') return;
  carouselEl.setAttribute('tabindex', '0');
  carouselEl.setAttribute('aria-roledescription', 'carrousel');

  const instance = bootstrap.Carousel.getOrCreateInstance(carouselEl, {
    interval: 5500,
    pause: 'hover',
    ride: false,
    touch: true,
    wrap: true
  });
  instance.cycle();

  carouselEl.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') instance.prev();
    if (event.key === 'ArrowRight') instance.next();
  });
}

function renderHomeFavoritesCarousel() {
  const container = document.getElementById('homeFavoritesCarouselContainer');
  if (!container) return;

  const deletedIds = new Set(getDeletedPublishedProductIds());
  const favorites = getFavorites().filter((item) => !deletedIds.has(item.id)).slice(0, 10);
  if (!favorites.length) {
    container.innerHTML = `
      <div class="metric-box p-4">
        <p class="mb-2">Nog geen favorieten geselecteerd.</p>
        <p class="text-muted mb-3">Voeg favorieten toe op de Gitaar-, Gedichten- of Tekeningenpagina om hier je persoonlijke carousel te zien.</p>
        <a class="btn btn-bw btn-sm" href="guitars.html">Bekijk producten</a>
      </div>
    `;
    return;
  }

  const slides = chunkItems(favorites, 4);
  const carouselId = 'homeFavoritesCarousel';

  container.innerHTML = `
    <div id="${carouselId}" class="carousel slide home-products-carousel" data-bs-ride="false">
      <div class="carousel-inner">
        ${slides.map((slideItems, slideIndex) => `
          <div class="carousel-item ${slideIndex === 0 ? 'active' : ''}">
            <div class="row g-3">
              ${slideItems.map((item) => `
                <div class="col-12 col-md-6 col-lg-3">
                  <a class="home-product-link" href="${getProductLinkByType(item.type)}">
                    <article class="bw-card p-3 home-product-card">
                      <img loading="lazy" decoding="async" src="${item.image || 'jpg/gedicht.jpeg'}" alt="${item.title}" class="bw-thumb mb-3">
                      <p class="mono-title mb-1">${item.type || 'Item'}</p>
                      <h3 class="h6 mb-1">${item.title}</h3>
                      <p class="mb-0 fw-semibold">${item.price > 0 ? euro(item.price) : 'Op aanvraag'}</p>
                    </article>
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="carousel-control-prev ${slides.length < 2 ? 'd-none' : ''}" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Vorige</span>
      </button>
      <button class="carousel-control-next ${slides.length < 2 ? 'd-none' : ''}" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Volgende</span>
      </button>
    </div>
  `;

  setupHomeFavoritesCarousel(carouselId, slides.length);
}

function renderHomeReviewsCarousel() {
  const container = document.getElementById('homeReviewsCarouselContainer');
  const countEl = document.getElementById('homeReviewsCount');
  const averageEl = document.getElementById('homeReviewsAverage');
  if (!container) return;

  const reviews = getReviews();
  const latestReviews = reviews.slice(0, 10);
  if (countEl) countEl.textContent = String(reviews.length);
  if (averageEl) {
    if (!latestReviews.length) {
      averageEl.textContent = 'Gemiddelde score: -';
    } else {
      const average = latestReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / latestReviews.length;
      const rounded = Math.round(average * 10) / 10;
      averageEl.textContent = `Gemiddelde score: ${reviewStars(Math.round(average))} (${rounded.toFixed(1)} / 5)`;
    }
  }
  if (!latestReviews.length) {
    container.innerHTML = `
      <div class="metric-box p-4">
        <p class="mb-0">Nog geen recensies beschikbaar.</p>
      </div>
    `;
    return;
  }

  const slides = chunkItems(latestReviews, 4);
  const carouselId = 'homeReviewsCarousel';

  container.innerHTML = `
    <div id="${carouselId}" class="carousel slide home-products-carousel" data-bs-ride="false">
      <div class="carousel-inner">
        ${slides.map((slideItems, slideIndex) => `
          <div class="carousel-item ${slideIndex === 0 ? 'active' : ''}">
            <div class="row g-3">
              ${slideItems.map((review) => `
                <div class="col-12 col-md-6 col-xl-3">
                  <article class="review-mini-card p-3">
                    <p class="review-mini-stars mb-2" aria-label="Beoordeling ${review.rating} van 5">${reviewStars(review.rating)}</p>
                    <p class="review-mini-text ${shouldCollapseReviewText(review.text) ? 'is-collapsed' : ''} mb-2">${escapeHtml(review.text)}</p>
                    ${shouldCollapseReviewText(review.text)
                      ? '<button type="button" class="review-mini-toggle js-review-toggle" aria-expanded="false">Lees meer</button>'
                      : ''}
                    <p class="review-mini-meta mb-0">${escapeHtml(review.name)} • ${formatReviewDate(review.createdAt)}</p>
                  </article>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="carousel-control-prev ${slides.length < 2 ? 'd-none' : ''}" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Vorige reviews</span>
      </button>
      <button class="carousel-control-next ${slides.length < 2 ? 'd-none' : ''}" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Volgende reviews</span>
      </button>
    </div>
  `;

  setupHomeFavoritesCarousel(carouselId, slides.length);
}

function bindReviewReadMore() {
  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('.js-review-toggle');
    if (!toggle) return;
    const card = toggle.closest('.review-mini-card');
    const text = card?.querySelector('.review-mini-text');
    if (!text) return;

    const isCollapsed = text.classList.contains('is-collapsed');
    if (isCollapsed) {
      text.classList.remove('is-collapsed');
      toggle.textContent = 'Minder';
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      text.classList.add('is-collapsed');
      toggle.textContent = 'Lees meer';
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function bindReviewModal() {
  const modal = document.getElementById('reviewModal');
  const openButton = document.getElementById('openReviewModalBtn');
  const form = document.getElementById('reviewForm');
  const message = document.getElementById('reviewFormMessage');
  const nameInput = document.getElementById('reviewName');
  const ratingInput = document.getElementById('reviewRating');
  const textInput = document.getElementById('reviewText');
  const nameError = document.getElementById('reviewNameError');
  const ratingError = document.getElementById('reviewRatingError');
  const textError = document.getElementById('reviewTextError');
  if (!modal || !openButton || !form || !message || !nameInput || !ratingInput || !textInput || !nameError || !ratingError || !textError) return;

  function setFieldError(input, errorEl, hasError) {
    input.classList.toggle('is-invalid', hasError);
    errorEl.classList.toggle('d-none', !hasError);
  }

  function resetFieldErrors() {
    setFieldError(nameInput, nameError, false);
    setFieldError(ratingInput, ratingError, false);
    setFieldError(textInput, textError, false);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('review-modal-open');
    resetFieldErrors();
    message.classList.add('d-none');
    openButton.focus();
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('review-modal-open');
    nameInput.focus();
  }

  openButton.addEventListener('click', openModal);

  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-review-modal]')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const rating = Number(ratingInput.value || 0);
    const text = textInput.value.trim();
    const nameInvalid = name.length < 2;
    const ratingInvalid = !Number.isFinite(rating) || rating < 1 || rating > 5;
    const textInvalid = text.length < 10;

    setFieldError(nameInput, nameError, nameInvalid);
    setFieldError(ratingInput, ratingError, ratingInvalid);
    setFieldError(textInput, textError, textInvalid);

    if (nameInvalid || ratingInvalid || textInvalid) {
      message.textContent = 'Controleer de velden en probeer opnieuw.';
      message.classList.remove('d-none', 'text-success');
      message.classList.add('text-danger');
      return;
    }

    addReview({
      id: `review-${Date.now()}`,
      name,
      rating: Math.max(1, Math.min(5, rating)),
      text,
      createdAt: new Date().toISOString()
    });

    renderHomeReviewsCarousel();
    message.textContent = 'Bedankt! Je recensie is toegevoegd.';
    message.classList.remove('d-none', 'text-danger');
    message.classList.add('text-success');
    announce('Recensie toegevoegd.');

    form.reset();
    setTimeout(() => {
      message.classList.add('d-none');
      closeModal();
    }, 700);
  });
}

function renderPublishedProductsManager() {
  const container = document.getElementById('publishedProductList');
  if (!container) return;

  const deletedIds = new Set(getDeletedPublishedProductIds());
  const items = getPublishedCatalog();
  const publishedDatumsMap = getPublishedDatesMap();

  container.innerHTML = items.map((item) => `
    <div class="d-flex justify-content-between align-items-center border-bottom py-3 gap-3">
      <div class="d-flex align-items-center gap-3">
        <img src="${imageSrcOrFallback(item.image)}" onerror="this.onerror=null;this.src='jpg/gedicht.jpeg';" alt="${item.title}" class="manage-thumb" />
        <div>
          <p class="mono-title mb-1">${item.type}</p>
          <p class="fw-semibold mb-0">${item.title}</p>
          <p class="text-muted small mb-0">Gepubliceerd: ${formatPublishedDate(publishedDatumsMap[item.id])}</p>
        </div>
      </div>
      ${deletedIds.has(item.id)
        ? `<button class="btn btn-outline-bw btn-sm js-published-restore" data-id="${item.id}">Herstellen</button>`
        : `<button class="btn btn-outline-bw btn-sm js-published-delete" data-id="${item.id}">Verwijderen</button>`}
    </div>
  `).join('');
}

function applyPublishedProductVisibility() {
  const deletedIds = new Set(getDeletedPublishedProductIds());
  const selectors = '[data-add-cart], [data-add-favorite], .js-favorite-add-to-cart';

  document.querySelectorAll(selectors).forEach((button) => {
    const id = button.dataset.id;
    if (!id) return;

    const wrapper = button.closest('.col-sm-6, .col-md-6, .col-lg-4, .col-lg-3, li, article') || button;
    if (deletedIds.has(id)) {
      wrapper.classList.add('d-none');
    } else {
      wrapper.classList.remove('d-none');
    }
  });
}

function updateBadges() {
  const cartCount = getCart().length;
  const favoritesCount = getFavorites().length;

  document.querySelectorAll('.js-cart-count').forEach((el) => {
    el.textContent = cartCount;
    el.classList.toggle('is-has-items', cartCount > 0);
  });

  document.querySelectorAll('.js-favorites-count').forEach((el) => {
    el.textContent = favoritesCount;
  });
}

function readItemFromDataset(button) {
  return {
    id: button.dataset.id,
    type: button.dataset.type,
    title: button.dataset.title,
    price: Number(button.dataset.price || 0),
    image: button.dataset.image || '',
    description: button.dataset.description || ''
  };
}

function addToCart(item) {
  const cart = getCart();
  cart.push(item);
  if (saveData(CART_KEY, cart)) {
    updateBadges();
  }
}

function addToFavorites(item) {
  const favorites = getFavorites();
  const exists = favorites.some((fav) => fav.id === item.id);
  if (!exists) {
    favorites.push(item);
    if (saveData(FAVORITES_KEY, favorites)) {
      updateBadges();
      renderHomeFavoritesCarousel();
    }
  }
}

function addCustomProduct(product) {
  const list = getCustomProducts();
  list.push(product);
  return saveData(CUSTOM_PRODUCTS_KEY, list);
}

function removeCustomProduct(id) {
  const filtered = getCustomProducts().filter((item) => item.id !== id);
  saveData(CUSTOM_PRODUCTS_KEY, filtered);
}

function removeFavorite(id) {
  const favorites = getFavorites().filter((item) => item.id !== id);
  saveData(FAVORITES_KEY, favorites);
  updateBadges();
  renderFavoritesPage();
  renderHomeFavoritesCarousel();
}

function removeCartItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveData(CART_KEY, cart);
  updateBadges();
  renderCartPage();
}

function euro(amount) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function renderProductCards(products) {
  return products.map((item) => `
    <div class="col-md-6 col-lg-4">
      <article id="${item.id}" class="bw-card p-3">
        <img src="${item.image || 'jpg/gedicht.jpeg'}" class="bw-thumb mb-3" alt="${item.title}">
        <h2 class="h5">${item.title}</h2>
        <p class="text-secondary">${item.description || 'Handgemaakt zwart-wit kunstwerk.'}</p>
        <p class="fw-bold">${item.price > 0 ? euro(item.price) : 'Prijs op aanvraag'}</p>
        <div class="d-flex gap-2">
          <button class="btn btn-bw btn-sm" data-add-cart data-id="${item.id}" data-type="${item.type}" data-title="${item.title}" data-price="${item.price}" data-image="${item.image || ''}" data-description="${item.description || ''}">In winkelwagen</button>
          <button class="btn btn-outline-bw btn-sm" data-add-favorite data-id="${item.id}" data-type="${item.type}" data-title="${item.title}" data-price="${item.price}" data-image="${item.image || ''}" data-description="${item.description || ''}">Favoriet</button>
        </div>
      </article>
    </div>
  `).join('');
}

function renderCustomProductsOnShopPages() {
  const custom = getCustomProducts();

  const guitarContainer = document.getElementById('customGuitarList');
  if (guitarContainer) {
    const guitars = custom.filter((item) => item.type.toLowerCase() === 'guitar');
    guitarContainer.innerHTML = guitars.length ? renderProductCards(guitars) : '<p class="text-muted">Nog geen aangepaste gitaren. Voeg er een toe in Beheer.</p>';
  }

  const drawingContainer = document.getElementById('customDrawingList');
  if (drawingContainer) {
    const drawings = custom.filter((item) => item.type.toLowerCase() === 'drawing');
    drawingContainer.innerHTML = drawings.length ? renderProductCards(drawings) : '<p class="text-muted">Nog geen aangepaste tekeningen. Voeg er een toe in Beheer.</p>';
  }

  const poemContainer = document.getElementById('customPoemList');
  if (poemContainer) {
    const poems = custom.filter((item) => item.type.toLowerCase() === 'poem');
    poemContainer.innerHTML = poems.length ? renderProductCards(poems) : '<p class="text-muted">Nog geen aangepaste gedichten. Voeg er een toe in Beheer.</p>';
  }

  const sculptureContainer = document.getElementById('customSculptureList');
  if (sculptureContainer) {
    const sculptures = custom.filter((item) => item.type.toLowerCase() === 'sculpture');
    sculptureContainer.innerHTML = sculptures.length ? renderProductCards(sculptures) : '<p class="text-muted">Nog geen aangepaste beelden. Voeg er een toe in Beheer.</p>';
  }
}

function renderManageProducts() {
  const container = document.getElementById('manageProductList');
  if (!container) return;

  const products = getCustomProducts();
  if (!products.length) {
    container.innerHTML = '<p class="text-muted">Nog geen beheerde producten.</p>';
    return;
  }

  container.innerHTML = products.map((item) => `
    <div class="d-flex justify-content-between align-items-center border-bottom py-3 gap-3">
      <div class="d-flex align-items-center gap-3">
        <img src="${imageSrcOrFallback(item.image)}" onerror="this.onerror=null;this.src='jpg/gedicht.jpeg';" alt="${item.title}" class="manage-thumb" />
        <div>
          <p class="mono-title mb-1">${item.type}</p>
          <p class="fw-semibold mb-1">${item.title}</p>
          <p class="mb-0 text-muted">${item.price > 0 ? euro(item.price) : 'Prijs op aanvraag'}</p>
          <p class="text-muted small mb-0">Gepubliceerd: ${formatPublishedDate(item.publishedAt)}</p>
        </div>
      </div>
      <button class="btn btn-outline-bw btn-sm js-product-delete" data-id="${item.id}">Verwijderen</button>
    </div>
  `).join('');
}

function addSaleFromCart(items) {
  if (!items || !items.length) return;

  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const sale = {
    id: `sale-${Date.now()}`,
    createdAt: new Date().toISOString(),
    total,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      price: Number(item.price || 0),
      quantity: 1
    }))
  };

  const sales = getSales();
  sales.unshift(sale);
  saveData(SALES_KEY, sales);
}

function renderManageSales() {
  const list = document.getElementById('manageSalesList');
  const stats = document.getElementById('manageSalesStats');
  const pie = document.getElementById('manageSalesPie');
  const legend = document.getElementById('manageSalesLegend');
  const productsList = document.getElementById('manageSalesProducts');
  if (!list || !stats || !pie || !legend || !productsList) return;

  const sales = getSales();
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const soldItems = sales.reduce((sum, sale) => sum + sale.items.length, 0);

  stats.innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-md-4"><div class="metric-box p-3"><p class="mono-title mb-1">Bestellingen</p><p class="h5 mb-0">${sales.length}</p></div></div>
      <div class="col-md-4"><div class="metric-box p-3"><p class="mono-title mb-1">Verkochte items</p><p class="h5 mb-0">${soldItems}</p></div></div>
      <div class="col-md-4"><div class="metric-box p-3"><p class="mono-title mb-1">Omzet</p><p class="h5 mb-0">${euro(revenue)}</p></div></div>
    </div>
  `;

  if (!sales.length) {
    pie.style.background = '#efefef';
    legend.innerHTML = '<p class="text-muted mb-0">Nog geen verkoopgegevens.</p>';
    productsList.innerHTML = '<p class="text-muted mb-0">Nog geen verkochte producten.</p>';
    list.innerHTML = '<p class="text-muted mb-0">Nog geen verkoop. Voltooide bestellingen verschijnen hier.</p>';
    return;
  }

  const flatProducts = sales.flatMap((sale) =>
    sale.items.map((item) => ({
      ...item,
      saleDatum: sale.createdAt,
      orderId: sale.id
    }))
  );

  const typeMap = flatProducts.reduce((acc, item) => {
    const type = item.type || 'Overig';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const palette = ['#111111', '#4b4b4b', '#7a7a7a', '#a0a0a0', '#c7c7c7'];
  const typeEntries = Object.entries(typeMap);
  const totalTypeCount = typeEntries.reduce((sum, [, count]) => sum + count, 0);
  let current = 0;
  const slices = typeEntries.map(([type, count], index) => {
    const from = (current / totalTypeCount) * 360;
    current += count;
    const to = (current / totalTypeCount) * 360;
    return {
      type,
      count,
      color: palette[index % palette.length],
      from,
      to
    };
  });

  pie.style.background = `conic-gradient(${slices.map((s) => `${s.color} ${s.from}deg ${s.to}deg`).join(', ')})`;
  legend.innerHTML = slices.map((slice) => `
    <div class="d-flex align-items-center justify-content-between border-bottom py-2">
      <div class="d-flex align-items-center gap-2">
        <span style="display:inline-block;width:12px;height:12px;background:${slice.color};"></span>
        <span>${slice.type}</span>
      </div>
      <span class="text-muted small">${slice.count}</span>
    </div>
  `).join('');

  productsList.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Product</th>
            <th>Type</th>
            <th>Prijs</th>
            <th>Bestelling</th>
          </tr>
        </thead>
        <tbody>
          ${flatProducts.map((item) => `
            <tr>
              <td>${formatPublishedDate(item.saleDatum)}</td>
              <td>${item.title}</td>
              <td>${item.type}</td>
              <td>${euro(item.price || 0)}</td>
              <td class="text-muted small">${item.orderId}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  list.innerHTML = sales.map((sale) => `
    <div class="border-bottom py-3">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <p class="mono-title mb-1">Bestelling ${sale.id}</p>
          <p class="mb-1"><strong>Gepubliceerd:</strong> ${formatPublishedDate(sale.createdAt)}</p>
          <p class="mb-0 text-muted small">${sale.items.map((item) => `${item.title} (${item.type})`).join(', ')}</p>
        </div>
        <p class="fw-semibold mb-0">${euro(sale.total)}</p>
      </div>
    </div>
  `).join('');
}

function renderManageHomeTypeBlock(typeKey, listId, poolId, maxItems) {
  const listContainer = document.getElementById(listId);
  const poolContainer = document.getElementById(poolId);
  if (!listContainer || !poolContainer) return;

  const source = getHomepageSourceItemsByType(typeKey);
  const sourceMap = new Map(source.map((item) => [item.id, item]));
  const layout = getHomepageLayout();
  const selectedIds = (layout[typeKey] || []).filter((id, index, arr) => arr.indexOf(id) === index);
  const selectedItems = selectedIds.map((id) => sourceMap.get(id)).filter(Boolean);

  listContainer.innerHTML = selectedItems.length
    ? selectedItems.map((item, index) => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2 gap-2">
        <div class="d-flex align-items-center gap-2">
          <img src="${imageSrcOrFallback(item.image)}" alt="${item.title}" class="manage-thumb" />
          <span>${item.title}</span>
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-outline-bw btn-sm js-home-up" data-type="${typeKey}" data-id="${item.id}" ${index === 0 ? 'disabled' : ''}>Omhoog</button>
          <button class="btn btn-outline-bw btn-sm js-home-down" data-type="${typeKey}" data-id="${item.id}" ${index === selectedItems.length - 1 ? 'disabled' : ''}>Omlaag</button>
          <button class="btn btn-outline-bw btn-sm js-home-remove" data-type="${typeKey}" data-id="${item.id}">Verwijderen</button>
        </div>
      </div>
    `).join('')
    : '<p class="text-muted mb-2">Nog geen geselecteerde items.</p>';

  const selectable = source.filter((item) => !selectedIds.includes(item.id));
  poolContainer.innerHTML = selectable.length
    ? selectable.map((item) => `
      <button class="btn btn-outline-bw btn-sm me-2 mb-2 js-home-add" data-type="${typeKey}" data-id="${item.id}" ${selectedItems.length >= maxItems ? 'disabled' : ''}>
        + ${item.title}
      </button>
    `).join('')
    : '<p class="text-muted mb-0">Geen extra items beschikbaar.</p>';

  const countIds = {
    guitar: 'manageHomeGuitarCount',
    sculpture: 'manageHomeSculptureCount',
    poem: 'manageHomePoemCount',
    drawing: 'manageHomeDrawingCount'
  };
  const countEl = document.getElementById(countIds[typeKey]);
  if (countEl) {
    countEl.textContent = `${selectedItems.length} zichtbaar`;
  }

  const sectionAddBtn = document.querySelector(`.js-home-section-add[data-type="${typeKey}"]`);
  const sectionRemoveBtn = document.querySelector(`.js-home-section-remove[data-type="${typeKey}"]`);
  if (sectionAddBtn) sectionAddBtn.disabled = selectedItems.length >= source.length;
  if (sectionRemoveBtn) sectionRemoveBtn.disabled = selectedItems.length === 0;
}

function renderManageHomepageOrganizer() {
  if (!document.getElementById('manageHomeGuitarList')) return;
  try {
    const sizes = getHomepageSectionSizes();
    renderManageHomeTypeBlock('guitar', 'manageHomeGuitarList', 'manageHomeGuitarPool', sizes.guitar);
    renderManageHomeTypeBlock('sculpture', 'manageHomeSculptureList', 'manageHomeSculpturePool', sizes.sculpture);
    renderManageHomeTypeBlock('poem', 'manageHomePoemList', 'manageHomePoemPool', sizes.poem);
    renderManageHomeTypeBlock('drawing', 'manageHomeDrawingList', 'manageHomeDrawingPool', sizes.drawing);
  } catch (error) {
    ['manageHomeGuitarList', 'manageHomeSculptureList', 'manageHomePoemList', 'manageHomeDrawingList'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p class="text-danger mb-2">Laden mislukt. Vernieuw de pagina.</p>';
    });
  }
}

function renderManageHomeReviews() {
  const list = document.getElementById('manageHomeReviewList');
  const count = document.getElementById('manageHomeReviewCount');
  if (!list) return;

  const reviews = getReviews();
  if (count) count.textContent = `${reviews.length} recensies`;

  if (!reviews.length) {
    list.innerHTML = '<p class="text-muted mb-0">Nog geen recensies opgeslagen.</p>';
    return;
  }

  list.innerHTML = reviews.map((review) => `
    <div class="d-flex justify-content-between align-items-start border-bottom py-2 gap-3">
      <div style="min-width:0;flex:1 1 auto;">
        <p class="mb-1 fw-semibold">${escapeHtml(review.name)} • ${reviewStars(review.rating)}</p>
        <p class="mb-1" style="overflow-wrap:anywhere;word-break:break-word;hyphens:auto;">${escapeHtml(review.text)}</p>
        <p class="text-muted small mb-0">${formatReviewDate(review.createdAt)}</p>
      </div>
      <button class="btn btn-outline-bw btn-sm js-home-review-delete" data-id="${escapeHtml(review.id)}">Verwijderen</button>
    </div>
  `).join('');
}

function bindManageHomeBannerForm() {
  const form = document.getElementById('manageHomeBannerForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const imageInput = document.getElementById('manageHomeBannerImage');
  const imageFileInput = document.getElementById('manageHomeBannerImageFile');
  const imagePreview = document.getElementById('manageHomeBannerPreview');
  const titleInput = document.getElementById('manageHomeBannerTitle');
  const subtitleInput = document.getElementById('manageHomeBannerSubtitle');
  const primaryTextInput = document.getElementById('manageHomeBannerPrimaryText');
  const primaryLinkInput = document.getElementById('manageHomeBannerPrimaryLink');
  const secondaryTextInput = document.getElementById('manageHomeBannerSecondaryText');
  const secondaryLinkInput = document.getElementById('manageHomeBannerSecondaryLink');
  const resetBtn = document.getElementById('manageHomeBannerResetBtn');
  const message = document.getElementById('manageHomeBannerMessage');
  if (
    !imageInput || !imageFileInput || !imagePreview || !titleInput || !subtitleInput || !primaryTextInput ||
    !primaryLinkInput || !secondaryTextInput || !secondaryLinkInput || !resetBtn || !message
  ) return;

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.remove('d-none', 'text-danger', 'text-success');
    message.classList.add(isError ? 'text-danger' : 'text-success');
  }

  function setPreview(src) {
    const normalized = normalizeImagePath(src);
    if (!normalized) {
      imagePreview.classList.add('d-none');
      imagePreview.removeAttribute('src');
      return;
    }
    imagePreview.src = normalized;
    imagePreview.classList.remove('d-none');
  }

  function fillFormFromBanner() {
    const banner = getHomepageBanner();
    imageInput.value = banner.image;
    titleInput.value = banner.title;
    subtitleInput.value = banner.subtitle;
    primaryTextInput.value = banner.primaryText;
    primaryLinkInput.value = banner.primaryLink;
    secondaryTextInput.value = banner.secondaryText;
    secondaryLinkInput.value = banner.secondaryLink;
    setPreview(banner.image);
  }

  fillFormFromBanner();

  imageInput.addEventListener('input', () => {
    setPreview(imageInput.value);
  });

  imageFileInput.addEventListener('change', () => {
    const file = imageFileInput.files?.[0];
    if (!file) return;

    const lowerName = String(file.name || '').toLowerCase();
    const allowedByMime = String(file.type || '').startsWith('image/');
    const allowedByExt = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tif|tiff|avif|heic|heif)$/i.test(lowerName);
    if (!allowedByMime && !allowedByExt) {
      setMessage('Kies een geldig afbeeldingsbestand.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = String(event.target?.result || '');
      imageInput.value = src;
      setPreview(src);
      setMessage('Afbeelding geladen. Klik op opslaan om te publiceren.', false);
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = normalizeHomepageBanner({
      image: imageInput.value.trim(),
      title: titleInput.value.trim(),
      subtitle: subtitleInput.value.trim(),
      primaryText: primaryTextInput.value.trim(),
      primaryLink: primaryLinkInput.value.trim(),
      secondaryText: secondaryTextInput.value.trim(),
      secondaryLink: secondaryLinkInput.value.trim()
    });

    if (!saveHomepageBanner(next)) {
      setMessage('Opslaan mislukt. Probeer opnieuw.', true);
      return;
    }

    renderHomepageBanner();
    fillFormFromBanner();
    setMessage('Banner opgeslagen.', false);
    announce('Banner bijgewerkt.');
  });

  resetBtn.addEventListener('click', () => {
    if (!saveHomepageBanner(getHomepageBannerDefaults())) {
      setMessage('Herstellen mislukt. Probeer opnieuw.', true);
      return;
    }
    renderHomepageBanner();
    fillFormFromBanner();
    setMessage('Standaard banner hersteld.', false);
  });
}

function bindManageHomeReviewForm() {
  const form = document.getElementById('manageHomeReviewForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const nameInput = document.getElementById('manageHomeReviewName');
  const ratingInput = document.getElementById('manageHomeReviewRating');
  const textInput = document.getElementById('manageHomeReviewText');
  const message = document.getElementById('manageHomeReviewMessage');
  if (!nameInput || !ratingInput || !textInput || !message) return;

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.remove('d-none', 'text-danger', 'text-success');
    message.classList.add(isError ? 'text-danger' : 'text-success');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const rating = Number(ratingInput.value || 0);
    const text = textInput.value.trim();

    if (name.length < 2) {
      setMessage('Naam moet minimaal 2 tekens hebben.', true);
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setMessage('Kies een score van 1 t/m 5.', true);
      return;
    }
    if (text.length < 10) {
      setMessage('Recensie moet minimaal 10 tekens hebben.', true);
      return;
    }

    addReview({
      id: `manage-review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      rating: Math.max(1, Math.min(5, rating)),
      text,
      createdAt: new Date().toISOString()
    });

    form.reset();
    ratingInput.value = '5';
    setMessage('Recensie toegevoegd.', false);
    renderManageHomeReviews();
    renderHomeReviewsCarousel();
    announce('Recensie toegevoegd.');
  });
}

function renderFavoritesPage() {
  const container = document.getElementById('favoritesList');
  if (!container) return;

  const favorites = getFavorites();
  if (!favorites.length) {
    container.innerHTML = `
      <div class="metric-box p-4">
        <p class="mb-2">Nog geen favorieten.</p>
        <p class="text-muted mb-3">Voeg werk toe op de Gitaren-, Beeldhouwen-, Gedichten- of Tekeningenpagina.</p>
        <a class="btn btn-bw btn-sm" href="guitars.html">Ontdek collecties</a>
      </div>
    `;
    return;
  }

  container.innerHTML = favorites.map((item) => `
    <div class="col-md-6 col-lg-4">
      <div class="bw-card p-3">
        <img src="${item.image || 'jpg/gedicht.jpeg'}" alt="${item.title}" class="bw-thumb mb-3" />
        <p class="mono-title mb-1">${item.type}</p>
        <h3 class="h5">${item.title}</h3>
        <p class="text-muted small">${item.description || 'Favoriet werk van de artiest.'}</p>
        ${item.price > 0 ? `<p class="fw-bold mb-3">${euro(item.price)}</p>` : ''}
        <div class="d-flex gap-2">
          <button class="btn btn-bw btn-sm js-favorite-add-to-cart" data-id="${item.id}">In winkelwagen</button>
          <button class="btn btn-outline-bw btn-sm js-favorite-remove" data-id="${item.id}">Verwijderen</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCartPage() {
  const container = document.getElementById('cartList');
  const totalEl = document.getElementById('cartTotal');
  if (!container || !totalEl) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = `
      <div class="metric-box p-4">
        <p class="mb-2">Je winkelwagen is leeg.</p>
        <p class="text-muted mb-3">Kies een product en voeg het toe om af te rekenen.</p>
        <a class="btn btn-bw btn-sm" href="guitars.html">Bekijk producten</a>
      </div>
    `;
    totalEl.textContent = euro(0);
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="d-flex justify-content-between align-items-center border-bottom py-3">
      <div>
        <p class="mono-title mb-1">${item.type}</p>
        <p class="fw-semibold mb-1">${item.title}</p>
        <p class="text-muted mb-0">${item.price > 0 ? euro(item.price) : 'Prijs op aanvraag'}</p>
      </div>
      <button class="btn btn-outline-bw btn-sm js-cart-remove" data-index="${index}">Verwijderen</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);
  totalEl.textContent = euro(total);
}

function bindActionButtons() {
  document.addEventListener('click', (event) => {
    const addCartButton = event.target.closest('button[data-add-cart]');
    if (addCartButton) {
      addToCart(readItemFromDataset(addCartButton));
      announce('Toegevoegd aan winkelwagen');
      return;
    }

    const addFavorietButton = event.target.closest('button[data-add-favorite]');
    if (addFavorietButton) {
      addToFavorites(readItemFromDataset(addFavorietButton));
      announce('Toegevoegd aan favorieten');
      return;
    }

    const removeFavoriteButton = event.target.closest('.js-favorite-remove');
    if (removeFavoriteButton) {
      removeFavorite(removeFavoriteButton.dataset.id);
      return;
    }

    const moveFavorietButton = event.target.closest('.js-favorite-add-to-cart');
    if (moveFavorietButton) {
      const item = getFavorites().find((fav) => fav.id === moveFavorietButton.dataset.id);
      if (item) {
        addToCart(item);
        announce('Toegevoegd aan winkelwagen');
      }
      return;
    }

    const removeCartButton = event.target.closest('.js-cart-remove');
    if (removeCartButton) {
      removeCartItem(Number(removeCartButton.dataset.index));
      return;
    }

    const deleteProductButton = event.target.closest('.js-product-delete');
    if (deleteProductButton) {
      removeCustomProduct(deleteProductButton.dataset.id);
      renderManageProducts();
      renderCustomProductsOnShopPages();
      renderHomepageFeaturedSections();
      renderManageHomepageOrganizer();
      return;
    }

    const deletePublishedButton = event.target.closest('.js-published-delete');
    if (deletePublishedButton) {
      const ids = getDeletedPublishedProductIds();
      if (!ids.includes(deletePublishedButton.dataset.id)) {
        ids.push(deletePublishedButton.dataset.id);
        saveDeletedPublishedProductIds(ids);
      }
      renderPublishedProductsManager();
      applyPublishedProductVisibility();
      renderHomeFavoritesCarousel();
      renderHomepageFeaturedSections();
      renderManageHomepageOrganizer();
      return;
    }

    const restorePublishedButton = event.target.closest('.js-published-restore');
    if (restorePublishedButton) {
      const ids = getDeletedPublishedProductIds().filter((id) => id !== restorePublishedButton.dataset.id);
      saveDeletedPublishedProductIds(ids);
      renderPublishedProductsManager();
      applyPublishedProductVisibility();
      renderHomeFavoritesCarousel();
      renderHomepageFeaturedSections();
      renderManageHomepageOrganizer();
      return;
    }

    const deleteHomeReviewButton = event.target.closest('.js-home-review-delete');
    if (deleteHomeReviewButton) {
      deleteReview(deleteHomeReviewButton.dataset.id);
      renderManageHomeReviews();
      renderHomeReviewsCarousel();
      announce('Recensie verwijderd.');
      return;
    }

    const homeSectionButton = event.target.closest('.js-home-section-add, .js-home-section-remove');
    if (homeSectionButton) {
      const type = homeSectionButton.dataset.type;
      if (!type) return;

      const source = getHomepageSourceItemsByType(type);
      const layout = getHomepageLayout();
      const current = Array.isArray(layout[type]) ? [...layout[type]] : [];
      const sizes = getHomepageSectionSizes();
      const defaults = getHomepageDefaultSectionSizes();
      const currentMax = Number(sizes[type]) || defaults[type] || 1;

      if (homeSectionButton.classList.contains('js-home-section-add')) {
        const nextItem = source.find((item) => !current.includes(item.id));
        if (!nextItem) {
          announce('Geen extra items beschikbaar voor deze sectie.');
          return;
        }
        current.push(nextItem.id);
        sizes[type] = Math.max(currentMax, current.length);
      } else {
        if (!current.length) return;
        current.pop();
        sizes[type] = Math.max(1, current.length);
      }

      layout[type] = current;
      saveHomepageLayout(layout);
      saveHomepageSectionSizes(sizes);
      renderManageHomepageOrganizer();
      renderHomepageFeaturedSections();
      announce('Homepage-sectie bijgewerkt.');
      return;
    }

    const homeActionButton = event.target.closest('.js-home-up, .js-home-down, .js-home-remove, .js-home-add');
    if (homeActionButton) {
      const type = homeActionButton.dataset.type;
      const id = homeActionButton.dataset.id;
      if (!type || !id) return;

      const sizeConfig = getHomepageSectionSizes();
      const defaults = getHomepageDefaultSectionSizes();
      const max = Number(sizeConfig[type]) || defaults[type] || 4;
      const layout = getHomepageLayout();
      const current = Array.isArray(layout[type]) ? [...layout[type]] : [];
      const index = current.indexOf(id);

      if (homeActionButton.classList.contains('js-home-add')) {
        if (index !== -1) return;
        if (current.length >= max) {
          announce(`Maximaal ${max} items toegestaan voor deze rij.`);
          return;
        }
        current.push(id);
      } else if (homeActionButton.classList.contains('js-home-remove')) {
        if (index === -1) return;
        current.splice(index, 1);
      } else if (homeActionButton.classList.contains('js-home-up')) {
        if (index <= 0) return;
        [current[index - 1], current[index]] = [current[index], current[index - 1]];
      } else if (homeActionButton.classList.contains('js-home-down')) {
        if (index === -1 || index >= current.length - 1) return;
        [current[index + 1], current[index]] = [current[index], current[index + 1]];
      }

      layout[type] = current;
      saveHomepageLayout(layout);

      const sectionSizes = getHomepageSectionSizes();
      sectionSizes[type] = Math.max(1, Number(sectionSizes[type]) || 1, current.length);
      saveHomepageSectionSizes(sectionSizes);

      renderManageHomepageOrganizer();
      renderHomepageFeaturedSections();
      announce('Homepage-indeling bijgewerkt.');
    }
  });
}

function bindManageImageUpload() {
  const dropZone = document.getElementById('productImageDropZone');
  const fileInput = document.getElementById('productImageFile');
  const pickBtn = document.getElementById('productImagePickBtn');
  const imageInput = document.getElementById('productImage');
  const preview = document.getElementById('productImagePreview');
  if (!dropZone || !fileInput || !imageInput || !preview) return;

  function setPreview(src) {
    if (!src) {
      preview.classList.add('d-none');
      preview.removeAttribute('src');
      return;
    }
    preview.src = src;
    preview.classList.remove('d-none');
  }

  function readFile(file) {
    if (!file) return;
    const lowerName = String(file.name || '').toLowerCase();
    const allowedByMime = String(file.type || '').startsWith('image/');
    const allowedByExt = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tif|tiff|avif|heic|heif)$/i.test(lowerName);
    if (!allowedByMime && !allowedByExt) return;

    // SVG is usually compact enough; keep original data URL.
    if (lowerName.endsWith('.svg') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = String(event.target?.result || '');
        imageInput.value = src;
        setPreview(src);
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = String(event.target?.result || '');
      const img = new Image();
      img.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to keep localStorage usage manageable.
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        imageInput.value = compressed;
        setPreview(compressed);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  if (pickBtn) {
    pickBtn.addEventListener('click', () => fileInput.click());
  }
  fileInput.addEventListener('change', () => readFile(fileInput.files?.[0]));

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('is-drag-over');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-drag-over');
    const file = event.dataTransfer?.files?.[0];
    readFile(file);
  });

  imageInput.addEventListener('input', () => {
    const value = imageInput.value.trim();
    if (!value) {
      setPreview('');
      return;
    }
    if (
      value.startsWith('http') ||
      value.startsWith('../') ||
      value.startsWith('./') ||
      value.startsWith('/jpg/') ||
      value.startsWith('jpg/') ||
      value.startsWith('data:image')
    ) {
      setPreview(value);
    }
  });
}

function bindManageForm() {
  const form = document.getElementById('manageProductForm');
  if (!form) return;
  const imageInput = document.getElementById('productImage');
  const imageFileInput = document.getElementById('productImageFile');
  const imagePreview = document.getElementById('productImagePreview');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const type = document.getElementById('productType').value;
    const title = document.getElementById('productTitle').value.trim();
    const price = Number(document.getElementById('productPrice').value || 0);
    const image = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDescription').value.trim();

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const ok = addCustomProduct({
      id: `${type.toLowerCase()}-${slug}-${Date.now()}`,
      type,
      title,
      price,
      image,
      description,
      publishedAt: new Date().toISOString()
    });

    if (!ok) return;

    form.reset();
    if (imageFileInput) imageFileInput.value = '';
    if (imagePreview) {
      imagePreview.classList.add('d-none');
      imagePreview.removeAttribute('src');
    }
    if (imageInput) imageInput.dispatchEvent(new Event('input'));
    renderManageProducts();
    renderCustomProductsOnShopPages();
    renderManageHomepageOrganizer();
    renderHomepageFeaturedSections();
    announce('Product toegevoegd');
  });
}

function bindCheckoutForm() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!getCart().length) {
      announce('Je winkelwagen is leeg. Voeg eerst iets toe.');
      return;
    }

    const currentCart = getCart();
    addSaleFromCart(currentCart);
    localStorage.removeItem(CART_KEY);
    updateBadges();
    form.reset();
    const msg = document.getElementById('checkoutMessage');
    msg.classList.remove('d-none');
    renderCartPage();
    renderManageSales();
    announce('Betaling ontvangen. Bedankt voor je bestelling.');
  });
}

let manageSocialDraft = [];

function bindManageSocialForm() {
  const form = document.getElementById('manageSocialForm');
  const message = document.getElementById('manageSocialMessage');
  const list = document.getElementById('manageSocialList');
  const addBtn = document.getElementById('manageSocialAddBtn');
  const newName = document.getElementById('socialNewName');
  const newUrl = document.getElementById('socialNewUrl');
  const newIcon = document.getElementById('socialNewIcon');
  if (!form || !message || !list || !addBtn || !newName || !newUrl || !newIcon) return;

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.remove('d-none', 'text-success', 'text-danger');
    message.classList.add(isError ? 'text-danger' : 'text-success');
  }

  function renderList() {
    if (!manageSocialDraft.length) {
      list.innerHTML = '<p class="text-muted mb-0">Nog geen social media bedrijven toegevoegd.</p>';
      return;
    }

    list.innerHTML = manageSocialDraft.map((item, index) => `
      <div class="row g-2 align-items-end border-bottom py-2">
        <div class="col-md-3">
          <label class="form-label small mb-1">Naam</label>
          <input class="form-control form-control-sm js-social-name" data-index="${index}" value="${escapeHtml(item.label)}" />
        </div>
        <div class="col-md-5">
          <label class="form-label small mb-1">Link</label>
          <input class="form-control form-control-sm js-social-url" data-index="${index}" value="${escapeHtml(item.url)}" />
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1">Icoon</label>
          <input class="form-control form-control-sm js-social-icon" data-index="${index}" value="${escapeHtml(item.icon)}" />
        </div>
        <div class="col-md-2 d-grid">
          <button type="button" class="btn btn-outline-bw btn-sm js-social-remove" data-index="${index}">Verwijderen</button>
        </div>
      </div>
    `).join('');
  }

  function syncFromInputs() {
    const names = Array.from(list.querySelectorAll('.js-social-name'));
    const urls = Array.from(list.querySelectorAll('.js-social-url'));
    const icons = Array.from(list.querySelectorAll('.js-social-icon'));

    manageSocialDraft = manageSocialDraft.map((item, index) => normalizeSocialItem({
      ...item,
      label: names[index]?.value ?? item.label,
      url: urls[index]?.value ?? item.url,
      icon: icons[index]?.value ?? item.icon
    }, index));
  }

  manageSocialDraft = getSocialLinks();
  renderList();

  if (form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  addBtn.addEventListener('click', () => {
    const label = String(newName.value || '').trim();
    const rawUrl = String(newUrl.value || '').trim();
    const icon = String(newIcon.value || '').trim();

    if (!label) {
      setMessage('Vul een naam in voor het social media bedrijf.', true);
      return;
    }

    const url = normalizeSocialUrl(rawUrl);
    if (!url) {
      setMessage('Vul een geldige link in (bijv. https://...).', true);
      return;
    }

    manageSocialDraft.push(normalizeSocialItem({
      id: normalizeSocialId(label),
      label,
      icon,
      url
    }, manageSocialDraft.length));
    renderList();
    newName.value = '';
    newUrl.value = '';
    newIcon.value = '';
    setMessage('Social media bedrijf toegevoegd. Klik op opslaan om te publiceren.', false);
  });

  list.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.js-social-remove');
    if (!removeBtn) return;
    const index = Number(removeBtn.dataset.index);
    if (!Number.isInteger(index) || index < 0) return;
    manageSocialDraft.splice(index, 1);
    renderList();
    setMessage('Social media bedrijf verwijderd. Klik op opslaan om te publiceren.', false);
  });

  list.addEventListener('input', () => {
    syncFromInputs();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncFromInputs();
    const next = normalizeSocialLinks(manageSocialDraft, { allowEmpty: true }).filter((item) => item.label && item.url);

    if (!saveSocialLinks(next)) {
      setMessage('Opslaan mislukt. Probeer het opnieuw.', true);
      return;
    }

    renderSocialTopbarLinks();
    manageSocialDraft = getSocialLinks();
    renderList();
    setMessage('Social media links opgeslagen.', false);
    announce('Social media links bijgewerkt.');
  });
}

function bindContactForm() {
  const form = document.getElementById('contactForm');
  const message = document.getElementById('contactFormMessage');
  if (!form || !message || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) return;
    form.reset();
    message.textContent = 'Bedankt, je bericht is ontvangen. We nemen zo snel mogelijk contact met je op.';
    message.classList.remove('d-none', 'text-danger');
    message.classList.add('text-success');
    announce('Contactbericht verstuurd.');
  });
}

let revealObserver = null;
let mutationObserver = null;
let activeTiltCard = null;
let interactiveRefreshTimer = null;
let productLichtbox = null;
let manageFeaturesInitialized = false;
let manageInactivityTimer = null;
let manageAutoLogoutBound = false;

function initManageFeatures() {
  if (manageFeaturesInitialized) return;
  safeRun('Manage: gepubliceerde producten', () => renderPublishedProductsManager());
  safeRun('Manage: producten', () => renderManageProducts());
  safeRun('Manage: verkoop', () => renderManageSales());
  safeRun('Manage: home organizer', () => renderManageHomepageOrganizer());
  safeRun('Manage: home banner form', () => bindManageHomeBannerForm());
  safeRun('Manage: home reviews', () => renderManageHomeReviews());
  safeRun('Manage: image upload', () => bindManageImageUpload());
  safeRun('Manage: product form', () => bindManageForm());
  safeRun('Manage: security form', () => bindManageSecurityForm());
  safeRun('Manage: QR 2FA', () => bindManageTotpForm());
  safeRun('Manage: social form', () => bindManageSocialForm());
  safeRun('Manage: home review form', () => bindManageHomeReviewForm());
  manageFeaturesInitialized = true;
}

function getManageAccessCode() {
  try {
    const stored = localStorage.getItem(MANAGE_ACCESS_CODE_KEY);
    return stored && stored.trim() ? stored : MANAGE_DEFAULT_ACCESS_CODE;
  } catch (error) {
    return MANAGE_DEFAULT_ACCESS_CODE;
  }
}

function setManageAccessCode(code) {
  const normalized = String(code || '').trim();
  if (!normalized) return false;
  try {
    localStorage.setItem(MANAGE_ACCESS_CODE_KEY, normalized);
    return true;
  } catch (error) {
    return false;
  }
}

function getManage2FAApi() {
  return window.BWManage2FA || null;
}

function enhanceInteractiveElements() {
  const revealTargets = document.querySelectorAll(
    'section, .bw-card, .checkout-panel, .contact-panel, .metric-box, .home-products-carousel, .table-responsive'
  );

  revealTargets.forEach((el) => {
    if (!el.classList.contains('reveal-item')) {
      el.classList.add('reveal-item');
    }
    if (revealObserver && !el.dataset.revealObserved) {
      el.dataset.revealObserved = '1';
      revealObserver.observe(el);
    }
  });

  document.querySelectorAll('.bw-card').forEach((card) => {
    card.classList.add('interactive-card');
  });

  document.querySelectorAll('.bw-card').forEach((card) => {
    const hasProductActions = card.querySelector('[data-add-cart], [data-add-favorite], .js-favorite-add-to-cart');
    if (!hasProductActions) return;
    const image = card.querySelector('.bw-thumb');
    if (image) {
      image.classList.add('product-photo');
    }
  });
}

function bindScrollReveal() {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.14,
    rootMargin: '0px 0px -40px 0px'
  });
}

function resetTilt(card) {
  if (!card) return;
  card.classList.remove('is-tilting');
  card.style.transform = '';
}

function bindCardTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.interactive-card');
    if (!card) {
      if (activeTiltCard) {
        resetTilt(activeTiltCard);
        activeTiltCard = null;
      }
      return;
    }

    if (activeTiltCard && activeTiltCard !== card) {
      resetTilt(activeTiltCard);
    }
    activeTiltCard = card;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = (0.5 - (y / rect.height)) * 8;

    card.classList.add('is-tilting');
    card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`;
  });

  document.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.interactive-card');
    if (!card) return;
    if (card.contains(event.relatedTarget)) return;
    resetTilt(card);
    if (activeTiltCard === card) activeTiltCard = null;
  });
}

function bindButtonPressFeedback() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.btn-bw, .btn-outline-bw');
    if (!button) return;
    button.classList.add('is-pressed');
    setTimeout(() => button.classList.remove('is-pressed'), 160);
  });
}

function ensureProductLichtbox() {
  if (productLichtbox) return productLichtbox;

  const wrapper = document.createElement('div');
  wrapper.className = 'product-lightbox';
  wrapper.innerHTML = `
    <button type="button" class="product-lightbox-close" aria-label="Sluit afbeelding">Sluiten</button>
    <img class="product-lightbox-image" alt="Vergrote productafbeelding" />
    <p class="product-lightbox-caption mb-0"></p>
  `;
  document.body.appendChild(wrapper);
  productLichtbox = wrapper;

  wrapper.addEventListener('click', (event) => {
    if (
      event.target === wrapper ||
      event.target.closest('.product-lightbox-close')
    ) {
      wrapper.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      wrapper.classList.remove('is-open');
    }
  });

  return wrapper;
}

function bindProductPhotoInteractions() {
  document.addEventListener('pointermove', (event) => {
    const image = event.target.closest('.product-photo');
    if (!image) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const rect = image.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    image.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    image.classList.add('is-hover');
  });

  document.addEventListener('pointerout', (event) => {
    const image = event.target.closest('.product-photo');
    if (!image) return;
    if (image.contains(event.relatedTarget)) return;
    image.classList.remove('is-hover');
    image.style.transformOrigin = '50% 50%';
  });

  document.addEventListener('click', (event) => {
    const image = event.target.closest('.product-photo');
    if (!image) return;

    const lightbox = ensureProductLichtbox();
    const lightboxImage = lightbox.querySelector('.product-lightbox-image');
    const lightboxCaption = lightbox.querySelector('.product-lightbox-caption');

    lightboxImage.src = image.currentSrc || image.src;
    const title = image.closest('.bw-card')?.querySelector('h2, h3')?.textContent?.trim();
    lightboxCaption.textContent = title || '';
    lightbox.classList.add('is-open');
  });
}

function bindInteractiveUI() {
  bindScrollReveal();
  bindCardTilt();
  bindButtonPressFeedback();
  bindProductPhotoInteractions();
  enhanceInteractiveElements();

  mutationObserver = new MutationObserver(() => {
    clearTimeout(interactiveRefreshTimer);
    interactiveRefreshTimer = setTimeout(() => {
      enhanceInteractiveElements();
    }, 70);
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // Ignore theme persistence errors.
  }
}

function resolveTheme() {
  const stored = getStoredTheme();
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDonker = theme === 'dark';
  document.body.classList.toggle('theme-dark', isDonker);
  document.querySelectorAll('.js-theme-toggle').forEach((input) => {
    input.checked = isDonker;
    input.setAttribute('aria-label', isDonker ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus');
  });
  document.querySelectorAll('.js-theme-toggle-text').forEach((label) => {
    label.textContent = isDonker ? 'Donker' : 'Licht';
  });
}

function injectThemeToggleButton() {
  const navList = document.querySelector('.navbar .navbar-nav');
  if (!navList) return;
  if (navList.querySelector('.js-theme-toggle')) return;

  const item = document.createElement('li');
  item.className = 'nav-item nav-theme-item';
  item.innerHTML = `
    <label class="theme-switch" title="Schakel donkere modus">
      <input type="checkbox" class="js-theme-toggle" />
      <span class="theme-switch-track"><span class="theme-switch-knob"></span></span>
      <span class="theme-switch-text js-theme-toggle-text">Licht</span>
    </label>
  `;
  const manageItem = navList.querySelector('a[href="manage.html"]')?.closest('li');
  if (manageItem) {
    if (manageItem.classList.contains('nav-utility-start')) {
      manageItem.classList.remove('nav-utility-start');
      item.classList.add('nav-utility-start');
    }
    navList.insertBefore(item, manageItem);
  } else {
    navList.appendChild(item);
  }
}

function bindThemeToggle() {
  injectThemeToggleButton();
  const theme = resolveTheme();
  applyTheme(theme);

  document.addEventListener('change', (event) => {
    const toggle = event.target.closest('.js-theme-toggle');
    if (!toggle) return;
    const next = toggle.checked ? 'dark' : 'light';
    applyTheme(next);
    saveTheme(next);
  });
}

function bindManageLogout() {
  const logoutButton = document.getElementById('manageLogoutBtn');
  if (!logoutButton || logoutButton.dataset.bound === '1') return;
  logoutButton.dataset.bound = '1';
  logoutButton.addEventListener('click', () => {
    if (manageInactivityTimer) {
      clearTimeout(manageInactivityTimer);
      manageInactivityTimer = null;
    }
    sessionStorage.removeItem(MANAGE_SESSION_KEY);
    window.location.reload();
  });
}

function resetManageInactivityTimer() {
  const manageApp = document.getElementById('manageApp');
  if (!manageApp || manageApp.classList.contains('d-none')) return;
  if (manageInactivityTimer) clearTimeout(manageInactivityTimer);
  manageInactivityTimer = window.setTimeout(() => {
    announce('Je bent automatisch uitgelogd na 2 minuten inactiviteit.');
    sessionStorage.removeItem(MANAGE_SESSION_KEY);
    window.location.reload();
  }, MANAGE_INACTIVITY_TIMEOUT_MS);
}

function bindManageAutoLogout() {
  const manageApp = document.getElementById('manageApp');
  if (!manageApp || manageAutoLogoutBound) return;
  manageAutoLogoutBound = true;

  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown', 'click'].forEach((eventName) => {
    document.addEventListener(eventName, resetManageInactivityTimer, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resetManageInactivityTimer();
  });

  window.addEventListener('beforeunload', () => {
    if (manageInactivityTimer) {
      clearTimeout(manageInactivityTimer);
      manageInactivityTimer = null;
    }
  });

  resetManageInactivityTimer();
}

function bindManageSecurityForm() {
  const form = document.getElementById('manageSecurityForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const currentInput = document.getElementById('manageCurrentCode');
  const newInput = document.getElementById('manageNewCode');
  const confirmInput = document.getElementById('manageConfirmCode');
  const message = document.getElementById('manageSecurityMessage');

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.remove('d-none', 'text-danger', 'text-success');
    message.classList.add(isError ? 'text-danger' : 'text-success');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const currentCode = currentInput.value.trim();
    const newCode = newInput.value.trim();
    const confirmCode = confirmInput.value.trim();

    if (!isValidManageAccessCode(currentCode)) {
      setMessage('Huidige code is onjuist.', true);
      return;
    }

    if (!newCode && !confirmCode) {
      setMessage('Vul een nieuwe code in om op te slaan.', true);
      return;
    }
    if (newCode.length < 4) {
      setMessage('Nieuwe code moet minimaal 4 tekens hebben.', true);
      return;
    }
    if (newCode !== confirmCode) {
      setMessage('Nieuwe code en bevestiging komen niet overeen.', true);
      return;
    }
    if (!setManageAccessCode(newCode)) {
      setMessage('Opslaan van code mislukt. Probeer opnieuw.', true);
      return;
    }

    form.reset();
    setMessage('Logincode succesvol bijgewerkt.', false);
  });
}

function bindManageTotpForm() {
  const form = document.getElementById('manageTotpForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const api = getManage2FAApi();
  if (!api) return;

  const accountInput = document.getElementById('manageTotpAccount');
  const generateBtn = document.getElementById('manageTotpGenerateBtn');
  const disableBtn = document.getElementById('manageTotpDisableBtn');
  const setupWrap = document.getElementById('manageTotpSetupWrap');
  const qrImage = document.getElementById('manageTotpQrImage');
  const manualSecretInput = document.getElementById('manageTotpManualSecret');
  const verifyCodeInput = document.getElementById('manageTotpVerifyCode');
  const enableBtn = document.getElementById('manageTotpEnableBtn');
  const status = document.getElementById('manageTotpStatus');
  const message = document.getElementById('manageTotpMessage');
  if (!accountInput || !generateBtn || !disableBtn || !setupWrap || !qrImage || !manualSecretInput || !verifyCodeInput || !enableBtn || !status || !message) return;

  if (!window.crypto || !window.crypto.subtle) {
    status.textContent = 'Status: QR-verificatie niet beschikbaar in deze browser/context (gebruik http://localhost of https://).';
    generateBtn.setAttribute('disabled', 'disabled');
    disableBtn.setAttribute('disabled', 'disabled');
    return;
  }

  let pendingSecret = '';

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.remove('d-none', 'text-success', 'text-danger');
    message.classList.add(isError ? 'text-danger' : 'text-success');
  }

  function renderStatus() {
    status.textContent = api.isEnabled()
      ? 'Status: QR-verificatie is actief.'
      : 'Status: QR-verificatie staat uit.';
  }

  function resetSetupArea() {
    pendingSecret = '';
    setupWrap.classList.add('d-none');
    enableBtn.classList.add('d-none');
    manualSecretInput.value = '';
    verifyCodeInput.value = '';
    qrImage.removeAttribute('src');
  }

  renderStatus();

  generateBtn.addEventListener('click', () => {
    const accountName = String(accountInput.value || '').trim() || 'tineke@beheer';
    pendingSecret = api.generateSecret();
    const otpUrl = api.buildOtpAuthUrl(pendingSecret, accountName);
    qrImage.src = api.buildQrImageUrl(otpUrl);
    manualSecretInput.value = pendingSecret;
    verifyCodeInput.value = '';
    setupWrap.classList.remove('d-none');
    enableBtn.classList.remove('d-none');
    setMessage('QR-code gegenereerd. Scan en vul daarna je 6-cijferige app-code in.', false);
  });

  disableBtn.addEventListener('click', () => {
    if (!api.clearSecret()) {
      setMessage('Uitzetten mislukt. Probeer opnieuw.', true);
      return;
    }
    resetSetupArea();
    renderStatus();
    setMessage('QR-verificatie is uitgezet.', false);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = String(verifyCodeInput.value || '').trim();
    if (!pendingSecret) {
      setMessage('Genereer eerst een nieuwe QR-code.', true);
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setMessage('Vul een geldige 6-cijferige code in.', true);
      return;
    }
    const valid = await api.verifyCodeWithSecret(pendingSecret, code);
    if (!valid) {
      setMessage('Code ongeldig. Controleer je app en probeer opnieuw.', true);
      return;
    }
    if (!api.saveSecret(pendingSecret)) {
      setMessage('Opslaan van QR-verificatie mislukt.', true);
      return;
    }
    resetSetupArea();
    renderStatus();
    setMessage('QR-verificatie is geactiveerd.', false);
    announce('QR-verificatie geactiveerd.');
  });
}

function showManageGate() {
  const manageApp = document.getElementById('manageApp');
  if (!manageApp) return;

  manageApp.classList.add('d-none');
  const twoFaApi = getManage2FAApi();

  const gate = document.createElement('section');
  gate.className = 'container page-shell';
  gate.id = 'manageAccessGate';
  gate.innerHTML = `
    <div class="manage-gate-panel p-4 p-md-5">
      <p class="mono-title">Beveiligde omgeving</p>
      <h1 class="section-title">Beheer login</h1>
      <p class="text-secondary mb-4">Voer je toegangscode in. Als QR-verificatie actief is, vul je daarna de 6-cijferige app-code in.</p>
      <form id="manageAccessForm" class="row g-3">
        <div class="col-12">
          <label for="manageAccessCode" class="form-label">Toegangscode</label>
          <input id="manageAccessCode" class="form-control" type="password" required autocomplete="off" />
        </div>
        <div class="col-12 d-none" id="manageTotpWrap">
          <label for="manageTotpCode" class="form-label">Authenticator code (6 cijfers)</label>
          <input id="manageTotpCode" class="form-control" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" />
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-bw" id="manageAccessSubmitBtn" type="submit">Volgende</button>
        </div>
        <div class="col-12">
          <p id="manageAccessInfo" class="small text-success mb-0 d-none"></p>
          <p id="manageAccessError" class="small text-danger mb-0 d-none"></p>
        </div>
      </form>
    </div>
  `;
  document.body.insertBefore(gate, manageApp);

  const form = gate.querySelector('#manageAccessForm');
  const codeInput = gate.querySelector('#manageAccessCode');
  const totpInput = gate.querySelector('#manageTotpCode');
  const totpWrap = gate.querySelector('#manageTotpWrap');
  const submitBtn = gate.querySelector('#manageAccessSubmitBtn');
  const info = gate.querySelector('#manageAccessInfo');
  const error = gate.querySelector('#manageAccessError');
  codeInput.focus();

  let awaitingTotp = false;

  function setError(text) {
    error.textContent = text;
    error.classList.remove('d-none');
  }

  function clearError() {
    error.textContent = '';
    error.classList.add('d-none');
  }

  function setInfo(text) {
    info.textContent = text;
    info.classList.remove('d-none');
  }

  function completeLogin() {
    sessionStorage.setItem(MANAGE_SESSION_KEY, '1');
    gate.remove();
    manageApp.classList.remove('d-none');
    initManageFeatures();
    bindManageLogout();
    bindManageAutoLogout();
  }

  async function requestTotpStep() {
    clearError();
    info.classList.add('d-none');

    const code = codeInput.value.trim();
    if (!isValidManageAccessCode(code)) {
      setError('Onjuiste code. Probeer opnieuw.');
      return;
    }

    if (code === MANAGE_DEFAULT_ACCESS_CODE && getManageAccessCode() !== MANAGE_DEFAULT_ACCESS_CODE) {
      setManageAccessCode(MANAGE_DEFAULT_ACCESS_CODE);
    }

    if (!twoFaApi) {
      setError('QR-verificatie module ontbreekt. Herlaad de pagina.');
      return;
    }

    if (!twoFaApi.isEnabled()) {
      setInfo('QR-verificatie staat uit. Je wordt ingelogd met alleen toegangscode.');
      completeLogin();
      return;
    }

    awaitingTotp = true;
    totpWrap.classList.remove('d-none');
    submitBtn.textContent = 'Inloggen';
    codeInput.setAttribute('readonly', 'readonly');
    totpInput.value = '';
    totpInput.focus();
    setInfo('Vul nu de 6-cijferige code uit je Authenticator app in.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!awaitingTotp) {
      await requestTotpStep();
      return;
    }

    clearError();
    info.classList.add('d-none');
    const entered = String(totpInput.value || '').trim();

    if (!/^\d{6}$/.test(entered)) {
      setError('Vul een geldige code van 6 cijfers in.');
      return;
    }

    if (!twoFaApi) {
      setError('QR-verificatie module ontbreekt. Herlaad de pagina.');
      return;
    }

    const valid = await twoFaApi.verifyCode(entered);
    if (!valid) {
      setError('Onjuiste of verlopen app-code. Probeer opnieuw.');
      return;
    }

    setInfo('Verificatie geslaagd.');
    completeLogin();
  });
}

function protectManagePage() {
  const manageApp = document.getElementById('manageApp');
  if (!manageApp) return;

  if (sessionStorage.getItem(MANAGE_SESSION_KEY) === '1') {
    initManageFeatures();
    bindManageLogout();
    bindManageAutoLogout();
    return;
  }

  showManageGate();
}

function getA11yPrefs() {
  try {
    const raw = localStorage.getItem(A11Y_PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      largeText: Boolean(parsed?.largeText),
      highContrast: Boolean(parsed?.highContrast)
    };
  } catch (error) {
    return { largeText: false, highContrast: false };
  }
}

function saveA11yPrefs(prefs) {
  try {
    localStorage.setItem(A11Y_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    // Ignore preference save errors.
  }
}

function applyA11yPrefs(prefs) {
  document.body.classList.toggle('a11y-large-text', Boolean(prefs.largeText));
  document.body.classList.toggle('a11y-high-contrast', Boolean(prefs.highContrast));
  document.querySelectorAll('.js-a11y-text').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(Boolean(prefs.largeText)));
  });
  document.querySelectorAll('.js-a11y-contrast').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(Boolean(prefs.highContrast)));
  });
}

function injectSkipLink() {
  if (document.querySelector('.skip-link')) return;
  const main = document.querySelector('main');
  if (!main) return;
  if (!main.id) main.id = 'mainContent';
  const skip = document.createElement('a');
  skip.href = `#${main.id}`;
  skip.className = 'skip-link';
  skip.textContent = 'Ga direct naar de inhoud';
  document.body.insertBefore(skip, document.body.firstChild);
}

function injectA11yWidget() {
  if (document.getElementById('a11yWidget')) return;
  const widget = document.createElement('div');
  widget.id = 'a11yWidget';
  widget.className = 'a11y-widget';
  widget.innerHTML = `
    <p class="a11y-title mb-2">Toegankelijkheid</p>
    <div class="d-flex gap-2 flex-wrap">
      <button type="button" class="btn btn-outline-bw btn-sm js-a11y-text" aria-pressed="false">Grotere tekst</button>
      <button type="button" class="btn btn-outline-bw btn-sm js-a11y-contrast" aria-pressed="false">Hoog contrast</button>
    </div>
  `;
  document.body.appendChild(widget);
}

function bindAccessibilityFeatures() {
  injectSkipLink();
  injectA11yWidget();
  ensureLiveRegion();

  const prefs = getA11yPrefs();
  applyA11yPrefs(prefs);

  document.addEventListener('click', (event) => {
    const textBtn = event.target.closest('.js-a11y-text');
    if (textBtn) {
      const next = { ...getA11yPrefs(), largeText: !document.body.classList.contains('a11y-large-text') };
      applyA11yPrefs(next);
      saveA11yPrefs(next);
      announce(next.largeText ? 'Grotere tekst ingeschakeld.' : 'Grotere tekst uitgeschakeld.');
      return;
    }

    const contrastBtn = event.target.closest('.js-a11y-contrast');
    if (contrastBtn) {
      const next = { ...getA11yPrefs(), highContrast: !document.body.classList.contains('a11y-high-contrast') };
      applyA11yPrefs(next);
      saveA11yPrefs(next);
      announce(next.highContrast ? 'Hoog contrast ingeschakeld.' : 'Hoog contrast uitgeschakeld.');
    }
  });
}

function setActiveNavAriaCurrent() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar .nav-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.endsWith('.html')) return;
    if (href === current) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function enhanceNavigationAccessibility() {
  const nav = document.querySelector('.navbar');
  if (nav) nav.setAttribute('aria-label', 'Hoofdnavigatie');

  document.querySelectorAll('.nav-icon-link').forEach((link) => {
    if (link.querySelector('.visually-hidden')) return;
    const label = link.getAttribute('aria-label') || link.getAttribute('title') || 'Actie';
    const hidden = document.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = ` ${label}`;
    link.appendChild(hidden);
  });
}

function bindScrollTopButton() {
  if (document.querySelector('.scroll-top-btn')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scroll-top-btn';
  button.setAttribute('aria-label', 'Terug naar boven');
  button.textContent = '↑';
  document.body.appendChild(button);

  function updateVisibility() {
    button.classList.toggle('is-visible', window.scrollY > 420);
  }

  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function getAnchorTargetFromHash(hash) {
  if (!hash || hash === '#') return null;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return null;
  return document.getElementById(id);
}

function getFixedNavigationOffset() {
  const nav = document.querySelector('.navbar.fixed-top');
  if (!nav) return 0;
  const rect = nav.getBoundingClientRect();
  const extraGap = 14;
  return Math.ceil(rect.height + extraGap);
}

function scrollToHashWithOffset(hash, behavior = 'smooth') {
  const target = getAnchorTargetFromHash(hash);
  if (!target) return false;
  const offset = getFixedNavigationOffset();
  const top = window.scrollY + target.getBoundingClientRect().top - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

function bindAnchorOffsetNavigation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.matches('[data-bs-toggle], [role="tab"]')) return;
    if (link.closest('.nav-tabs, .nav-pills')) return;

    const hash = link.getAttribute('href') || '';
    if (!hash || hash === '#') return;
    if (!getAnchorTargetFromHash(hash)) return;

    event.preventDefault();
    history.pushState(null, '', hash);
    scrollToHashWithOffset(hash, 'smooth');
  });

  window.addEventListener('hashchange', () => {
    scrollToHashWithOffset(window.location.hash, 'smooth');
  });

  if (window.location.hash) {
    window.setTimeout(() => {
      scrollToHashWithOffset(window.location.hash, 'auto');
    }, 80);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  normalizeStoredListImages(CART_KEY);
  normalizeStoredListImages(FAVORITES_KEY);
  normalizeStoredListImages(CUSTOM_PRODUCTS_KEY);

  document.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.dataset.fallbackApplied === '1') return;
    target.dataset.fallbackApplied = '1';
    target.src = 'jpg/gedicht.jpeg';
  }, true);

  ensurePublishedTrackingDates();
  safeRun('Badges', () => updateBadges());
  safeRun('Homepage banner', () => renderHomepageBanner());
  safeRun('Homepage secties', () => renderHomepageFeaturedSections());
  safeRun('Homepage favorieten', () => renderHomeFavoritesCarousel());
  safeRun('Homepage reviews', () => renderHomeReviewsCarousel());
  safeRun('Custom producten op shop-paginas', () => renderCustomProductsOnShopPages());
  safeRun('Favorietenpagina', () => renderFavoritesPage());
  safeRun('Winkelwagenpagina', () => renderCartPage());
  safeRun('Product zichtbaarheid', () => applyPublishedProductVisibility());
  safeRun('Actieknoppen', () => bindActionButtons());
  safeRun('Checkout form', () => bindCheckoutForm());
  safeRun('Contact form', () => bindContactForm());
  safeRun('Interactie UI', () => bindInteractiveUI());
  safeRun('Thema toggle', () => bindThemeToggle());
  safeRun('Social links', () => renderSocialTopbarLinks());
  safeRun('Anchor navigatie offset', () => bindAnchorOffsetNavigation());
  safeRun('Toegankelijkheid', () => bindAccessibilityFeatures());
  safeRun('Review modal', () => bindReviewModal());
  safeRun('Review lees meer', () => bindReviewReadMore());
  safeRun('Navigatie a11y', () => enhanceNavigationAccessibility());
  safeRun('Actieve nav', () => setActiveNavAriaCurrent());
  safeRun('Naar boven knop', () => bindScrollTopButton());
  safeRun('Manage beveiliging', () => protectManagePage());
});
