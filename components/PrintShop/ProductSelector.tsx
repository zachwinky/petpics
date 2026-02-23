'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCart } from '@/lib/cart-context';
import { trackSelectProduct, trackAddToCart } from '@/components/MetaPixelEvents';

interface Product {
  id: number;
  product_type: string;
  display_name: string;
  size_label: string;
  printful_variant_id: number;
  price_cents: number;
  min_image_width_px: number;
  min_image_height_px: number;
  orientation?: string;
  options: Record<string, unknown>;
}

interface ProductSelectorProps {
  imageUrl: string;
  generationId: number;
  imageIndex: number;
}

const PRODUCT_TYPE_INFO: Record<string, { label: string; description: string }> = {
  canvas: { label: 'Canvas Print', description: 'Museum-quality stretched canvas' },
  framed_poster: { label: 'Framed Poster', description: 'Premium framed print' },
  poster: { label: 'Matte Poster', description: 'Enhanced matte paper' },
  mug: { label: 'Ceramic Mug', description: 'White glossy ceramic' },
};

const PRODUCT_TYPE_ORDER = ['canvas', 'framed_poster', 'poster', 'mug'];

// Max upscaled resolution from 1024px source with 4x upscale
const MAX_UPSCALED_PX = 4096;

function getQualityLabel(product: Product): { label: string; color: string } | null {
  const needed = Math.max(product.min_image_width_px, product.min_image_height_px);
  if (needed <= 0) return null;
  if (MAX_UPSCALED_PX >= needed) {
    return { label: 'Best quality', color: 'text-green-400' };
  }
  if (MAX_UPSCALED_PX >= needed * 0.75) {
    return { label: 'Good quality', color: 'text-yellow-400' };
  }
  return { label: 'May appear soft', color: 'text-orange-400' };
}

export default function ProductSelector({ imageUrl, generationId, imageIndex }: ProductSelectorProps) {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [frameColor, setFrameColor] = useState('black');
  const [addedToCart, setAddedToCart] = useState(false);

  // Fetch products from API
  useEffect(() => {
    fetch('/api/print/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Group products by type
  const productsByType = PRODUCT_TYPE_ORDER.reduce<Record<string, Product[]>>((acc, type) => {
    acc[type] = products.filter(p => p.product_type === type);
    return acc;
  }, {});

  // Get cheapest price for each product type
  const startingPrices = Object.entries(productsByType).reduce<Record<string, number>>((acc, [type, prods]) => {
    if (prods.length > 0) {
      acc[type] = Math.min(...prods.map(p => p.price_cents));
    }
    return acc;
  }, {});

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type);
    const typeProducts = productsByType[type];
    if (typeProducts?.length > 0) {
      setSelectedProduct(typeProducts[0]);
    }
    setAddedToCart(false);
    const startPrice = startingPrices[type];
    if (startPrice) trackSelectProduct(type, startPrice);
  }, [productsByType, startingPrices]);

  const handleSelectSize = useCallback((product: Product) => {
    setSelectedProduct(product);
    setAddedToCart(false);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

    const options: Record<string, string> = {};
    let variantId = selectedProduct.printful_variant_id;

    // Resolve correct Printful variant ID for framed posters by frame color
    if (selectedProduct.product_type === 'framed_poster') {
      options.frameColor = frameColor;
      const variantMap = selectedProduct.options?.variant_ids_by_color as Record<string, number> | undefined;
      if (variantMap && variantMap[frameColor]) {
        variantId = variantMap[frameColor];
      }
    }

    addItem({
      imageUrl,
      generationId,
      imageIndex,
      productType: selectedProduct.product_type,
      productId: selectedProduct.id,
      sizeLabel: selectedProduct.size_label,
      displayName: selectedProduct.display_name,
      variantId,
      priceCents: selectedProduct.price_cents,
      options,
    });

    setAddedToCart(true);
    trackAddToCart(selectedProduct.product_type, selectedProduct.price_cents);
  }, [selectedProduct, frameColor, imageUrl, generationId, imageIndex, addItem]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold">Choose Your Product</h1>
          <a href="/print/cart" className="text-sm text-white/60 hover:text-white transition-colors">
            View Cart →
          </a>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Image preview with CSS mockup */}
          <div className="flex items-start justify-center">
            <div className="relative max-w-sm w-full">
              {selectedType === 'canvas' && selectedProduct && (
                <div className="bg-white p-3 rounded shadow-2xl">
                  <img src={imageUrl} alt="Portrait preview" className="w-full aspect-square object-cover" />
                </div>
              )}
              {selectedType === 'framed_poster' && selectedProduct && (
                <div className={`p-4 rounded shadow-2xl ${
                  frameColor === 'black' ? 'bg-gray-900' :
                  frameColor === 'white' ? 'bg-white' :
                  'bg-amber-100'
                }`}>
                  <div className="bg-white p-1">
                    <img src={imageUrl} alt="Portrait preview" className="w-full aspect-[3/4] object-cover" />
                  </div>
                </div>
              )}
              {selectedType === 'poster' && selectedProduct && (
                <div className="shadow-2xl">
                  <img src={imageUrl} alt="Portrait preview" className="w-full aspect-[3/4] object-cover rounded" />
                </div>
              )}
              {selectedType === 'mug' && selectedProduct && (
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-36 bg-white rounded-lg shadow-2xl flex items-center justify-center overflow-hidden">
                    <img src={imageUrl} alt="Portrait preview" className="w-24 h-24 object-cover rounded" />
                  </div>
                </div>
              )}
              {!selectedType && (
                <div className="bg-white/5 rounded-xl p-2">
                  <img src={imageUrl} alt="Your portrait" className="w-full aspect-square object-cover rounded-lg" />
                </div>
              )}
            </div>
          </div>

          {/* Right: Product selection */}
          <div>
            {/* Product type cards */}
            {!selectedType && (
              <div className="grid grid-cols-2 gap-3">
                {PRODUCT_TYPE_ORDER.filter(type => productsByType[type]?.length > 0).map(type => {
                  const info = PRODUCT_TYPE_INFO[type];
                  const startPrice = startingPrices[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleSelectType(type)}
                      className="p-4 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="text-base font-semibold mb-1">{info.label}</div>
                      <div className="text-xs text-white/50 mb-3">{info.description}</div>
                      <div className="text-sm text-white/80">
                        From ${(startPrice / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-white/30 mt-1">+ shipping</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Size selector (when type is selected) */}
            {selectedType && (
              <div>
                <button
                  onClick={() => { setSelectedType(null); setSelectedProduct(null); setAddedToCart(false); }}
                  className="text-sm text-white/40 hover:text-white/60 mb-4 flex items-center gap-1"
                >
                  ← Back to products
                </button>

                <h2 className="text-lg font-semibold mb-4">
                  {PRODUCT_TYPE_INFO[selectedType]?.label} — Select Size
                </h2>

                <div className="space-y-2 mb-6">
                  {productsByType[selectedType]?.map(product => {
                    const quality = getQualityLabel(product);
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelectSize(product)}
                        className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                          selectedProduct?.id === product.id
                            ? 'border-white bg-white/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{product.size_label}</span>
                          {quality && (
                            <span className={`text-xs ml-2 ${quality.color}`}>{quality.label}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-white/80">${(product.price_cents / 100).toFixed(2)}</span>
                          <span className="text-white/30 text-xs ml-1">+ shipping</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Frame color selector (framed poster only) */}
                {selectedType === 'framed_poster' && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white/60 mb-2">Frame Color</h3>
                    <div className="flex gap-3">
                      {['black', 'white', 'natural'].map(color => (
                        <button
                          key={color}
                          onClick={() => { setFrameColor(color); setAddedToCart(false); }}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            frameColor === color ? 'border-white scale-110' : 'border-white/20'
                          } ${
                            color === 'black' ? 'bg-gray-900' :
                            color === 'white' ? 'bg-white' :
                            'bg-amber-100'
                          }`}
                          title={color.charAt(0).toUpperCase() + color.slice(1)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Price and Add to Cart */}
                {selectedProduct && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/60">Price</span>
                      <span className="text-2xl font-bold">${(selectedProduct.price_cents / 100).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-white/40 mb-4">
                      + shipping, calculated at checkout
                    </div>

                    {addedToCart ? (
                      <div className="space-y-2">
                        <div className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-center">
                          Added to Cart
                        </div>
                        <a
                          href="/print/cart"
                          className="block w-full py-3 rounded-xl bg-white text-black font-semibold text-center hover:bg-white/90 transition-colors"
                        >
                          View Cart →
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={handleAddToCart}
                        className="w-full py-4 rounded-xl bg-white text-black font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trust / shipping info */}
        <div className="mt-10 text-center text-xs text-white/30 space-y-1">
          <p>Ships directly to you from our US print facility</p>
          <p>Premium quality printing &middot; Satisfaction guaranteed</p>
        </div>
      </div>
    </div>
  );
}
