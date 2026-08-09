import { toast } from '@/components/custom-toast';
import { useStorefrontCore } from '@/templates/storefront';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { MessageCircle, Minus, PackageX, Plus, ShoppingCart, Star, StarHalf } from 'lucide-react';
import { useState } from 'react';

/**
 * Shared design primitives for the dedicated template pages.
 * Interaction logic (cart, product detail, whatsapp, currency) lives here once;
 * each template page composes these blocks into its own unique layout.
 */

export function getVar(name: string, fallback: string): string {
    if (typeof window !== 'undefined') {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name);
        return value?.trim() || fallback;
    }
    return fallback;
}

export const primary = () => getVar('--twc-primary-500', '#10b77f');
export const primaryDark = () => getVar('--twc-primary-600', '#059669');
export const textPrimary = () => getVar('--twc-text-primary', '#111827');
export const textMuted = () => getVar('--twc-text-muted', '#6b7280');
export const pageBg = () => getVar('--twc-background', '#ffffff');
export const surface = () => getVar('--twc-surface', '#f9fafb');
export const headingWeight = () => getVar('--twf-heading-weight', '700');
export const headingFont = () => getVar('--twf-font-family', "'Tajawal', sans-serif");

interface ProductLike {
    id: string | number;
    name: string;
    price: number;
    originalPrice?: number;
    image?: string;
    description?: string;
    category?: string;
    availability?: string;
    stockQuantity?: number;
}

/* ------------------------------ Images ------------------------------ */

export function ProductImage({ product, className = '', imgClassName = '' }: { product: ProductLike; className?: string; imgClassName?: string }) {
    const [broken, setBroken] = useState(false);
    const src = getImageUrl(product.image || '');
    if (!src || broken) {
        return (
            <div
                className={`flex items-center justify-center ${className}`}
                style={{ background: 'linear-gradient(135deg, var(--twc-surface,#eef2f7), var(--twc-surface,#e2e8f0))' }}
            >
                <span className="text-4xl opacity-40" style={{ color: 'var(--twc-text-muted,#94a3b8)' }}>
                    {product.name?.charAt(0) || '؟'}
                </span>
            </div>
        );
    }
    return (
        <div className={`overflow-hidden ${className}`}>
            <img
                src={src}
                alt={product.name}
                loading="lazy"
                onError={() => setBroken(true)}
                className={`h-full w-full object-cover ${imgClassName}`}
            />
        </div>
    );
}

/* ------------------------------ Prices ------------------------------ */

export function PriceTag({ product, className = '', large = false }: { product: ProductLike; className?: string; large?: boolean }) {
    const hasSale = product.originalPrice && Number(product.originalPrice) > Number(product.price);
    return (
        <div className={`flex items-baseline gap-2 ${className}`}>
            <span className={large ? 'text-xl font-extrabold' : 'text-sm font-bold'} style={{ color: 'var(--twc-primary-600,#059669)' }}>
                {formatStoreCurrency(Number(product.price) || 0)}
            </span>
            {hasSale && (
                <span className={`line-through opacity-50 ${large ? 'text-sm' : 'text-xs'}`} style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                    {formatStoreCurrency(Number(product.originalPrice) || 0)}
                </span>
            )}
        </div>
    );
}

/* ------------------------------ Ratings ------------------------------ */

export function RatingStars({ rating = 4.5, className = '' }: { rating?: number; className?: string }) {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    return (
        <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${rating} من 5`}>
            {Array.from({ length: 5 }).map((_, i) => {
                if (i < full) return <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />;
                if (i === full && hasHalf) return <StarHalf key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />;
                return <Star key={i} className="h-3.5 w-3.5 text-gray-300" />;
            })}
        </div>
    );
}

/* ------------------------------ Cart actions ------------------------------ */

export function AddToCartButton({
    product,
    className = '',
    label = 'أضف للسلة',
    icon = true,
}: {
    product: ProductLike;
    className?: string;
    label?: string;
    icon?: boolean;
}) {
    const { cart } = useStorefrontCore();
    const handleAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await cart.addToCart(product);
        toast.success('تمت الإضافة إلى السلة ✓');
    };
    return (
        <button
            type="button"
            onClick={handleAdd}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95 ${className}`}
            style={{ background: 'var(--twc-primary-500,#10b77f)' }}
        >
            {icon && <ShoppingCart className="h-4 w-4" />}
            {label}
        </button>
    );
}

export function QuantityPicker({ product, className = '', compact = false }: { product: ProductLike; className?: string; compact?: boolean }) {
    const { cart } = useStorefrontCore();
    const [qty, setQty] = useState(1);
    const handleAdd = async () => {
        await cart.addToCart({ ...product, quantity: qty });
        toast.success('تمت الإضافة إلى السلة ✓');
    };
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex items-center overflow-hidden rounded-full border" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <button
                    type="button"
                    aria-label="زيادة"
                    onClick={() => setQty((q) => q + 1)}
                    className={`flex items-center justify-center text-gray-600 hover:bg-gray-100 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
                >
                    <Plus className="h-4 w-4" />
                </button>
                <span
                    className={`w-8 text-center text-sm font-bold ${compact ? 'h-8 leading-8' : 'h-10 leading-10'}`}
                    style={{ color: 'var(--twc-text-primary,#111827)' }}
                >
                    {qty}
                </span>
                <button
                    type="button"
                    aria-label="إنقاص"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className={`flex items-center justify-center text-gray-600 hover:bg-gray-100 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
                >
                    <Minus className="h-4 w-4" />
                </button>
            </div>
            <button
                type="button"
                onClick={handleAdd}
                className={`inline-flex items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95 ${compact ? 'px-3 py-1.5 text-xs' : ''}`}
                style={{ background: 'var(--twc-primary-500,#10b77f)' }}
            >
                <ShoppingCart className="h-4 w-4" />
                أضف
            </button>
        </div>
    );
}

export function WhatsAppOrderButton({
    product,
    className = '',
    label = 'اطلب واتساب',
}: {
    product: ProductLike;
    className?: string;
    label?: string;
}) {
    const { config } = useStorefrontCore();
    const phone = config?.whatsapp_widget_phone || config?.phoneNumber || config?.socialMedia?.whatsapp || '';
    const link = createWhatsAppUrl(phone, `مرحباً، أريد طلب: ${product.name}`);
    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition hover:opacity-90 ${className}`}
            style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }}
        >
            <MessageCircle className="h-4 w-4 text-green-600" />
            {label}
        </a>
    );
}

/* ------------------------------ Product cards ------------------------------ */

function useCardActions() {
    const { product: productCtx } = useStorefrontCore();
    const open = (p: ProductLike) => productCtx.handleProductClick(p);
    return { open };
}

export function ClassicCard({ product, className = '' }: { product: ProductLike; className?: string }) {
    const { open } = useCardActions();
    return (
        <article
            className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${className}`}
            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            onClick={() => open(product)}
        >
            <ProductImage product={product} className="aspect-square" imgClassName="transition duration-300 group-hover:scale-105" />
            <div className="p-3">
                <h3 className="truncate text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {product.name}
                </h3>
                <div className="mt-2 flex items-center justify-between">
                    <PriceTag product={product} />
                    <AddToCartButton product={product} label="" icon className="h-8 w-8 rounded-full p-0" />
                </div>
            </div>
        </article>
    );
}

export function OverlayCard({ product, className = '' }: { product: ProductLike; className?: string }) {
    const { open } = useCardActions();
    const { cart } = useStorefrontCore();
    return (
        <article
            className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg ${className}`}
            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            onClick={() => open(product)}
        >
            <ProductImage product={product} className="aspect-[3/4]" imgClassName="transition duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        cart.addToCart(product).then(() => toast.success('تمت الإضافة ✓'));
                    }}
                    className="mb-2 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-bold text-white"
                    style={{ background: 'var(--twc-primary-500,#10b77f)' }}
                >
                    <ShoppingCart className="h-3.5 w-3.5" /> أضف للسلة
                </button>
            </div>
            <div
                className="absolute start-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-extrabold backdrop-blur"
                style={{ color: 'var(--twc-primary-600,#059669)' }}
            >
                {formatStoreCurrency(Number(product.price) || 0)}
            </div>
            <div className="p-3">
                <h3 className="truncate text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {product.name}
                </h3>
            </div>
        </article>
    );
}

export function MinimalCard({ product, className = '' }: { product: ProductLike; className?: string }) {
    const { open } = useCardActions();
    return (
        <article className={`group cursor-pointer ${className}`} onClick={() => open(product)}>
            <ProductImage
                product={product}
                className="aspect-square rounded-full border"
                imgClassName="transition duration-500 group-hover:scale-105"
            />
            <div className="mt-3 text-center">
                <h3 className="truncate text-sm font-semibold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {product.name}
                </h3>
                <div className="mt-1 flex items-center justify-center">
                    <PriceTag product={product} className="gap-1" />
                </div>
            </div>
        </article>
    );
}

export function MenuCard({ product, className = '' }: { product: ProductLike; className?: string }) {
    const { open } = useCardActions();
    return (
        <article
            className={`group flex cursor-pointer items-center gap-3 border-b py-4 transition hover:bg-gray-50 ${className}`}
            style={{ borderColor: 'var(--twc-border,#eef2f7)' }}
            onClick={() => open(product)}
        >
            <ProductImage product={product} className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {product.name}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                    {product.description}
                </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
                <PriceTag product={product} />
                <AddToCartButton product={product} label="" icon className="h-7 w-7 rounded-full p-0" />
            </div>
        </article>
    );
}

export function EditorialCard({ product, className = '', index = 0 }: { product: ProductLike; className?: string; index?: number }) {
    const { open } = useCardActions();
    const tall = index % 3 === 0;
    return (
        <article
            className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-xl ${className}`}
            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            onClick={() => open(product)}
        >
            <ProductImage
                product={product}
                className={tall ? 'aspect-[3/4]' : 'aspect-square'}
                imgClassName="transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                <h3 className="truncate text-sm font-bold text-white">{product.name}</h3>
                <div className="mt-1 flex items-center justify-between text-white">
                    <span className="text-sm font-extrabold" style={{ color: 'var(--twc-primary-500,#10b77f)' }}>
                        {formatStoreCurrency(Number(product.price) || 0)}
                    </span>
                    <RatingStars rating={4.5} />
                </div>
            </div>
        </article>
    );
}

export function CompactCard({ product, className = '' }: { product: ProductLike; className?: string }) {
    const { open } = useCardActions();
    return (
        <article
            className={`group flex cursor-pointer items-center gap-2 rounded-lg border p-1.5 transition hover:shadow-sm ${className}`}
            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            onClick={() => open(product)}
        >
            <ProductImage product={product} className="h-14 w-14 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {product.name}
                </h3>
                <PriceTag product={product} className="mt-0.5" />
            </div>
        </article>
    );
}

export function SplitCard({ product, className = '', reverse = false }: { product: ProductLike; className?: string; reverse?: boolean }) {
    const { open } = useCardActions();
    return (
        <article
            className={`group flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-2 shadow-sm transition hover:shadow-md ${className}`}
            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            onClick={() => open(product)}
        >
            <ProductImage product={product} className={`h-24 w-24 shrink-0 rounded-xl ${reverse ? 'order-2' : ''}`} />
            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm leading-snug font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {product.name}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                    {product.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <PriceTag product={product} />
                    <AddToCartButton product={product} label="" icon className="h-7 w-7 rounded-full p-0" />
                </div>
            </div>
        </article>
    );
}

export const PRODUCT_CARDS = {
    classic: ClassicCard,
    overlay: OverlayCard,
    minimal: MinimalCard,
    menu: MenuCard,
    editorial: EditorialCard,
    compact: CompactCard,
    split: SplitCard,
} as const;

export type ProductCardStyle = keyof typeof PRODUCT_CARDS;

/* ------------------------------ Layout blocks ------------------------------ */

export function SectionHeading({
    title,
    subtitle,
    action,
    align = 'center',
    accent = true,
    className = '',
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    align?: 'start' | 'center';
    accent?: boolean;
    className?: string;
}) {
    return (
        <div className={`mb-6 flex flex-wrap items-end justify-between gap-3 ${align === 'center' ? 'text-center' : 'text-start'} ${className}`}>
            <div className={align === 'center' ? 'w-full' : ''}>
                <h2 className="text-2xl font-extrabold md:text-3xl" style={{ color: 'var(--twc-text-primary,#111827)', fontWeight: headingWeight() }}>
                    {title}
                </h2>
                {subtitle && (
                    <p
                        className={`mt-1 text-sm md:text-base ${align === 'center' ? 'mx-auto max-w-xl' : ''}`}
                        style={{ color: 'var(--twc-text-muted,#6b7280)' }}
                    >
                        {subtitle}
                    </p>
                )}
                {accent && (
                    <div
                        className={`mt-3 h-1 w-14 rounded-full ${align === 'center' ? 'mx-auto' : ''}`}
                        style={{ background: 'var(--twc-primary-500,#10b77f)' }}
                    />
                )}
            </div>
            {action}
        </div>
    );
}

export function ProductGrid({
    products,
    children,
    className = '',
}: {
    products: any[];
    children: (product: any, index: number) => React.ReactNode;
    className?: string;
}) {
    if (!products?.length) {
        return (
            <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
                style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            >
                <PackageX className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-semibold" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                    لا توجد منتجات بعد — أضف منتجات من لوحة التحكم
                </p>
            </div>
        );
    }
    return <div className={className}>{products.map((p, i) => children(p, i))}</div>;
}

export function NewsletterForm({ className = '' }: { className?: string }) {
    const { content } = useStorefrontCore();
    const newsletter = content?.newsletter;
    const enabled = newsletter ? newsletter.enabled !== false : true;
    const [email, setEmail] = useState('');
    if (!enabled) return null;
    return (
        <form
            className={`flex max-w-md flex-col gap-2 sm:flex-row ${className}`}
            onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) {
                    toast.success('تم الاشتراك في النشرة البريدية ✓');
                    setEmail('');
                }
            }}
        >
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك الإلكتروني"
                className="h-11 flex-1 rounded-full border bg-white px-4 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }}
            />
            <button
                type="submit"
                className="h-11 rounded-full px-6 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: 'var(--twc-primary-500,#10b77f)' }}
            >
                اشترك
            </button>
        </form>
    );
}

export function TrustBar({ className = '' }: { className?: string }) {
    const { content } = useStorefrontCore();
    const trustBar = content?.trust_bar;
    const enabled = trustBar ? trustBar.enabled !== false : true;
    if (!enabled) return null;
    const items = [
        { icon: '🚚', title: 'شحن سريع', desc: 'توصيل لجميع المناطق' },
        { icon: '🔄', title: 'إرجاع سهل', desc: 'استرجاع خلال 14 يوم' },
        { icon: '💳', title: 'دفع آمن', desc: 'وسائل دفع متعددة' },
        { icon: '🎧', title: 'دعم 24/7', desc: 'خدمة عملاء على مدار الساعة' },
    ];
    return (
        <div className={`grid grid-cols-2 gap-4 sm:grid-cols-4 ${className}`}>
            {items.map((item) => (
                <div
                    key={item.title}
                    className="flex items-center gap-3 rounded-2xl border bg-white p-4"
                    style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
                >
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {item.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            {item.desc}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

const FALLBACK_TESTIMONIALS = [
    { name: 'أحمد يوسف', rating: 5, text: 'تجربة رائعة! جودة ممتازة وتوصيل سريع، أنصح به بشدة.' },
    { name: 'سارة محمود', rating: 5, text: 'أفضل متجر تعاملت معه، المنتجات مطابقة للوصف تماماً.' },
    { name: 'خالد العلي', rating: 4.5, text: 'خدمة عملاء ممتازة، ساعدوني في اختيار المنتج المناسب.' },
    { name: 'نور حسن', rating: 5, text: 'التغليف احترافي والمنتج وصل بحالة ممتازة.' },
];

export function TestimonialsSection({ testimonials, className = '' }: { testimonials?: any[]; className?: string }) {
    const { content } = useStorefrontCore();
    const items: any[] = testimonials?.length ? testimonials : content?.testimonials?.length ? content.testimonials : FALLBACK_TESTIMONIALS;
    return (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
            {items.map((item) => (
                <figure key={item.name} className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                    <RatingStars rating={item.rating || 5} />
                    <blockquote className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        “{item.text}”
                    </blockquote>
                    <figcaption className="mt-4 flex items-center gap-2">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: 'var(--twc-primary-500,#10b77f)' }}
                        >
                            {item.name.charAt(0)}
                        </span>
                        <span className="text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {item.name}
                        </span>
                    </figcaption>
                </figure>
            ))}
        </div>
    );
}

const FALLBACK_FAQS = [
    { q: 'كم يستغرق التوصيل؟', a: 'يستغرق التوصيل عادةً من 1 إلى 5 أيام عمل حسب المنطقة.' },
    { q: 'ما هي طرق الدفع المتاحة؟', a: 'نوفر الدفع عند الاستلام، والدفع الإلكتروني، والتحويل البنكي.' },
    { q: 'هل يمكنني إرجاع المنتج؟', a: 'نعم، يمكنك إرجاع أي منتج خلال 14 يوماً من الاستلام.' },
    { q: 'كيف أتابع طلبي؟', a: 'ستصلك رسالة برقم الطلب، ويمكنك متابعته من قسم طلباتي في حسابك.' },
];

export function FAQSection({ faqs, className = '' }: { faqs?: any[]; className?: string }) {
    const { content } = useStorefrontCore();
    const items: any[] = faqs?.length ? faqs : content?.faqs?.length ? content.faqs : FALLBACK_FAQS;
    const [open, setOpen] = useState<number | null>(0);
    return (
        <div className={`space-y-2 ${className}`}>
            {items.map((item, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                    <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 p-4 text-start"
                        onClick={() => setOpen(open === i ? null : i)}
                    >
                        <span className="text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {item.q}
                        </span>
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-transform ${open === i ? 'rotate-45' : ''}`}
                            style={{ background: 'var(--twc-primary-500,#10b77f)' }}
                        >
                            <Plus className="h-4 w-4" />
                        </span>
                    </button>
                    {open === i && (
                        <div
                            className="border-t px-4 py-3 text-sm leading-relaxed"
                            style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-muted,#6b7280)' }}
                        >
                            {item.a}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export function PromoStrip({ text, className = '' }: { text?: string; className?: string }) {
    const { content } = useStorefrontCore();
    const announcement = content?.announcement;
    // When the owner configured content, respect its enabled flag; otherwise
    // keep the historical always-on behaviour.
    const enabled = announcement ? announcement.enabled !== false : true;
    if (!enabled) return null;
    const stripText = announcement?.text || text || '🎉 شحن مجاني للطلبات فوق 200₪ — عروض حصرية كل أسبوع';
    const stripLink = announcement?.link || '';
    const inner = <span className="px-8 text-sm font-semibold text-white">{stripText}</span>;
    return (
        <div className={`overflow-hidden ${className}`} style={{ background: 'var(--twc-primary-600,#059669)' }}>
            {stripLink ? (
                <a href={stripLink} target="_blank" rel="noopener noreferrer" className="animate-marquee flex py-2 whitespace-nowrap">
                    {[0, 1].map((n) => (
                        <span key={n}>{inner}</span>
                    ))}
                </a>
            ) : (
                <div className="animate-marquee flex py-2 whitespace-nowrap">
                    {[0, 1].map((n) => (
                        <span key={n}>{inner}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

export function FeatureGrid({ items, className = '' }: { items?: { icon: string; title: string; desc: string }[]; className?: string }) {
    const { content } = useStorefrontCore();
    const data = items?.length
        ? items
        : content?.features?.length
          ? content.features
          : [
                { icon: '🛍️', title: 'تشكيلة واسعة', desc: 'آلاف المنتجات المميزة' },
                { icon: '⚡', title: 'معالجة فورية', desc: 'تأكيد الطلب خلال دقائق' },
                { icon: '🔒', title: 'دفع مشفر', desc: 'معاملات آمنة 100%' },
                { icon: '🌍', title: 'توصيل واسع', desc: 'نصل إلى كل مكان' },
            ];
    return (
        <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${className}`}>
            {data.map((item: any) => (
                <div key={item.title} className="rounded-2xl border bg-white p-5 text-center" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                    <span className="text-3xl">{item.icon}</span>
                    <h3 className="mt-2 text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        {item.title}
                    </h3>
                    <p className="mt-1 text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                        {item.desc}
                    </p>
                </div>
            ))}
        </div>
    );
}
