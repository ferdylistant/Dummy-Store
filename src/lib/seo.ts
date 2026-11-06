import { FREE_SHIPPING_MIN, RETURN_DAYS, SHIPPING_OPTIONS } from '@/lib/pricing'
import { absoluteUrl, siteConfig } from '@/lib/site'
import type { Category, Product } from '@/types/catalog'

/**
 * A page that sets openGraph replaces the parent object, so it must name the
 * shared image itself. Product pages have their own image file instead.
 */
export const SHARE_IMAGE = { url: '/opengraph-image', width: 1200, height: 630 }

export interface BreadcrumbItem {
  label: string
  href: string
}

export function isProductInStock(product: Product) {
  const total = product.colors.length * product.sizes.length
  return (product.soldOut?.length ?? 0) < total
}

export function productImageUrl(product: Product) {
  return product.image
    ? absoluteUrl(product.image)
    : absoluteUrl(`/produk/${product.slug}/opengraph-image`)
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: siteConfig.name,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/icon.svg'),
    email: siteConfig.email,
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: siteConfig.name,
    url: absoluteUrl('/'),
    inLanguage: 'id-ID',
    publisher: { '@id': absoluteUrl('/#organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/produk')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  }
}

export function productJsonLd(product: Product, category?: Category) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.id,
    image: [productImageUrl(product)],
    material: product.material,
    color: product.colors.map((color) => color.name).join(', '),
    category: category?.name,
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/produk/${product.slug}`),
      priceCurrency: 'IDR',
      price: product.price,
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      itemCondition: 'https://schema.org/NewCondition',
      availability: isProductInStock(product)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@id': absoluteUrl('/#organization') },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: product.price >= FREE_SHIPPING_MIN ? 0 : SHIPPING_OPTIONS.reguler.cost,
          currency: 'IDR',
        },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ID' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'ID',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: RETURN_DAYS,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  }
}

export function itemListJsonLd(products: Product[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/produk/${product.slug}`),
      name: product.name,
    })),
  }
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
