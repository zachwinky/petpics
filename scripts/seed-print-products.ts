import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// Real Printful variant IDs from API. Pricing: product price only (shipping charged separately).
// Printful product IDs: Canvas=3, Framed Poster=2, Matte Poster=1, White Glossy Mug=19
const PRODUCTS = [
  // Canvas prints (Printful product ID: 3)
  {
    product_type: 'canvas',
    display_name: 'Canvas Print 10×10"',
    size_label: '10x10',
    printful_variant_id: 19296, // Printful cost: $16.83
    price_cents: 3499,
    min_image_width_px: 3000,
    min_image_height_px: 3000,
    orientation: 'square',
    options: JSON.stringify({}),
    sort_order: 1,
  },
  {
    product_type: 'canvas',
    display_name: 'Canvas Print 12×16"',
    size_label: '12x16',
    printful_variant_id: 5, // Printful cost: $23.41
    price_cents: 4999,
    min_image_width_px: 3600,
    min_image_height_px: 4800,
    orientation: 'portrait',
    options: JSON.stringify({}),
    sort_order: 2,
  },
  {
    product_type: 'canvas',
    display_name: 'Canvas Print 16×20"',
    size_label: '16x20',
    printful_variant_id: 6, // Printful cost: $28.56
    price_cents: 5999,
    min_image_width_px: 4800,
    min_image_height_px: 6000,
    orientation: 'portrait',
    options: JSON.stringify({}),
    sort_order: 3,
  },
  {
    product_type: 'canvas',
    display_name: 'Canvas Print 24×36"',
    size_label: '24x36',
    printful_variant_id: 825, // Printful cost: $52.02
    price_cents: 7999,
    min_image_width_px: 7200,
    min_image_height_px: 10800,
    orientation: 'portrait',
    options: JSON.stringify({}),
    sort_order: 4,
  },

  // Framed posters (Printful product ID: 2)
  // Default variant is Black frame; variant_ids_by_color maps frame color → variant
  {
    product_type: 'framed_poster',
    display_name: 'Framed Poster 12×16"',
    size_label: '12x16',
    printful_variant_id: 1350, // Black frame, Printful cost: $31.57
    price_cents: 5499,
    min_image_width_px: 3600,
    min_image_height_px: 4800,
    orientation: 'portrait',
    options: JSON.stringify({
      frame_colors: ['black', 'white', 'natural'],
      variant_ids_by_color: { black: 1350, white: 10751, natural: 15025 },
    }),
    sort_order: 10,
  },
  {
    product_type: 'framed_poster',
    display_name: 'Framed Poster 16×20"',
    size_label: '16x20',
    printful_variant_id: 4399, // Black frame, Printful cost: $41.77
    price_cents: 6999,
    min_image_width_px: 4800,
    min_image_height_px: 6000,
    orientation: 'portrait',
    options: JSON.stringify({
      frame_colors: ['black', 'white', 'natural'],
      variant_ids_by_color: { black: 4399, white: 10753, natural: 15029 },
    }),
    sort_order: 11,
  },
  {
    product_type: 'framed_poster',
    display_name: 'Framed Poster 24×36"',
    size_label: '24x36',
    printful_variant_id: 4, // Black frame, Printful cost: $74.41
    price_cents: 8999,
    min_image_width_px: 7200,
    min_image_height_px: 10800,
    orientation: 'portrait',
    options: JSON.stringify({
      frame_colors: ['black', 'white', 'natural'],
      variant_ids_by_color: { black: 4, white: 10750, natural: 15032 },
    }),
    sort_order: 12,
  },

  // Matte posters (Printful product ID: 1)
  {
    product_type: 'poster',
    display_name: 'Matte Poster 12×16"',
    size_label: '12x16',
    printful_variant_id: 1349, // Printful cost: $10.89
    price_cents: 2499,
    min_image_width_px: 3600,
    min_image_height_px: 4800,
    orientation: 'portrait',
    options: JSON.stringify({}),
    sort_order: 20,
  },
  {
    product_type: 'poster',
    display_name: 'Matte Poster 16×20"',
    size_label: '16x20',
    printful_variant_id: 3877, // Printful cost: $11.89
    price_cents: 3499,
    min_image_width_px: 4800,
    min_image_height_px: 6000,
    orientation: 'portrait',
    options: JSON.stringify({}),
    sort_order: 21,
  },
  {
    product_type: 'poster',
    display_name: 'Matte Poster 24×36"',
    size_label: '24x36',
    printful_variant_id: 2, // Printful cost: $17.89
    price_cents: 4999,
    min_image_width_px: 7200,
    min_image_height_px: 10800,
    orientation: 'portrait',
    options: JSON.stringify({}),
    sort_order: 22,
  },

  // White Glossy Mugs (Printful product ID: 19)
  {
    product_type: 'mug',
    display_name: 'Ceramic Mug 11oz',
    size_label: '11oz',
    printful_variant_id: 1320, // Printful cost: $5.95
    price_cents: 2499,
    min_image_width_px: 2400,
    min_image_height_px: 1000,
    orientation: 'any',
    options: JSON.stringify({}),
    sort_order: 30,
  },
  {
    product_type: 'mug',
    display_name: 'Ceramic Mug 15oz',
    size_label: '15oz',
    printful_variant_id: 4830, // Printful cost: $7.95
    price_cents: 2999,
    min_image_width_px: 2700,
    min_image_height_px: 1100,
    orientation: 'any',
    options: JSON.stringify({}),
    sort_order: 31,
  },
];

async function seed() {
  try {
    // Clear existing products first
    await pool.query('DELETE FROM print_products');
    console.log('Cleared existing print products');

    for (const product of PRODUCTS) {
      await pool.query(
        `INSERT INTO print_products (
          product_type, display_name, size_label, printful_variant_id,
          price_cents, min_image_width_px, min_image_height_px,
          orientation, options, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          product.product_type,
          product.display_name,
          product.size_label,
          product.printful_variant_id,
          product.price_cents,
          product.min_image_width_px,
          product.min_image_height_px,
          product.orientation,
          product.options,
          product.sort_order,
        ]
      );
      console.log(`Seeded: ${product.display_name}`);
    }

    console.log(`\nSuccessfully seeded ${PRODUCTS.length} print products`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();
