import React, { useMemo, useState } from 'react';
import { ArrowLeft, Headset, RotateCcw, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { WpProductCard } from './WpProductCard';
import { useReveal } from './useReveal';
import { getImageUrl } from '@/utils/image-helper';

export interface WpProductsData {
  products: any[];
  categories: any[];
}

const SectionHead: React.FC<{ title?: string; subtitle?: string; alignStart?: boolean }> = ({
  title,
  subtitle,
  alignStart,
}) => {
  if (!title && !subtitle) return null;
  return (
    <div className={`wpt-section__head ${alignStart ? 'wpt-section__head--start' : ''}`}>
      {title && <h2>{title}</h2>}
      <div className="wpt-hr" />
      {subtitle && <p style={{ marginTop: 10 }}>{subtitle}</p>}
    </div>
  );
};

const filterByCategory = (products: any[], categorySlug?: string) =>
  categorySlug ? products.filter((p) => p.categoryId === categorySlug) : products;

/* ------------------------------------------------------ hot-products */
export const WpHotProducts: React.FC<WpProductsData & { title: string }> = ({ products, title }) => {
  const ref = useReveal([products]);
  const list = products.slice(0, 8);
  return (
    <section className="wpt-section" id="wpt-products" ref={ref}>
      <div className="wpt-container">
        <SectionHead title={title} />
        {list.length ? (
          <div className="wpt-grid">
            {list.map((p, i) => (
              <WpProductCard key={p.id} product={p} addToCartLabel="أضف إلى السلة" revealClass={i % 2 ? 'wow-zoomIn' : ''} />
            ))}
          </div>
        ) : (
          <div className="wpt-empty">
            <b>لا توجد منتجات بعد</b>
            أضف منتجاتك من لوحة التحكم وستظهر هنا فوراً.
          </div>
        )}
      </div>
    </section>
  );
};

/* --------------------------------------------------------- shop grid */
export const WpShopGrid: React.FC<WpProductsData & { title: string }> = ({ products, title }) => (
  <WpHotProducts products={products} categories={[]} title={title} />
);

/* ------------------------------------------------------ tab-products */
export const WpTabbedProducts: React.FC<
  WpProductsData & { title: string }
> = ({ products, categories, title }) => {
  const [active, setActive] = useState<string>('all');
  const ref = useReveal([active]);

  const tabs = useMemo(
    () => [{ slug: 'all', name: 'الكل' }, ...categories.map((c) => ({ slug: c.slug ?? c.id, name: c.name }))],
    [categories]
  );

  const list = useMemo(
    () => (active === 'all' ? products : products.filter((p) => String(p.categoryId) === active || p.categorySlug === active)).slice(0, 8),
    [products, active]
  );

  return (
    <section className="wpt-section" id="wpt-products" ref={ref}>
      <div className="wpt-container">
        <SectionHead title={title} />
        <div className="wpt-tabs" style={{ marginBottom: 30 }}>
          {tabs.map((tab) => (
            <button
              key={String(tab.slug)}
              type="button"
              className={`wpt-tab ${active === tab.slug ? 'is-active' : ''}`}
              onClick={() => setActive(String(tab.slug))}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="wpt-grid">
          {list.map((p) => (
            <WpProductCard key={p.id} product={p} addToCartLabel="أضف إلى السلة" />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------ deal-of-day */
export const WpDealOfDay: React.FC<
  WpProductsData & { title: string }
> = ({ products, title }) => {
  const deal = products.find((p) => Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price)) || products[0];
  if (!deal) return null;

  const price = Number(deal.price) || 0;
  const sale = Number(deal.sale_price) || 0;
  const hasSale = sale > 0 && sale < price;

  return (
    <section className="wpt-section" ref={useReveal([deal])}>
      <div className="wpt-container">
        <SectionHead title={title} />
        <div className="wpt-deal wpt-reveal wow-fadeInRight">
          <div className="wpt-deal__media">
            <img src={getImageUrl(deal.image)} alt={deal.name} loading="lazy" />
          </div>
          <div className="wpt-deal__body">
            <span className="wpt-deal__badge">عرض اليوم فقط</span>
            <h3>{deal.name}</h3>
            <p style={{ color: 'var(--twc-text-secondary)', lineHeight: 1.9 }}>
              كمية محدودة بسعر لا يُقاوم — اطلب الآن قبل نهاية العرض.
            </p>
            <div className="wpt-deal__price">
              {hasSale && <del>{price}</del>}
              <ins>{hasSale ? sale : price} ر.س</ins>
            </div>
            <a href="#wpt-products" className="wpt-btn no-underline">
              اغتنم العرض
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------- testimonial */
const DEFAULT_REVIEWS = [
  { name: 'أحمد الغامدي', stars: 5, text: 'تجربة تسوق ممتازة، المنتج وصل بسرعة وجودة أفضل من المتوقع.' },
  { name: 'منى العتيبي', rating: undefined as unknown, stars: 5, text: 'خدمة العملاء متعاونة جداً وطلب عبر واتساب كان سهلاً وسريعاً.' },
  { name: 'خالد الشمري', stars: 4, text: 'أسعار منافسة وتغليف ممتاز. سأكرر الطلب بالتأكيد.' },
];

export const WpTestimonial: React.FC<{ title: string }> = ({ title }) => {
  const ref = useReveal([]);
  return (
    <section className="wpt-section" ref={ref}>
      <div className="wpt-container">
        <SectionHead title={title} />
        <div className="wpt-grid">
          {DEFAULT_REVIEWS.map((r) => (
            <div key={r.name} className="wpt-testimonial wpt-reveal wow-zoomIn">
              <div className="wpt-testimonial__stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
              <p className="wpt-testimonial__text">{r.text}</p>
              <div className="wpt-testimonial__name">{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------- categories box */
export const WpCategoriesBox: React.FC<
  WpProductsData & { title: string; circle?: boolean }
> = ({ categories, title, circle }) => {
  const ref = useReveal([categories]);
  if (!categories.length) return null;
  return (
    <section className="wpt-section" id="wpt-categories" ref={ref}>
      <div className="wpt-container">
        <SectionHead title={title} />
        <div className="wpt-cats-box">
          {circle ? (
            <div className="wpt-cats-circle">
              {categories.slice(0, 6).map((c) => (
                <a key={c.id} href="#wpt-products" className="wpt-circle no-underline wpt-reveal">
                  <img src={getImageUrl(c.image)} alt={c.name} loading="lazy" />
                  <span>{c.name}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="wpt-cats-grid">
              {categories.slice(0, 8).map((c) => (
                <a key={c.id} href="#wpt-products" className="wpt-cat-card no-underline wpt-reveal">
                  <img src={getImageUrl(c.image)} alt={c.name} loading="lazy" />
                  <span>{c.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------- featured carousel */
export const WpFeaturedCarousel: React.FC<WpProductsData & { title: string }> = ({ products, title }) => {
  const ref = useReveal([products]);
  const list = products.slice(0, 8);
  if (!list.length) return null;
  return (
    <section className="wpt-section" ref={ref}>
      <div className="wpt-container">
        <div className="wpt-row-between">
          <h2 style={{ fontSize: 'clamp(22px,2.6vw,30px)', fontWeight: 900, margin: 0 }}>{title}</h2>
          <a href="#wpt-products" className="no-underline inline-flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--twc-primary)' }}>
            عرض الكل
            <ArrowLeft size={15} />
          </a>
        </div>
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(230px, 1fr)',
            gap: 22,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: 12,
          }}
        >
          {list.map((p) => (
            <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
              <WpProductCard product={p} addToCartLabel="أضف إلى السلة" revealClass="" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ----------------------------------------------------------- services */
const SERVICES = [
  { icon: Truck, title: 'توصيل سريع', text: 'لجميع المناطق' },
  { icon: ShieldCheck, title: 'ضمان الجودة', text: 'منتجات أصلية 100%' },
  { icon: Wallet, title: 'دفع آمن', text: 'عند الاستلام أو إلكتروني' },
  { icon: Headset, title: 'دعم فوري', text: 'نرد عليك خلال دقائق' },
];

export const WpServices: React.FC = () => {
  const ref = useReveal([]);
  return (
    <section className="wpt-section" style={{ paddingBlock: '28px' }} ref={ref}>
      <div className="wpt-container">
        <div className="wpt-services">
          {SERVICES.map(({ icon: Icon, ...s }) => (
            <div key={s.title} className="wpt-service wpt-reveal">
              <span className="wpt-service__icon">
                <Icon size={22} />
              </span>
              <div>
                <b>{s.title}</b>
                <small>{s.text}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------ contact strip */
export const WpContactStrip: React.FC<{
  title: string;
  subtitle?: string;
  whatsappHref?: string;
}> = ({ title, subtitle, whatsappHref }) => {
  const ref = useReveal([]);
  return (
    <section className="wpt-section" style={{ paddingBlock: '36px' }} ref={ref}>
      <div className="wpt-container">
        <div className="wpt-contact-strip wpt-reveal">
          <div>
            <h3>{title}</h3>
            <p>{subtitle || 'اطلب مباشرة عبر واتساب أو تصفح المنتجات واختر ما يناسبك.'}</p>
          </div>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="wpt-btn no-underline">
              تواصل عبر واتساب
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
