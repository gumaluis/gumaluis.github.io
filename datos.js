window.GUMA_DATA = {
  whatsapp: "51976201407",
  homePhotos: [
    { src: "imagenes/sample1.jpg", alt: "Póster de Los Outsiders en una pared" },
    { src: "imagenes/sample2.jpg", alt: "Póster de Ficticio en una pared" },
    { src: "imagenes/sample3.jpg", alt: "Póster de Los Outsiders Awa Dura en una pared" },
    { src: "imagenes/sample4.jpg", alt: "Pósteres de anime y música en una pared" }
  ],
  contacts: [
    { name: "Instagram", handle: "@guma.pe", url: "https://instagram.com/guma.pe" },
    { name: "TikTok", handle: "@gumaluis_", url: "https://www.tiktok.com/@gumaluis_" }
  ],
  categories: [
    { id: "anime", name: "Anime", prefix: "anime", total: 9 },
    { id: "cine", name: "Cine", prefix: "pelicula", total: 9 },
    { id: "rock", name: "Rock", prefix: "banda", total: 9 },
    { id: "kpop", name: "K-pop", prefix: "kpop", total: 9 }
  ],
  formats: [
    { id: "super-a3", name: "Super A3", measure: "33 × 48 cm", price: 1200, image: "super-a3.jpg", ratio: "33 / 48", visualHeight: 146, discountGroup: "super-a3" },
    { id: "a3", name: "A3", measure: "29 × 42 cm", price: 1000, image: "a3.jpg", ratio: "29 / 42", visualHeight: 128, discountGroup: "a3" },
    { id: "a4", name: "A4", measure: "21 × 29 cm", price: 600, image: "a4.jpg", ratio: "21 / 29", visualHeight: 90, discountGroup: "a4" },
    { id: "a5", name: "A5", measure: "14.8 × 21 cm", price: 350, image: "a5.jpg", ratio: "14.8 / 21", visualHeight: 63 },
    { id: "especial-1", name: "Especial 1", measure: "30 × 30 cm", price: 800, image: "especial-1.jpg", ratio: "1", visualHeight: 100, discountGroup: "especial" },
    { id: "especial-2", name: "Especial 2", measure: "20 × 20 cm", price: 500, image: "especial-2.jpg", ratio: "1", visualHeight: 67, discountGroup: "especial" },
    { id: "polaroid", name: "Polaroid", measure: "7 × 10 cm · pack de 8", price: 800, image: "polaroid.jpg", ratio: "7 / 10", visualHeight: 42, pack: true, packSize: 8 },
    { id: "photocard", name: "Photocard", measure: "5.5 × 8.5 cm · pack de 9", price: 1200, image: "photocard.jpg", ratio: "5.5 / 8.5", visualHeight: 34, pack: true, packSize: 9 }
  ],
  discounts: {
    "super-a3": [{ from: 3, price: 1150 }, { from: 5, price: 1100 }, { from: 10, price: 1000 }],
    a3: [{ from: 3, price: 950 }, { from: 5, price: 900 }, { from: 10, price: 800 }],
    a4: [{ from: 3, price: 550 }, { from: 5, price: 500 }, { from: 10, price: 400 }],
    especial: [{ from: 3, price: 850 }, { from: 5, price: 800 }, { from: 10, price: 700 }]
  },
  discountLabels: {
    "super-a3": "Super A3",
    a3: "A3",
    a4: "A4",
    especial: "Especial (1 y 2)"
  },
  combos: [
    {
      id: "basico",
      name: "Básico",
      regularPrice: 3900,
      price: 3500,
      contents: [
        { format: "a3", quantity: 1 }, { format: "a4", quantity: 1 }, { format: "a5", quantity: 2 },
        { format: "polaroid", quantity: 4 }, { format: "photocard", quantity: 9 }
      ]
    },
    {
      id: "mix-a3",
      name: "Mix A3",
      regularPrice: 6400,
      price: 5200,
      contents: [
        { format: "super-a3", quantity: 1 }, { format: "a3", quantity: 1 }, { format: "a4", quantity: 2 },
        { format: "a5", quantity: 4 }, { format: "polaroid", quantity: 4 }, { format: "photocard", quantity: 9 }
      ]
    },
    {
      id: "especial",
      name: "Especial",
      regularPrice: 6000,
      price: 4800,
      contents: [
        { format: "especial-1", quantity: 1 }, { format: "especial-2", quantity: 2 }, { format: "a4", quantity: 2 },
        { format: "a5", quantity: 4 }, { format: "polaroid", quantity: 4 }, { format: "photocard", quantity: 9 }
      ]
    },
    {
      id: "medium",
      name: "Medium",
      regularPrice: 9100,
      price: 7200,
      contents: [
        { format: "a3", quantity: 2 }, { format: "a4", quantity: 3 }, { format: "a5", quantity: 6 },
        { format: "polaroid", quantity: 8 }, { format: "photocard", quantity: 18 }
      ]
    },
    {
      id: "elite",
      name: "Elite",
      regularPrice: 10800,
      price: 9100,
      contents: [
        { format: "super-a3", quantity: 1 }, { format: "a3", quantity: 2 }, { format: "a4", quantity: 2 },
        { format: "especial-1", quantity: 1 }, { format: "especial-2", quantity: 2 }, { format: "a5", quantity: 4 },
        { format: "polaroid", quantity: 8 }, { format: "photocard", quantity: 18 }
      ]
    },
    {
      id: "premium",
      name: "Premium",
      regularPrice: 13400,
      price: 10900,
      contents: [
        { format: "super-a3", quantity: 1 }, { format: "a3", quantity: 2 }, { format: "a4", quantity: 4 },
        { format: "a5", quantity: 8 }, { format: "especial-1", quantity: 1 }, { format: "especial-2", quantity: 2 },
        { format: "polaroid", quantity: 8 }, { format: "photocard", quantity: 18 }
      ]
    }
  ],
  extras: [
    { id: "luces", name: "Luces cálidas", options: [{ quantity: 1, price: 1000 }, { quantity: 3, price: 2800 }, { quantity: 6, price: 5500 }] },
    { id: "plantas", name: "Plantas decorativas", options: [{ quantity: 1, price: 1200 }, { quantity: 3, price: 3400 }, { quantity: 6, price: 6800 }] }
  ],
  delivery: {
    lima: { id: "lima", label: "Delivery en Lima", description: "Delivery a toda Lima", price: 1000 },
    shalom: { id: "shalom", label: "Envío por Shalom", price: null }
  }
};