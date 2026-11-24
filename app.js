(() => {
  "use strict";

  const data = window.GUMA_DATA;
  if (!data) throw new Error("No se cargaron los datos de GUMA.");

  const byId = (id) => document.getElementById(id);
  const designGrid = byId("design-grid");
  const designStatus = byId("design-status");
  const designSearch = byId("design-search");
  const loadMoreButton = byId("load-more");
  let categoryTabs = [];
  const cartDialog = byId("cart-dialog");
  const addDialog = byId("add-dialog");
  const viewerDialog = byId("image-viewer");
  const storageStatus = byId("storage-status");
  const toast = byId("add-toast");
  const toastMessage = byId("add-toast-message");
  let toastTimer;
  const pageSize = 12;
  const header = document.querySelector(".site-header");

  const formatsById = new Map(data.formats.map((format) => [format.id, format]));
  const categoriesById = new Map(data.categories.map((category) => [category.id, category]));
  const combosById = new Map(data.combos.map((combo) => [combo.id, combo]));
  const extrasById = new Map(data.extras.map((extra) => [extra.id, extra]));
  const customPosters = Array.isArray(window.GUMA_POSTERS) ? window.GUMA_POSTERS : [];
  const customPostersById = new Map(customPosters.map((poster) => [poster.id, poster]));
  let activeCategory = "todos";
  let visibleCount = pageSize;
  let selectedDesign = null;
  let focusedViewerTrigger = null;
  let preferredFormatId = "";
  let viewerDesign = null;
  let storageWarning = "";
  let cart = { items: [], name: "", notes: "", delivery: "", orderCode: "" };
  const unavailableDesigns = new Set();

  const money = (cents) => {
    const whole = Math.floor(cents / 100);
    const fraction = cents % 100;
    return `S/ ${whole}${fraction ? `.${String(fraction).padStart(2, "0")}` : ""}`;
  };

  function generateOrderCode() {
    const parts = new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima",
      day: "2-digit",
      month: "2-digit"
    }).formatToParts(new Date());
    const day = parts.find((part) => part.type === "day")?.value || "01";
    const month = parts.find((part) => part.type === "month")?.value || "01";
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    return `GUMA-${day}${month}-${random}`;
  }

  function updateHeaderHeight() {
    if (!header) return;
    document.documentElement.style.setProperty("--header-h", `${Math.ceil(header.getBoundingClientRect().height)}px`);
  }

  function scrollToSection(id) {
    if (id === "portada") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    const headerHeight = header?.getBoundingClientRect().height || 74;
    const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function setStorageWarning(message) {
    storageWarning = message;
    storageStatus.textContent = message;
  }

  function lineIsValid(line) {
    if (!line || typeof line !== "object" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) return false;
    if (line.kind === "poster") {
      const validFormat = formatsById.has(line.formatId) && !formatsById.get(line.formatId).pack;
      if (typeof line.posterId === "string") return customPostersById.has(line.posterId) && validFormat;
      return typeof line.id === "string" && categoriesById.has(line.categoryId) &&
        Number.isInteger(line.number) && line.number > 0 && line.number <= categoriesById.get(line.categoryId).total && validFormat;
    }
    if (line.kind === "combo") return typeof line.id === "string" && combosById.has(line.comboId);
    if (line.kind === "pack") return typeof line.id === "string" && formatsById.get(line.formatId)?.pack === true;
    if (line.kind === "extra") {
      const extra = extrasById.get(line.extraId);
      return typeof line.id === "string" && extra?.options.some((option) => option.quantity === line.bundleQuantity) === true;
    }
    return false;
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem("guma-pedido");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
        throw new Error("El formato guardado no es válido.");
      }

      const validItems = parsed.items.filter(lineIsValid);
      if (validItems.length !== parsed.items.length) {
        setStorageWarning("Se omitieron líneas inválidas del pedido guardado.");
      }
      cart = {
        items: validItems,
        name: typeof parsed.name === "string" ? parsed.name.slice(0, 80) : "",
        notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 300) : "",
        delivery: ["lima", "shalom", "coordinar"].includes(parsed.delivery) ? parsed.delivery : "",
        orderCode: validItems.length && /^GUMA-\d{4}-\d{4}$/.test(parsed.orderCode || "")
          ? parsed.orderCode
          : ""
      };
      if (!validItems.length) cart.orderCode = "";
      else if (!cart.orderCode) cart.orderCode = generateOrderCode();
      saveCart();
    } catch (error) {
      cart = { items: [], name: "", notes: "", delivery: "", orderCode: "" };
      setStorageWarning(`No se pudo recuperar el pedido guardado: ${error.message}`);
    }
  }

  function saveCart() {
    try {
      localStorage.setItem("guma-pedido", JSON.stringify(cart));
      if (storageWarning.startsWith("No se pudo guardar")) setStorageWarning("");
    } catch (error) {
      setStorageWarning(`No se pudo guardar el pedido en este dispositivo: ${error.message}`);
    }
  }

  function formatUnitPrice(format, quantity) {
    if (!format.discountGroup) return format.price;
    const tiers = data.discounts[format.discountGroup] || [];
    const tier = [...tiers].reverse().find((item) => quantity >= item.from);
    return tier ? tier.price : format.price;
  }

  function posterQuantitiesByGroup() {
    const totals = new Map();
    cart.items.filter((line) => line.kind === "poster").forEach((line) => {
      const format = formatsById.get(line.formatId);
      if (!format.discountGroup) return;
      totals.set(format.discountGroup, (totals.get(format.discountGroup) || 0) + line.quantity);
    });
    return totals;
  }

  function cartLinePrice(line, posterTotals) {
    if (line.kind === "poster") {
      const format = formatsById.get(line.formatId);
      const groupQuantity = format.discountGroup ? posterTotals.get(format.discountGroup) : line.quantity;
      return formatUnitPrice(format, groupQuantity || line.quantity) * line.quantity;
    }
    if (line.kind === "combo") return combosById.get(line.comboId).price * line.quantity;
    if (line.kind === "pack") return formatsById.get(line.formatId).price * line.quantity;
    const extra = extrasById.get(line.extraId);
    const option = extra.options.find((item) => item.quantity === line.bundleQuantity);
    return option.price * line.quantity;
  }

  function totalCartPrice(posterTotals = posterQuantitiesByGroup()) {
    const products = cart.items.reduce((sum, line) => sum + cartLinePrice(line, posterTotals), 0);
    return products + (cart.delivery === "lima" ? data.delivery.lima.price : 0);
  }

  function getDesigns() {
    const largestCategory = Math.max(...data.categories.map((category) => category.total));
    const migratedLegacyKeys = new Set(customPosters
      .filter((poster) => poster.legacyCategoryId && Number.isInteger(Number(poster.legacyNumber)))
      .map((poster) => `${poster.legacyCategoryId}:${Number(poster.legacyNumber)}`));
    const legacy = Array.from({ length: largestCategory }, (_, index) =>
      data.categories.filter((category) => index < category.total).map((category) => {
        const number = index + 1;
        if (migratedLegacyKeys.has(`${category.id}:${number}`)) return null;
        const name = typeof category.names?.[number] === "string" ? category.names[number].trim() : "";
        return {
          id: `${category.id}:${number}`, category, number,
          src: `imagenes/${category.prefix}${number}.jpg`, name,
          title: `${category.name} ${String(number).padStart(2, "0")}${name ? ` · ${name}` : ""}`,
          artist: "", genre: "", year: "", tags: []
        };
      })
    ).flat().filter(Boolean);
    const individual = customPosters.map((poster) => {
      const category = categoriesById.get(poster.categoryId);
      if (!category || !poster.id || !poster.image) return null;
      return { ...poster, category, number: null, src: poster.image, name: poster.title, title: poster.title,
        tags: Array.isArray(poster.tags) ? poster.tags : [] };
    }).filter(Boolean);
    return [...legacy, ...individual];
  }

  const designs = getDesigns();

  function normalized(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function filteredDesigns() {
    const query = normalized(designSearch.value);
    return designs.filter((design) => {
      if (unavailableDesigns.has(designKey(design))) return false;
      if (activeCategory !== "todos" && design.category.id !== activeCategory) return false;
      const searchable = normalized(`${design.category.name} ${design.category.id} ${design.number || ""} ${design.title} ${design.name}`);
      return !query || searchable.includes(query);
    });
  }

  function designKey(design) {
    return design.id || `${design.category.id}:${design.number}`;
  }


  function createDesignCard(design) {
    const card = element("article", "design-card");
    const imageButton = element("button", "design-image-button");
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `Ampliar póster ${design.title}`);
    const image = element("img");
    image.src = design.src;
    image.alt = `Póster ${design.title} · ${design.category.name}`;
    image.width = 300;
    image.height = 424;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      unavailableDesigns.add(designKey(design));
      renderDesigns();
    }, { once: true });
    imageButton.append(image);
    imageButton.addEventListener("click", () => openViewer(imageButton, image, design));

    const details = element("div", "design-card-info");
    const title = element("h3", "", design.title);
    const addButton = element("button", "add-poster", "Agregar");
    addButton.type = "button";
    addButton.setAttribute("aria-label", `Agregar ${design.title} al pedido`);
    addButton.addEventListener("click", () => openAddDialog(design));
    details.append(title, addButton);
    card.append(imageButton, details);
    return card;
  }

  function renderDesigns(reset = false, append = false) {
    if (reset) visibleCount = pageSize;
    const matches = filteredDesigns();
    const start = append ? Math.min(visibleCount - pageSize, matches.length) : 0;
    const shown = matches.slice(start, visibleCount);
    const cards = shown.map(createDesignCard);
    if (append) designGrid.append(...cards);
    else designGrid.replaceChildren(...cards);
    byId("design-empty").hidden = matches.length > 0;
    loadMoreButton.hidden = matches.length <= visibleCount;
    const renderedCount = designGrid.querySelectorAll(".design-card").length;
    designStatus.textContent = matches.length
      ? `Mostrando ${renderedCount} de ${matches.length} diseños.`
      : "No hay diseños que coincidan con tu búsqueda.";
  }

  function renderCategoryTabs() {
    const container = byId("category-tabs");
    const tabs = [{ id: "todos", name: "Todos" }, ...data.categories.map((category) => ({ id: category.id, name: category.name }))];
    tabs.forEach((item, index) => {
      const tab = element("button", "", item.name);
      tab.type = "button";
      tab.dataset.filter = item.id;
      tab.setAttribute("aria-pressed", String(index === 0));
      container.append(tab);
    });
    categoryTabs = [...container.querySelectorAll("[data-filter]")];
  }

  function openViewer(trigger, image, design = null) {
    focusedViewerTrigger = trigger;
    viewerDesign = design;
    byId("image-viewer-img").src = image.currentSrc || image.src;
    byId("image-viewer-img").alt = image.alt;
    byId("image-viewer-caption").textContent = design ? design.title : image.alt;
    const controls = byId("viewer-controls");
    controls.hidden = !design;
    if (design) {
      const allMatches = filteredDesigns();
      const index = allMatches.findIndex((item) => designKey(item) === designKey(design));
      byId("viewer-prev").disabled = allMatches.length < 2;
      byId("viewer-next").disabled = allMatches.length < 2;
      byId("viewer-prev").dataset.index = String(index);
      byId("viewer-next").dataset.index = String(index);
    }
    viewerDialog.showModal();
    byId("image-viewer-close").focus();
  }

  function closeViewer() {
    if (viewerDialog.open) viewerDialog.close();
  }

  function showAddedToast(name) {
    toastMessage.textContent = `Agregado ✓ ${name}`;
    toast.hidden = false;
    toast.classList.remove("toast-visible");
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove("toast-visible");
    }, 3000);
  }

  function addOrIncrement(newLine, label) {
    if (!lineIsValid(newLine)) throw new Error("No se pudo agregar el producto: datos inválidos.");
    const wasEmpty = cart.items.length === 0;
    const existing = cart.items.find((line) => line.id === newLine.id);
    if (existing) existing.quantity = Math.min(99, existing.quantity + newLine.quantity);
    else cart.items.push(newLine);
    if (wasEmpty && cart.items.length) cart.orderCode = generateOrderCode();
    saveCart();
    renderCart();
    byId("cart-count").textContent = cart.items.reduce((sum, line) => sum + line.quantity, 0);
    showAddedToast(label);
  }

  function formatOptionLabel(format) {
    return format.name;
  }

  function openAddDialog(design) {
    selectedDesign = design;
    byId("selected-design").textContent = `${design.title} · elige formato y cantidad.`;
    byId("selected-design-id").value = design.id || `${design.category.id}:${design.number}`;
    const select = byId("poster-format");
    select.replaceChildren(...data.formats.filter((format) => !format.pack).map((format) => {
      const option = element("option", "", formatOptionLabel(format));
      option.value = format.id;
      return option;
    }));
    if (preferredFormatId && data.formats.some((format) => format.id === preferredFormatId && !format.pack)) {
      select.value = preferredFormatId;
    }
    byId("poster-quantity").value = "1";
    addDialog.showModal();
    select.focus();
  }

  function addPack(formatId) {
    const format = formatsById.get(formatId);
    if (!format?.pack) throw new Error("El formato seleccionado no es un pack válido.");
    addOrIncrement({ kind: "pack", id: `pack:${formatId}`, formatId, quantity: 1 }, `${format.name} · pack`);
  }

  function addExtra(extraId, bundleQuantity) {
    const extra = extrasById.get(extraId);
    if (!extra?.options.some((option) => option.quantity === bundleQuantity)) {
      throw new Error("La opción de complemento seleccionada no está disponible.");
    }
    addOrIncrement({
      kind: "extra",
      id: `extra:${extraId}:${bundleQuantity}`,
      extraId,
      bundleQuantity,
      quantity: 1
    }, `${extra.name} · ${bundleQuantity}`);
  }

  function setPreferredFormat(format) {
    preferredFormatId = format.id;
    const chip = byId("preferred-format-chip");
    chip.replaceChildren();
    chip.hidden = false;
    chip.append(document.createTextNode(`Formato: ${format.name} `));
    const remove = element("button", "", "✕");
    remove.type = "button";
    remove.setAttribute("aria-label", `Quitar formato preferido ${format.name}`);
    remove.addEventListener("click", () => clearPreferredFormat());
    chip.append(remove);
    chip.setAttribute("aria-label", `Formato preferido ${format.name}`);
    scrollToSection("disenos");
  }

  function clearPreferredFormat() {
    preferredFormatId = "";
    const chip = byId("preferred-format-chip");
    chip.replaceChildren();
    chip.hidden = true;
  }

  function renderFormats() {
    const container = byId("format-grid");
    data.formats.forEach((format) => {
      const card = element("article", "format-card");
      card.dataset.format = format.id;
      const art = element("div", "format-art");
      const image = element("img");
      image.src = `imagenes/${format.image}`;
      image.alt = `Ejemplo de formato ${format.name}`;
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 300;
      image.height = 424;
      image.style.setProperty("--sample-height", `${format.visualHeight}px`);
      image.style.setProperty("--sample-ratio", format.ratio);
      image.addEventListener("error", () => card.remove(), { once: true });
      art.append(image);

      const copy = element("div", "format-card-copy");
      copy.append(element("h3", "", format.name), element("p", "", format.measure));
      copy.append(element("strong", "format-price", `${money(format.price)}${format.pack ? " / pack" : " c/u"}`));
      if (format.pack) {
        const button = element("button", "button button-orange", "Agregar pack");
        button.type = "button";
        button.addEventListener("click", () => addPack(format.id));
        copy.append(button);
      } else {
        const button = element("button", "button button-dark", `Ver diseños en ${format.name} →`);
        button.type = "button";
        button.addEventListener("click", () => setPreferredFormat(format));
        copy.append(button);
      }
      card.append(art, copy);
      container.append(card);
    });

    const rows = byId("discount-rows");
    const thresholds = data.discounts[Object.keys(data.discounts)[0]].map((tier) => tier.from);
    const headingRow = byId("discount-headings");
    thresholds.forEach((threshold) => headingRow.append(element("th", "", `Desde ${threshold}`)));
    Object.entries(data.discounts).forEach(([group, tiers]) => {
      const row = element("tr");
      row.append(element("th", "", data.discountLabels[group]));
      thresholds.forEach((threshold) => {
        const tier = tiers.find((item) => item.from === threshold);
        row.append(element("td", "", money(tier.price)));
      });
      rows.append(row);
    });
  }

  function renderExtras() {
    const container = byId("extras-grid");
    data.extras.forEach((extra) => {
      const card = element("article", "extra-card");
      const image = element("img");
      image.src = `imagenes/${extra.id}.jpg`;
      image.alt = extra.id === "luces" ? "Luces cálidas decorativas" : "Plantas decorativas para la pared";
      image.width = 400;
      image.height = 300;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => image.remove(), { once: true });
      const copy = element("div", "extra-card-copy");
      copy.append(element("h3", "", extra.name), element("p", "", "Disponibilidad por WhatsApp"));
      const options = element("div", "extra-options");
      extra.options.forEach((option) => {
        const button = element("button", "", `${option.quantity} · ${money(option.price)}`);
        button.type = "button";
        button.setAttribute("aria-label", `Agregar ${option.quantity} ${extra.name.toLowerCase()} al pedido por ${money(option.price)}`);
        button.addEventListener("click", () => addExtra(extra.id, option.quantity));
        options.append(button);
      });
      copy.append(options);
      card.append(image, copy);
      container.append(card);
    });
  }

  function renderCombos() {
    const container = byId("combo-grid");
    data.combos.forEach((combo, index) => {
      const card = element("article", "combo-card");
      const comboClass = combo.id === "elite" || combo.id === "premium"
        ? "combo-ink"
        : ["combo-orange", "combo-blue", "combo-cream"][index % 3];
      card.classList.add(comboClass);

      const header = element("header", "combo-header");
      header.append(element("span", "combo-label", `Combo ${String(index + 1).padStart(2, "0")}`));
      header.append(element("h3", "", combo.name));
      const pieceCount = combo.contents.reduce((sum, item) => sum + item.quantity, 0);
      header.append(element("p", "combo-piece-count", `${pieceCount} piezas`));
      card.append(header);

      const posters = combo.contents.filter((item) => ["super-a3", "a3", "a4", "a5", "especial-1", "especial-2"].includes(item.format));
      const minis = combo.contents.filter((item) => ["polaroid", "photocard"].includes(item.format));
      const content = element("div", "combo-contents");
      [
        ["Pósters", posters],
        ["Minis", minis]
      ].forEach(([label, items]) => {
        if (!items.length) return;
        const group = element("section", "combo-content-group");
        group.append(element("p", "combo-group-label", label));
        const chips = element("div", "combo-chips");
        items.forEach((item) => {
          chips.append(element("span", "combo-chip", `${item.quantity} × ${formatsById.get(item.format).name}`));
        });
        group.append(chips);
        content.append(group);
      });
      card.append(content);

      const price = element("p", "combo-price");
      price.append(element("del", "", money(combo.regularPrice)), element("strong", "", money(combo.price)));
      const saving = element("span", "combo-saving", `Ahorras ${money(combo.regularPrice - combo.price)}`);
      price.append(saving);
      card.append(price);

      const button = element("button", "button button-dark", "Quiero este combo");
      button.type = "button";
      button.addEventListener("click", () => {
        addOrIncrement({ kind: "combo", id: `combo:${combo.id}`, comboId: combo.id, quantity: 1 }, `Combo ${combo.name}`);
      });
      card.append(button);
      container.append(card);
    });
  }

  function renderIdeas() {
    const section = byId("ideas");
    const container = byId("ideas-grid");
    const photos = Array.isArray(data.homePhotos) ? data.homePhotos : [];
    const navLink = byId("ideas-nav-link");
    if (!photos.length) {
      section.hidden = true;
      if (navLink) navLink.hidden = true;
      return;
    }
    photos.forEach((photo) => {
      const card = element("article", "idea-card");
      const button = element("button", "idea-image-button");
      button.type = "button";
      button.setAttribute("aria-label", `Ampliar imagen: ${photo.alt}`);
      const image = element("img");
      image.src = photo.src;
      image.alt = photo.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => card.remove(), { once: true });
      button.append(image);
      button.addEventListener("click", () => openViewer(button, image));
      card.append(button);
      container.append(card);
    });
  }

  function renderContacts() {
    const container = byId("social-links");
    const phone = data.whatsapp;
    const contacts = [
      ...data.contacts,
      {
        name: "WhatsApp",
        handle: `${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`,
        url: `https://wa.me/${phone}`
      }
    ];
    contacts.forEach((contact) => {
      const link = element("a", "social-link");
      link.href = contact.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(element("span", "", contact.name), element("strong", "", contact.handle), element("span", "", "↗"));
      container.append(link);
    });
    const location = element("div", "social-location");
    location.append(
      element("span", "", "Ubicación"),
      element("strong", "", "Lima, Perú")
    );
    container.append(location);
    byId("whatsapp-general").href = `https://wa.me/${phone}`;
    byId("custom-design-link").href = `https://wa.me/${phone}?text=${encodeURIComponent("Hola GUMA, quiero un póster con mi propio diseño. Te envío mi foto o arte.")}`;
    const limaCopy = byId("delivery-lima-copy");
    if (limaCopy) limaCopy.textContent = `${data.delivery.lima.description} por ${money(data.delivery.lima.price)} fijo`;
    const limaOption = byId("delivery-lima-option");
    if (limaOption) limaOption.textContent = `Delivery en Lima · ${money(data.delivery.lima.price)} fijo`;
  }

  function cartLineTitle(line) {
    if (line.kind === "poster") {
      const format = formatsById.get(line.formatId);
      if (line.posterId) return `${customPostersById.get(line.posterId).title} · ${format.name}`;
      const category = categoriesById.get(line.categoryId);
      const designName = typeof category.names?.[line.number] === "string" ? category.names[line.number].trim() : "";
      return `${category.name} ${String(line.number).padStart(2, "0")}${designName ? ` · ${designName}` : ""} · ${format.name}`;
    }
    if (line.kind === "combo") return `Combo ${combosById.get(line.comboId).name}`;
    if (line.kind === "pack") {
      const format = formatsById.get(line.formatId);
      return `${format.name} · pack de ${format.packSize}`;
    }
    const extra = extrasById.get(line.extraId);
    return `${extra.name} · ${line.bundleQuantity} ${line.bundleQuantity === 1 ? "unidad" : "unidades"}`;
  }

  function cartLineDescription(line) {
    if (line.kind === "combo") return "Diseños por chat";
    if (line.kind === "pack") return "Los diseños se coordinan por chat";
    if (line.kind === "extra") return `${line.quantity} ${line.quantity === 1 ? "paquete" : "paquetes"} · ${money(extrasById.get(line.extraId).options.find((option) => option.quantity === line.bundleQuantity).price)} c/u`;
    return `${line.quantity} ${line.quantity === 1 ? "póster" : "pósters"}`;
  }

  function renderSavingNotices() {
    const container = byId("cart-saving-notices");
    container.replaceChildren();
    const posterTotals = posterQuantitiesByGroup();
    const notices = [];
    Object.entries(posterTotals).forEach(([group, quantity]) => {
      const tiers = data.discounts[group] || [];
      const format = data.formats.find((item) => item.discountGroup === group);
      const nextTier = tiers.find((tier) => quantity < tier.from);
      if (!format || !nextTier) return;
      const currentTier = [...tiers].reverse().find((tier) => quantity >= tier.from);
      const currentPrice = currentTier ? currentTier.price : format.price;
      if (nextTier.price >= currentPrice) return;
      notices.push(`Agrega ${nextTier.from - quantity} ${data.discountLabels[group]} más y pagas ${money(nextTier.price)} c/u (hoy ${money(currentPrice)})`);
    });
    notices.slice(0, 2).forEach((text) => container.append(element("p", "cart-saving-notice", text)));
  }

  function renderCart() {
    const linesContainer = byId("cart-lines");
    const isEmpty = cart.items.length === 0;
    byId("cart-empty").hidden = !isEmpty;
    byId("cart-checkout").hidden = false;
    linesContainer.replaceChildren();
    const itemCount = cart.items.reduce((sum, line) => sum + line.quantity, 0);
    byId("cart-count").textContent = itemCount;
    document.querySelectorAll(".cart-open").forEach((button) => {
      const existingTotal = button.querySelector(".cart-open-total");
      if (existingTotal) existingTotal.remove();
      if (!isEmpty) {
        const posterTotals = posterQuantitiesByGroup();
        const subtotal = cart.items.reduce((sum, line) => sum + cartLinePrice(line, posterTotals), 0);
        const total = element("span", "cart-open-total", `· ${money(subtotal)}`);
        button.append(total);
      }
    });
    const codeElement = byId("cart-order-code");
    codeElement.hidden = isEmpty || !cart.orderCode;
    codeElement.textContent = cart.orderCode ? `Código de pedido: ${cart.orderCode}` : "";
    byId("cart-new-order").hidden = isEmpty;
    byId("delivery-method").value = cart.delivery;
    byId("cart-total").textContent = money(totalCartPrice());
    storageStatus.textContent = storageWarning;
    const deliveryNote = byId("delivery-note");
    deliveryNote.textContent = cart.delivery === "shalom"
      ? "Envío por Shalom a todo el Perú. Costo y condiciones por WhatsApp."
      : cart.delivery === "lima"
        ? `El delivery en Lima suma ${money(data.delivery.lima.price)} al total referencial.`
        : cart.delivery === "coordinar"
          ? "Te confirmamos las opciones y el costo de entrega por WhatsApp."
        : "Selecciona la forma de entrega para continuar.";
    byId("total-note").textContent = cart.delivery === "coordinar"
      ? "El costo de entrega no está incluido en el total."
      : cart.delivery === "shalom"
        ? "Lo confirmamos por WhatsApp. El envío por Shalom no está incluido en el total."
        : "Lo confirmamos por WhatsApp.";

    const posterTotals = posterQuantitiesByGroup();
    cart.items.forEach((line) => {
      const row = element("article", "cart-line");
      const details = element("div", "cart-line-details");
      details.append(element("h3", "", cartLineTitle(line)), element("p", "", cartLineDescription(line)));
      details.append(element("div", "cart-line-price", money(cartLinePrice(line, posterTotals))));

      const controls = element("div", "cart-controls");
      const decrease = element("button", "", "−");
      decrease.type = "button";
      decrease.disabled = line.quantity <= 1;
      decrease.setAttribute("aria-label", `Reducir ${cartLineTitle(line)}`);
      decrease.addEventListener("click", () => changeLineQuantity(line.id, -1));
      const quantity = element("span", "quantity-value", String(line.quantity));
      quantity.setAttribute("aria-label", `Cantidad ${line.quantity}`);
      const increase = element("button", "", "+");
      increase.type = "button";
      increase.disabled = line.quantity >= 99;
      increase.setAttribute("aria-label", `Aumentar ${cartLineTitle(line)}`);
      increase.addEventListener("click", () => changeLineQuantity(line.id, 1));
      const remove = element("button", "remove-line", "Quitar");
      remove.type = "button";
      remove.setAttribute("aria-label", `Quitar ${cartLineTitle(line)} del pedido`);
      remove.addEventListener("click", () => removeLine(line.id));
      controls.append(decrease, quantity, increase, remove);
      row.append(details, controls);
      linesContainer.append(row);
    });
    renderSavingNotices();
    if (isEmpty) {
      byId("cart-order-code").hidden = true;
      byId("cart-new-order").hidden = true;
      byId("cart-saving-notices").replaceChildren();
    }
    updateOrderLink(isEmpty);
  }

  function updateOrderLink(isEmpty = cart.items.length === 0) {
    const link = byId("send-order");
    const enabled = !isEmpty && Boolean(cart.delivery);
    if (enabled) {
      link.href = `https://wa.me/${data.whatsapp}?text=${encodeURIComponent(orderMessage())}`;
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
      byId("checkout-status").textContent = "Revisa el resumen en WhatsApp y envía el mensaje para confirmar tu pedido";
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.tabIndex = 0;
      byId("checkout-status").textContent = "";
    }
  }

  function changeLineQuantity(id, amount) {
    const line = cart.items.find((item) => item.id === id);
    if (!line) return;
    line.quantity = Math.max(1, Math.min(99, line.quantity + amount));
    saveCart();
    renderCart();
  }

  function removeLine(id) {
    cart.items = cart.items.filter((line) => line.id !== id);
    if (!cart.items.length) cart.orderCode = "";
    saveCart();
    renderCart();
  }

  function orderMessage() {
    const posterTotals = posterQuantitiesByGroup();
    const lines = [
      "Hola GUMA, quiero hacer este pedido:",
      cart.orderCode ? `Pedido: ${cart.orderCode}` : "",
      `Nombre: ${cart.name.trim() || "No indicado"}`
    ].filter(Boolean);
    cart.items.forEach((line) => {
      const quantity = line.quantity;
      if (line.kind === "poster") {
        const format = formatsById.get(line.formatId);
        if (line.posterId) {
          const poster = customPostersById.get(line.posterId);
          lines.push(`• ${poster.title} · ${format.name} · x${quantity}`);
        } else {
          const category = categoriesById.get(line.categoryId);
          const designName = typeof category.names?.[line.number] === "string" ? category.names[line.number].trim() : "";
          lines.push(`• ${category.name} ${String(line.number).padStart(2, "0")}${designName ? ` · ${designName}` : ""} · ${format.name} · x${quantity}`);
        }
      } else if (line.kind === "combo") {
        lines.push(`• Combo ${combosById.get(line.comboId).name} · x${quantity} (diseños por chat)`);
      } else if (line.kind === "pack") {
        lines.push(`• ${cartLineTitle(line)} · x${quantity} (diseños por chat)`);
      } else {
        lines.push(`• ${extrasById.get(line.extraId).name} · ${line.bundleQuantity} ${line.bundleQuantity === 1 ? "unidad" : "unidades"} · x${quantity} paquete${quantity === 1 ? "" : "s"}`);
      }
    });

    if (cart.delivery === "lima") lines.push(`Entrega: ${data.delivery.lima.label} (${money(data.delivery.lima.price)})`);
    else if (cart.delivery === "shalom") lines.push("Entrega: Envío por Shalom a todo el Perú (costo por confirmar)");
    else if (cart.delivery === "coordinar") lines.push("Entrega: Lo coordinamos por WhatsApp");
    if (cart.notes.trim()) lines.push(`Notas: ${cart.notes.trim()}`);
    lines.push(`Total referencial: ${money(totalCartPrice(posterTotals))}`);
    if (cart.delivery === "shalom") lines.push("Envío por Shalom a todo el Perú. Costo y condiciones por WhatsApp.");
    return lines.join("\n");
  }

  updateHeaderHeight();
  window.addEventListener("resize", updateHeaderHeight);
  if ("ResizeObserver" in window && header) {
    const headerObserver = new ResizeObserver(updateHeaderHeight);
    headerObserver.observe(header);
  }
  if (document.fonts?.ready) document.fonts.ready.then(updateHeaderHeight);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href")?.slice(1);
      if (!id) return;
      event.preventDefault();
      history.replaceState(null, "", `#${id}`);
      scrollToSection(id);
    });
  });

  renderCategoryTabs();
  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeCategory = tab.dataset.filter;
      categoryTabs.forEach((item) => item.setAttribute("aria-pressed", String(item === tab)));
      renderDesigns(true);
    });
  });
  designSearch.addEventListener("input", () => renderDesigns(true));
  loadMoreButton.addEventListener("click", () => {
    visibleCount += pageSize;
    renderDesigns(false, true);
  });

  byId("add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formatId = byId("poster-format").value;
    const quantity = Number(byId("poster-quantity").value);
    if (!selectedDesign || !formatsById.has(formatId) || formatsById.get(formatId).pack || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      byId("selected-design").textContent = "Revisa el formato y la cantidad seleccionados.";
      return;
    }
    const { category, number, title } = selectedDesign;
    if (selectedDesign.id && selectedDesign.posterId) {
      addOrIncrement({ kind: "poster", id: `poster:${selectedDesign.posterId}:${formatId}`, posterId: selectedDesign.posterId, formatId, quantity }, title);
    } else if (selectedDesign.id && customPostersById.has(selectedDesign.id)) {
      addOrIncrement({ kind: "poster", id: `poster:${selectedDesign.id}:${formatId}`, posterId: selectedDesign.id, formatId, quantity }, title);
    } else {
      addOrIncrement({ kind: "poster", id: `poster:${category.id}:${number}:${formatId}`, categoryId: category.id, number, formatId, quantity }, title);
    }
    addDialog.close();
  });

  byId("add-dialog").querySelector(".add-close").addEventListener("click", () => addDialog.close());
  byId("cart-dialog").querySelector(".cart-close").addEventListener("click", () => cartDialog.close());
  document.querySelectorAll(".cart-open").forEach((button) => button.addEventListener("click", () => {
    renderCart();
    cartDialog.showModal();
    byId("cart-title").focus();
  }));
  byId("contact-order-button").addEventListener("click", (event) => {
    event.preventDefault();
    if (cart.items.length) {
      renderCart();
      cartDialog.showModal();
      byId("cart-title").focus();
    } else {
      scrollToSection("disenos");
    }
  });
  byId("cart-empty").querySelector("a").addEventListener("click", () => cartDialog.close());
  byId("cart-new-order").addEventListener("click", () => {
    if (!window.confirm("¿Vaciar tu pedido actual?")) return;
    cart.items = [];
    cart.orderCode = "";
    saveCart();
    renderCart();
  });
  byId("customer-name").addEventListener("input", (event) => {
    cart.name = event.target.value.slice(0, 80);
    saveCart();
    updateOrderLink();
  });
  byId("customer-notes").addEventListener("input", (event) => {
    cart.notes = event.target.value.slice(0, 300);
    saveCart();
    updateOrderLink();
  });
  byId("delivery-method").addEventListener("change", (event) => {
    cart.delivery = event.target.value;
    saveCart();
    renderCart();
  });
  byId("send-order").addEventListener("click", (event) => {
    if (byId("send-order").getAttribute("aria-disabled") !== "true") return;
    event.preventDefault();
    byId("checkout-status").textContent = cart.items.length
      ? "Elige una forma de entrega para continuar."
      : "Agrega al menos un producto antes de enviar el pedido.";
    if (cart.items.length) byId("delivery-method").focus();
  });
  byId("send-order").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || byId("send-order").getAttribute("aria-disabled") !== "true") return;
    event.preventDefault();
    byId("send-order").click();
  });
  byId("toast-open-cart").addEventListener("click", () => {
    window.clearTimeout(toastTimer);
    toast.hidden = true;
    renderCart();
    cartDialog.showModal();
    byId("cart-title").focus();
  });

  byId("image-viewer-close").addEventListener("click", closeViewer);
  function moveViewerDesign(step) {
    if (!viewerDesign) return;
    const matches = filteredDesigns();
    const currentIndex = matches.findIndex((item) => designKey(item) === designKey(viewerDesign));
    if (currentIndex < 0 || matches.length < 2) return;
    const nextIndex = (currentIndex + step + matches.length) % matches.length;
    const nextDesign = matches[nextIndex];
    const cardImage = designGrid.querySelectorAll(".design-image-button")[nextIndex];
    const image = { src: nextDesign.src, alt: `Póster ${nextDesign.title} · ${nextDesign.category.name}` };
    openViewer(cardImage || byId("image-viewer-img"), image, nextDesign);
  }
  byId("viewer-prev").addEventListener("click", () => moveViewerDesign(-1));
  byId("viewer-next").addEventListener("click", () => moveViewerDesign(1));
  byId("viewer-add").addEventListener("click", () => {
    if (!viewerDesign) return;
    closeViewer();
    openAddDialog(viewerDesign);
  });
  viewerDialog.addEventListener("keydown", (event) => {
    if (!viewerDesign) return;
    if (event.key === "ArrowLeft") moveViewerDesign(-1);
    if (event.key === "ArrowRight") moveViewerDesign(1);
  });
  const floatingWhatsApp = byId("floating-whatsapp");
  if (floatingWhatsApp) {
    floatingWhatsApp.href = `https://wa.me/${data.whatsapp}?text=${encodeURIComponent("Hola GUMA, tengo una consulta sobre los pósters.")}`;
  }
  byId("empty-custom-link")?.addEventListener("click", () => {
    cartDialog.open && cartDialog.close();
    scrollToSection("personalizado");
  });
  byId("design-custom-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToSection("personalizado");
  });
  viewerDialog.addEventListener("click", (event) => {
    if (event.target === viewerDialog) closeViewer();
  });
  viewerDialog.addEventListener("close", () => focusedViewerTrigger?.focus());
  [cartDialog, addDialog, viewerDialog].forEach((dialog) => {
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") dialog.close();
    });
  });
  loadCart();
  byId("customer-name").value = cart.name;
  byId("customer-notes").value = cart.notes;
  renderFormats();
  renderExtras();
  renderCombos();
  renderIdeas();
  renderContacts();
  renderDesigns();
  renderCart();
  if (window.location.hash) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToSection(window.location.hash.slice(1)));
    });
  }
  window.addEventListener("hashchange", () => {
    const id = window.location.hash.slice(1);
    if (id) scrollToSection(id);
  });
})();