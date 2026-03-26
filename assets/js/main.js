(function () {

  // ============================================================================
  // INITIALIZATION & CONFIGURATION
  // ============================================================================

  var cartListenerAttached = false;
  var cartOffcanvasInstance = null;

  const FILES = [
    "assets/js/jquery.min.js",
    "assets/js/bootstrap.bundle.min.js",
    "assets/js/jquery.sticky.js",
    "assets/js/click-scroll.js",
    "assets/js/animated-headline.js",
    "assets/js/modernizr.js",
    "assets/js/custom.js"
  ];

  function loadSequentially(index) {
    if (index >= FILES.length) return;
    var script = document.createElement("script");
    script.src = FILES[index];
    script.async = false;
    script.onload = () => loadSequentially(index + 1);
    document.body.appendChild(script);
  }

  loadSequentially(0);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  function toCurrency(value) {
    return new Intl.NumberFormat("sr-RS", {
      style: "currency",
      currency: "RSD",
      maximumFractionDigits: 0
    }).format(value);
  }

  function slugify(value) {
    return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // ============================================================================
  // PRODUCT CARD RENDERING
  // ============================================================================

  function buildCard(product) {
    var volume = product.details?.volume || "";
    var description = product.details?.description || "";
    var productId = product.id || slugify(product.name);
    var imgSrc = product.image || "assets/images/back.jpg";

    return `
      <article class="product-slide" data-product-id="${productId}">
        <img src="${imgSrc}" alt="${product.name}" onerror="this.src='assets/images/back.jpg'">
        <h5>${product.name}</h5>
        <p>${description}</p>
        <p class="price">${toCurrency(product.price)}${volume ? " - " + volume : ""}</p>
        <button class="add-to-cart-btn"
          data-product-id="${productId}"
          data-product-name="${product.name}"
          data-product-price="${product.price}"
          data-product-image="${imgSrc}">
          Add to Cart
        </button>
      </article>
    `;
  }

  // ============================================================================
  // CART MANAGEMENT
  // ============================================================================

  function getCart() {
    try {
      var cart = localStorage.getItem("drazeCart");
      return cart ? JSON.parse(cart) : {};
    } catch (error) {
      console.error("Error reading cart:", error);
      return {};
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem("drazeCart", JSON.stringify(cart));
      updateCartBadge();
    } catch (error) {
      console.error("Error saving cart:", error);
    }
  }

  function addToCart(productId, productName, productPrice, productImage) {
    var cart = getCart();

    if (!cart[productId]) {
      cart[productId] = {
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage,
        quantity: 0
      };
    }

    cart[productId].quantity += 1;
    saveCart(cart);
  }

  function removeFromCart(productId) {
    var cart = getCart();
    delete cart[productId];
    saveCart(cart);
  }

  function updateQuantity(productId, newQuantity) {
    var cart = getCart();
    if (!cart[productId]) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      cart[productId].quantity = newQuantity;
      saveCart(cart);
    }
  }

  function updateCartBadge() {
    var cart = getCart();
    var totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

    var desktopBadge = document.getElementById("cart-badge-desktop");
    var mobileBadge = document.getElementById("cart-badge-mobile");

    if (desktopBadge) {
      desktopBadge.textContent = totalItems;
      desktopBadge.style.display = totalItems > 0 ? "flex" : "none";
    }

    if (mobileBadge) {
      mobileBadge.textContent = totalItems;
      mobileBadge.style.display = totalItems > 0 ? "flex" : "none";
    }
  }

  function displayCart() {
    var cart = getCart();
    var itemsContainer = document.getElementById("cart-items-container");
    var totalElement = document.getElementById("cart-total");
    var cartElement = document.getElementById("offcanvasCart");
    var cartTotalSection = cartElement?.querySelector(".cart-total");

    var items = Object.values(cart);
    var total = 0;

    for (var i = 0; i < items.length; i++) {
      total += items[i].price * items[i].quantity;
    }

    if (items.length === 0) {
      itemsContainer.innerHTML = '<p class="text-center text-white">Your cart is empty!</p>';
      totalElement.textContent = toCurrency(0);
      if (cartTotalSection) cartTotalSection.style.display = 'none';
    } else {
      if (cartTotalSection) cartTotalSection.style.display = 'block';

      var html = '<div class="cart-items-list">';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        html += `
          <div class="cart-item mb-3 pb-3 border-bottom">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="text-white mb-0">${item.name}</h6>
              <button class="btn btn-sm btn-danger remove-from-cart" data-product-id="${item.id}">Remove</button>
            </div>
            <p class="text-muted mb-2">Price: ${toCurrency(item.price)}</p>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <button class="btn btn-sm btn-outline-secondary decrease-qty qty-btn" data-product-id="${item.id}">-</button>
                <span class="mx-2 text-white">${item.quantity}</span>
                <button class="btn btn-sm btn-outline-secondary increase-qty qty-btn" data-product-id="${item.id}">+</button>
              </div>
              <p class="text-warning fw-bold mb-0">${toCurrency(item.price * item.quantity)}</p>
            </div>
          </div>`;
      }
      html += '</div>';

      itemsContainer.innerHTML = html;
      totalElement.textContent = toCurrency(total);
    }

    // Open the cart side panel
    if (window.bootstrap?.Offcanvas) {
      if (!cartOffcanvasInstance) {
        cartOffcanvasInstance = new window.bootstrap.Offcanvas(cartElement);
      }
      cartOffcanvasInstance.show();

      setTimeout(() => {
        var checkoutBtn = cartElement.querySelector(".cart-total .btn");
        if (checkoutBtn && !checkoutBtn.hasCheckoutListener) {
          checkoutBtn.hasCheckoutListener = true;
          checkoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "checkout.html";
          });
        }
      }, 0);
    }
  }

  function initCartFunctionality() {
    if (cartListenerAttached) return;
    cartListenerAttached = true;
    updateCartBadge();

    // One click handler for all cart buttons (add, remove, +, -)
    document.addEventListener("click", function (e) {

      // "Add to Cart" button on product cards
      if (e.target.classList.contains("add-to-cart-btn")) {
        e.preventDefault();
        addToCart(
          e.target.getAttribute("data-product-id"),
          e.target.getAttribute("data-product-name"),
          e.target.getAttribute("data-product-price"),
          e.target.getAttribute("data-product-image")
        );
        e.target.textContent = "Added!";
        setTimeout(function () { e.target.textContent = "Add to Cart"; }, 1500);
      }

      // "Remove" button inside cart
      if (e.target.classList.contains("remove-from-cart")) {
        e.preventDefault();
        e.stopPropagation();
        removeFromCart(e.target.getAttribute("data-product-id"));
        displayCart();
      }

      // "+" or "-" quantity buttons inside cart
      if (e.target.classList.contains("increase-qty") || e.target.classList.contains("decrease-qty")) {
        e.preventDefault();
        e.stopPropagation();
        var cart = getCart();
        var productId = e.target.getAttribute("data-product-id");
        if (cart[productId]) {
          var change = e.target.classList.contains("increase-qty") ? 1 : -1;
          updateQuantity(productId, cart[productId].quantity + change);
          displayCart();
        }
      }
    });

    // Cart icon buttons (desktop and mobile) open the cart panel
    var desktopBtn = document.getElementById("cart-btn-desktop");
    var mobileBtn = document.getElementById("cart-btn-mobile");

    if (desktopBtn) {
      desktopBtn.addEventListener("click", function (e) { e.preventDefault(); displayCart(); });
    }
    if (mobileBtn) {
      mobileBtn.addEventListener("click", function (e) { e.preventDefault(); displayCart(); });
    }
  }

  // ============================================================================
  // PRODUCT SLIDER
  // ============================================================================

  async function initProductSlider() {
    var track = document.getElementById("product-slider-track");
    var prevButton = document.getElementById("product-slider-prev");
    var nextButton = document.getElementById("product-slider-next");

    if (!track || !prevButton || !nextButton) return;

    try {
      // Load products from JSON
      var response = await fetch("assets/data/rakija.json");
      var products = await response.json();

      // Show only most popular, or all if none are marked popular
      var mostPopular = products.filter(function (p) { return p.mostPopular === true; });
      if (mostPopular.length === 0) mostPopular = products;

      // Build product cards
      track.innerHTML = mostPopular.map(buildCard).join("");
      initCartFunctionality();

      var currentIndex = 0;
      var autoTimer = null;

      // How many cards are visible at the current screen width
      function visibleCount() {
        if (window.innerWidth <= 480) return 1;
        if (window.innerWidth <= 991) return 2;
        return 3;
      }

      // Last valid index so we don't scroll past the end
      function maxIndex() {
        return Math.max(0, mostPopular.length - visibleCount());
      }

      // Move the slider to the current index
      function update() {
        var firstCard = track.querySelector(".product-slide");
        if (!firstCard) return;
        var step = firstCard.getBoundingClientRect().width + 20;
        track.style.transform = "translateX(-" + (currentIndex * step) + "px)";
      }

      function slideNext(auto) {
        currentIndex = currentIndex >= maxIndex() ? 0 : currentIndex + 1;
        update();
        if (!auto) restartAuto();
      }

      function slidePrev() {
        currentIndex = currentIndex <= 0 ? maxIndex() : currentIndex - 1;
        update();
        restartAuto();
      }

      function restartAuto() {
        clearInterval(autoTimer);
        autoTimer = setInterval(function () { slideNext(true); }, 3500);
      }

      prevButton.addEventListener("click", slidePrev);
      nextButton.addEventListener("click", function () { slideNext(false); });

      window.addEventListener("resize", function () {
        currentIndex = Math.min(currentIndex, maxIndex());
        update();
      });

      update();
      restartAuto();

    } catch (error) {
      console.error("Error loading slider:", error);
      track.innerHTML = '<article class="product-slide"><h5>Products unavailable</h5><p>Unable to load right now.</p></article>';
    }
  }

  // ============================================================================
  // TESTIMONIALS
  // ============================================================================

  async function loadTestimonials() {
    var track = document.getElementById("testimonials-track");
    if (!track) return;

    try {
      // Load reviews from JSON
      var response = await fetch("assets/data/reviews.json");
      var reviews = await response.json();

      // Build one review card HTML
      function buildReviewCard(review) {
        var stars = "";
        for (var i = 0; i < 5; i++) {
          if (i < review.reviewDetails.rating) {
            stars += '<i class="star bi bi-star-fill"></i>';
          } else {
            stars += '<i class="star bi bi-star"></i>';
          }
        }

        return `
          <div class="testimonial-card">
            <div>
              <div class="testimonial-header">
                <img src="${review.author.avatar}" alt="${review.author.name}" class="testimonial-avatar">
                <div class="testimonial-info">
                  <h6>${review.author.name}</h6>
                  <p>${review.author.profession}</p>
                </div>
              </div>
              <div class="testimonial-stars">${stars}</div>
              <p class="testimonial-text">&ldquo;${review.reviewDetails.text}&rdquo;</p>
            </div>
            <p class="testimonial-date">${new Date(review.reviewDetails.date).toLocaleDateString()}</p>
          </div>`;
      }

      // Duplicate cards so the loop is seamless
      var cardsHtml = reviews.map(buildReviewCard).join("");
      track.innerHTML = cardsHtml + cardsHtml;

      // Smooth auto-scrolling variables
      var offset = 0;
      var paused = false;
      var speed = 0.5;

      // Calculate the width of the first set of cards (half the track)
      function measureHalf() {
        var cards = track.querySelectorAll(".testimonial-card");
        var count = cards.length / 2;
        if (!count || !cards[0]) return 0;
        var gap = window.innerWidth <= 768 ? 20 : 30;
        return count * (cards[0].getBoundingClientRect().width + gap);
      }

      // Animation loop: moves cards left pixel by pixel
      function tick() {
        if (!paused) {
          offset += speed;
          var halfWidth = measureHalf();
          if (halfWidth > 0 && offset >= halfWidth) offset -= halfWidth;
          track.style.transform = "translateX(" + (-offset) + "px)";
        }
        requestAnimationFrame(tick);
      }

      // Pause scrolling on hover
      var wrapper = track.closest(".testimonials-slider-wrapper");
      if (wrapper) {
        wrapper.addEventListener("mouseenter", function () { paused = true; });
        wrapper.addEventListener("mouseleave", function () { paused = false; });
      }

      tick();

    } catch (error) {
      console.error("Error loading testimonials:", error);
    }
  }

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const VALIDATION_RULES = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    fullName: /^[a-zA-Zčćšžđ]+(\s[a-zA-Zčćšžđ]+)+$/,
    message: /^[a-zA-Z0-9\s.,!?'\-]*$/,
    phone: /^\+?[0-9\s\-]{7,15}$/,
    address: /^[a-zA-Z0-9čćšžđ\s.,\/\-]{3,}$/,
    city: /^[a-zA-Zčćšžđ\s\-]{2,}$/,
    zip: /^[0-9]{4,10}$/,
    cardNumber: /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/,
    cardExpiry: /^(0[1-9]|1[0-2])\/[0-9]{2}$/,
    cardCvv: /^[0-9]{3,4}$/
  };

  Object.keys(VALIDATION_RULES).forEach(function (key) {
    window["REG_" + key.toUpperCase()] = VALIDATION_RULES[key];
  });

  function validateField(value, rule) {
    return value && rule.test(value.trim());
  }

  function clearFieldError(fieldId) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove("is-invalid");
    var container = field.closest(".form-floating");
    if (container) {
      var errorMsg = container.parentElement.querySelector('.error-message[data-for="' + fieldId + '"]');
      if (errorMsg) errorMsg.remove();
    }
  }

  function showFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add("is-invalid");
    var container = field.closest(".form-floating") || field.parentElement;
    var errorMsg = container.parentElement.querySelector('.error-message[data-for="' + fieldId + '"]');

    if (!errorMsg) {
      errorMsg = document.createElement("small");
      errorMsg.className = "error-message d-block";
      errorMsg.setAttribute("data-for", fieldId);
      container.after(errorMsg);
    }

    errorMsg.textContent = message;
  }

  function validateForm(fieldsToValidate) {
    var isValid = true;

    for (var i = 0; i < fieldsToValidate.length; i++) {
      var field = fieldsToValidate[i];
      var fieldElement = document.getElementById(field.id);
      if (!fieldElement) continue;

      var value = fieldElement.value;
      clearFieldError(field.id);

      if (field.required && !value) {
        showFieldError(field.id, field.name + " is required");
        isValid = false;
      } else if (value && !validateField(value, field.rule)) {
        showFieldError(field.id, field.errorMessage);
        isValid = false;
      }
    }

    return isValid;
  }

  window.validateForm = validateForm;
  window.showFieldError = showFieldError;
  window.clearFieldError = clearFieldError;

  function setupFormValidation(formSelector, fieldsConfig) {
    var form = document.querySelector(formSelector);
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (validateForm(fieldsConfig)) {
        var successMsg = form.querySelector(".success-message") || form.querySelector('[id$="-success-message"]');
        if (successMsg) {
          successMsg.style.display = "block";
          form.reset();
          setTimeout(function () { successMsg.style.display = "none"; }, 5000);
        }
      }
    });
  }

  function initFormValidation() {
    setupFormValidation(".membership-form", [
      { id: "newsletter-full-name", rule: VALIDATION_RULES.fullName, required: true, name: "Full Name", errorMessage: "Please enter first and last name" },
      { id: "newsletter-email", rule: VALIDATION_RULES.email, required: true, name: "Email", errorMessage: "Please enter a valid email" }
    ]);

    setupFormValidation(".contact-form", [
      { id: "full-name", rule: VALIDATION_RULES.fullName, required: true, name: "Full Name", errorMessage: "Please enter first and last name" },
      { id: "email", rule: VALIDATION_RULES.email, required: true, name: "Email", errorMessage: "Please enter a valid email" },
      { id: "message", rule: VALIDATION_RULES.message, required: false, name: "Message", errorMessage: "Message contains invalid characters" }
    ]);
  }

  // ============================================================================
  // CHECKOUT
  // ============================================================================

  function loadCheckoutItems() {
    var itemsList = document.getElementById("checkout-items-list");
    var totalElement = document.getElementById("checkout-total");
    if (!itemsList || !totalElement) return;

    var cart = getCart();
    var items = Object.values(cart);

    if (items.length === 0) {
      window.location.href = "shop.html";
      return;
    }

    var total = 0;
    var html = "";

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      total += item.price * item.quantity;
      html += `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 checkout-item-divider">
          <div class="d-flex align-items-center flex-grow-1">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" class="checkout-image">` : ""}
            <div>
              <h6 class="text-dark mb-1">${item.name}</h6>
              <small class="text-muted">Qty: ${item.quantity} x ${toCurrency(item.price)}</small>
            </div>
          </div>
          <span class="text-warning fw-bold">${toCurrency(item.price * item.quantity)}</span>
        </div>`;
    }

    itemsList.innerHTML = html;
    totalElement.textContent = toCurrency(total);
  }

  function initCheckoutPage() {
    var purchaseBtn = document.getElementById("complete-purchase-btn");
    if (!purchaseBtn) return;

    loadCheckoutItems();

    purchaseBtn.addEventListener("click", function () {
      var fieldsToValidate = [
        { id: "checkout-name", rule: VALIDATION_RULES.fullName, required: true, name: "Full Name", errorMessage: "Please enter first and last name" },
        { id: "checkout-email", rule: VALIDATION_RULES.email, required: true, name: "Email", errorMessage: "Please enter valid email" },
        { id: "checkout-phone", rule: VALIDATION_RULES.phone, required: true, name: "Phone", errorMessage: "Please enter valid phone" },
        { id: "checkout-address", rule: VALIDATION_RULES.address, required: true, name: "Address", errorMessage: "Please enter valid address" },
        { id: "checkout-city", rule: VALIDATION_RULES.city, required: true, name: "City", errorMessage: "Please enter valid city" },
        { id: "checkout-zip", rule: VALIDATION_RULES.zip, required: true, name: "ZIP", errorMessage: "Please enter valid ZIP code" }
      ];

      var paymentMethod = document.querySelector("input[name='payment-method']:checked").value;

      if (paymentMethod === "card") {
        fieldsToValidate.push(
          { id: "card-number", rule: VALIDATION_RULES.cardNumber, required: true, name: "Card Number", errorMessage: "Please enter valid 16-digit card" },
          { id: "card-expiry", rule: VALIDATION_RULES.cardExpiry, required: true, name: "Expiry", errorMessage: "Please enter valid expiry (MM/YY)" },
          { id: "card-cvv", rule: VALIDATION_RULES.cardCvv, required: true, name: "CVV", errorMessage: "Please enter valid CVV" }
        );
      }

      if (!validateForm(fieldsToValidate)) return;

      // Purchase successful - clear cart and show success
      localStorage.setItem("drazeCart", "{}");
      document.getElementById("checkout-content").style.display = "none";
      document.getElementById("success-message").style.display = "block";
    });

    // Show/hide card fields when payment method changes
    document.querySelectorAll("input[name='payment-method']").forEach(function (radio) {
      radio.addEventListener("change", function () {
        document.getElementById("card-details").style.display = radio.value === "card" ? "block" : "none";
      });
    });
  }

  // ============================================================================
  // SHOP PAGE
  // ============================================================================

  const ITEMS_PER_PAGE = 6;
  var shopProducts = [];
  var filteredShopProducts = [];
  var currentPage = 1;

  async function loadShopProducts() {
    var productsGrid = document.getElementById("products-grid");
    if (!productsGrid) return;

    try {
      // Load all products from JSON
      var response = await fetch("assets/data/rakija.json");
      var data = await response.json();

      shopProducts = data;
      filteredShopProducts = shopProducts.slice();
      renderShopProducts();
      setupShopFilters();

    } catch (error) {
      console.error("Error loading products:", error);
      productsGrid.innerHTML = '<div class="col-12"><p class="error-message">Unable to load products. Check connection.</p></div>';
    }
  }

  function renderShopProducts() {
    var grid = document.getElementById("products-grid");
    if (!grid) return;

    grid.innerHTML = "";
    var oldPagination = document.getElementById("pagination-container");
    if (oldPagination) oldPagination.remove();

    if (filteredShopProducts.length === 0) {
      grid.innerHTML = '<div class="col-12 text-center"><p class="error-message">No products match your filters.</p></div>';
      return;
    }

    // Get the products for the current page
    var start = (currentPage - 1) * ITEMS_PER_PAGE;
    var end = start + ITEMS_PER_PAGE;
    var pageProducts = filteredShopProducts.slice(start, end);

    for (var i = 0; i < pageProducts.length; i++) {
      var product = pageProducts[i];
      var card = document.createElement("div");
      card.className = "col-lg-4 col-md-6 col-12 mb-4";

      var addToCartBtn;
      if (product.stockInfo.quantityAvailable > 0) {
        addToCartBtn = `<button class="btn add-to-cart-btn w-100 mt-3"
          data-product-id="${product.id}"
          data-product-name="${product.name}"
          data-product-price="${product.price}"
          data-product-image="${product.image}">
          Add to Cart
        </button>`;
      } else {
        addToCartBtn = '<button class="btn add-to-cart-btn w-100 mt-3" disabled>Out of Stock</button>';
      }

      card.innerHTML = `
        <div class="shop-card p-4 rounded h-100">
          <img src="${product.image}" alt="${product.name}" onerror="this.src='assets/images/back.jpg'">
          <h5 class="product-title mb-2">${product.name}</h5>
          <p class="product-meta mb-1"><small>${product.category} - ${product.packagingType}</small></p>
          <p class="product-desc small mb-3">${product.details.description}</p>
          <p class="product-detail mb-1"><strong>Volume:</strong> ${product.details.volume}</p>
          <p class="product-detail mb-1"><strong>Alcohol:</strong> ${product.details.alcoholPercentage}%</p>
          <p class="product-detail mb-3"><strong>Available:</strong> ${product.stockInfo.quantityAvailable}</p>
          <h4 class="product-price mb-3">${toCurrency(product.price)}</h4>
          ${addToCartBtn}
        </div>`;

      grid.appendChild(card);
    }

    // Add page buttons if there are multiple pages
    var totalPages = Math.ceil(filteredShopProducts.length / ITEMS_PER_PAGE);

    if (totalPages > 1) {
      var paginationContainer = document.createElement("div");
      paginationContainer.className = "col-12 text-center mt-4";
      paginationContainer.id = "pagination-container";

      var buttons = "";
      for (var p = 1; p <= totalPages; p++) {
        var activeClass = (p === currentPage) ? " active" : "";
        buttons += '<button type="button" class="btn pagination-btn' + activeClass + '" data-page="' + p + '">' + p + '</button>';
      }

      paginationContainer.innerHTML = '<div class="btn-group" role="group" data-pagination>' + buttons + '</div>';
      grid.parentElement.appendChild(paginationContainer);
    }
  }

  function applyShopFiltersAndSort() {
    var selectedFruits = Array.from(document.querySelectorAll(".fruit-filter:checked")).map(function (c) { return c.value; });
    var selectedSizes = Array.from(document.querySelectorAll(".size-filter:checked")).map(function (c) { return c.value; });
    var selectedStock = document.getElementById("in-stock-filter")?.checked || false;
    var sortBy = document.querySelector('input[name="sort"]:checked')?.value || "";

    // Filter products
    filteredShopProducts = shopProducts.filter(function (product) {
      var fruitMatch = selectedFruits.length === 0 || selectedFruits.includes(product.category);
      var sizeMatch = selectedSizes.length === 0 || selectedSizes.includes(product.packagingType);
      var stockMatch = !selectedStock || product.stockInfo.quantityAvailable > 0;
      return fruitMatch && sizeMatch && stockMatch;
    });

    currentPage = 1;

    // Sort products
    switch (sortBy) {
      case "name-asc":
        filteredShopProducts.sort(function (a, b) { return a.name.localeCompare(b.name); });
        break;
      case "name-desc":
        filteredShopProducts.sort(function (a, b) { return b.name.localeCompare(a.name); });
        break;
      case "price-low":
        filteredShopProducts.sort(function (a, b) { return a.price - b.price; });
        break;
      case "price-high":
        filteredShopProducts.sort(function (a, b) { return b.price - a.price; });
        break;
      case "volume-low":
        filteredShopProducts.sort(function (a, b) { return parseInt(a.details.volume) - parseInt(b.details.volume); });
        break;
      case "volume-high":
        filteredShopProducts.sort(function (a, b) { return parseInt(b.details.volume) - parseInt(a.details.volume); });
        break;
    }

    renderShopProducts();
  }

  function setupShopFilters() {
    var filtersContainer = document.querySelector(".filters-card") || document.querySelector("[data-filters]");

    function handleFilterChange(e) {
      if (e.target.classList.contains("sort-option") ||
          e.target.classList.contains("fruit-filter") ||
          e.target.classList.contains("size-filter") ||
          e.target.id === "in-stock-filter") {
        applyShopFiltersAndSort();
        scrollToShopSection();
      }
    }

    if (filtersContainer) {
      filtersContainer.addEventListener("change", handleFilterChange);
    } else {
      document.addEventListener("change", handleFilterChange);
    }

    var resetBtn = document.getElementById("reset-filters");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        document.querySelectorAll(".fruit-filter, .size-filter, .sort-option, #in-stock-filter").forEach(function (el) {
          el.checked = false;
        });
        filteredShopProducts = shopProducts.slice();
        currentPage = 1;
        renderShopProducts();
        scrollToShopSection();
      });
    }
  }

  function scrollToShopSection() {
    var shopSection = document.getElementById("shop-section");
    if (!shopSection) return;

    var headerHeight = document.querySelector(".navbar").offsetHeight;
    window.scrollTo({ top: shopSection.offsetTop - headerHeight, behavior: "smooth" });
  }

  function initShopPageUI() {
    if (!window.location.pathname.includes("shop.html")) return;

    setTimeout(function () {
      document.querySelectorAll(".navbar-nav .nav-link").forEach(function (link) {
        link.classList.remove("active", "inactive");
      });
      var shopLink = document.querySelector('a.nav-link[href="shop.html"]');
      if (shopLink) shopLink.classList.add("active");
    }, 100);

    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("pagination-btn")) {
        currentPage = parseInt(e.target.getAttribute("data-page"));
        renderShopProducts();
        scrollToShopSection();
      }
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function initApp() {
    initShopPageUI();
    initCartFunctionality();
    updateCartBadge();
    initProductSlider();
    loadTestimonials();
    initFormValidation();
    loadShopProducts();
    initCheckoutPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

})();
