import type { PlanTier, TemplateConfig, TemplateSectionConfig, TemplateSummary } from '@/templates/types';

/**
 * Template Registry
 * Static frontend definitions mirroring the backend templates table.
 * The backend is the source of truth; this registry provides
 * offline/fallback access and quick lookup for the UI.
 */

const baseSection = (id: string, type: TemplateConfig['sections'][number]['type'], order: number, props: Record<string, any> = {}) => ({
    id,
    type,
    enabled: true,
    order,
    props,
});

const rawTemplates: Record<string, TemplateConfig> = {
    // ===================== THE ONLY TEMPLATE =====================
    basic: {
        slug: 'basic',
        name: 'الأساس',
        name_en: 'Basic',
        description: 'تصميم بسيط (Minimalist) يناسب الاستخدام العام.',
        category: 'general',
        is_free: true,
        plan_required: 'starter',
        sections: [
            baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
            baseSection('categories', 'categories', 2, { style: 'tabs', show_all: true }),
            baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
            baseSection('footer', 'footer', 4, { show_newsletter: true }),
        ],
        layout: { container: 'max-w-7xl', spacing: 'normal' },
        design_tokens: {
            colors: {
                'primary-500': '#10b77f',
                'primary-600': '#059669',
                background: '#ffffff',
                surface: '#f9fafb',
                'text-primary': '#111827',
                'text-muted': '#6b7280',
            },
            typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
            spacing: { section: 'py-12', container: 'px-4' },
        },
        advanced_components: [],
    },

    // ===================== ARABIC GADGETS =====================
    'arabic-gadgets': {
        slug: 'arabic-gadgets',
        name: 'الإلكترونيات العربي',
        name_en: 'Arabic Gadgets',
        description: 'تصميم عربي فاخر لمتاجر الإلكترونيات والأجهزة الذكية بأسلوب متاجر الأدوات التقنية.',
        category: 'electronics',
        is_free: true,
        plan_required: 'starter',
        sections: [
            baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
            baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
            baseSection('products', 'products', 3, { layout: 'grid', per_page: 16 }),
            baseSection('banner', 'banner', 4, {}),
            baseSection('featured', 'featured', 5, {}),
            baseSection('reviews', 'reviews', 6, {}),
            baseSection('footer', 'footer', 7, { show_newsletter: true }),
        ],
        layout: { container: 'max-w-7xl', spacing: 'normal' },
        design_tokens: {
            colors: {
                'primary-50': '#eaf4ff',
                'primary-100': '#d0e8ff',
                'primary-500': '#0088ff',
                'primary-600': '#006fd1',
                'primary-700': '#005bb5',
                'secondary-500': '#022554',
                background: '#ffffff',
                surface: '#eff5fc',
                'text-primary': '#022554',
                'text-muted': '#64748b',
            },
            typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
            spacing: { section: 'py-12', container: 'px-4' },
        },
        advanced_components: [],
    },
};

/* =====================================================================
 * Enrichment layer
 * The template is normalized so it ships with a header section,
 * explicit Tailwind classes per section, per-template product columns
 * and a complete, vivid color palette. This guarantees the template
 * does not rely on faded default colors or render empty white gaps.
 * ===================================================================== */

const VIVID_DEFAULT_COLORS: Record<string, string> = {
    'primary-50': '#ecfeff',
    'primary-100': '#cffafe',
    'primary-500': '#06b6d4',
    'primary-600': '#0891b2',
    'primary-700': '#0e7490',
    'secondary-500': '#f97316',
    background: '#ffffff',
    surface: '#f1f5f9',
    'text-primary': '#0f172a',
    'text-muted': '#475569',
};

/** Overrides for templates whose original palette reads as faded/washed out. */
const COLOR_FIXES: Record<string, Record<string, string>> = {};

const SECTION_CLASSES = {
    header: {
        header: 'sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm',
        headerDark: 'sticky top-0 z-40 w-full border-b border-white/10 bg-neutral-900/95 backdrop-blur-md shadow-sm',
    },
    hero: {
        section: 'relative w-full overflow-hidden',
        container: 'mx-auto px-4 py-12 sm:py-16',
        heading: 'text-3xl font-bold sm:text-5xl',
        subheading: 'text-lg sm:text-xl',
    },
    categories: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    products: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    footer: {
        section: 'w-full border-t border-gray-200',
        container: 'mx-auto px-4 py-12 sm:py-16',
    },
    default: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
} as const;

/** Default product grid columns per layout. */
const COLUMNS_BY_LAYOUT: Record<string, number> = {
    grid: 4,
    dense_grid: 6,
    masonry: 4,
    list: 1,
    elegant_list: 2,
    menu_list: 1,
    bulk_table: 1,
};

function withTemplateDefaults(template: TemplateConfig): TemplateConfig {
    const slug = template.slug;
    const dark = Boolean(template.layout?.dark_mode);
    const container = template.layout?.container || 'max-w-7xl';

    const colors = {
        ...VIVID_DEFAULT_COLORS,
        ...(template.design_tokens?.colors ?? {}),
        ...(COLOR_FIXES[slug] ?? {}),
    };

    const sections: TemplateSectionConfig[] = template.sections.map((s) => ({
        ...s,
        props: { ...s.props },
        classes: s.classes ? { ...s.classes } : undefined,
    }));

    const hasHeader = sections.some((s) => s.type === 'header');
    if (!hasHeader) {
        sections.unshift({
            id: 'header',
            type: 'header',
            enabled: true,
            order: 1,
            props: {
                sticky: true,
                show_search: true,
                show_cart: true,
                show_auth: true,
                show_whatsapp: true,
            },
            classes: {
                header: dark ? SECTION_CLASSES.header.headerDark : SECTION_CLASSES.header.header,
                container: `mx-auto flex h-16 items-center justify-between gap-3 px-4 ${container}`,
            },
        });
    }

    sections.forEach((s, i) => {
        s.order = i + 1;
        const base = (SECTION_CLASSES[s.type as keyof typeof SECTION_CLASSES] || SECTION_CLASSES.default) as Record<string, string>;
        if (!s.classes) {
            s.classes = {
                section: base.section,
                container: `${base.container} ${container}`,
                heading: base.heading,
            };
        } else {
            if (!s.classes.container) s.classes.container = `${base.container} ${container}`;
            if (!s.classes.section) s.classes.section = base.section;
        }
        if (s.type === 'products' && typeof s.props.columns !== 'number') {
            s.props.columns = COLUMNS_BY_LAYOUT[s.props.layout] || 4;
        }
    });

    return {
        ...template,
        sections,
        layout: {
            ...template.layout,
            container,
            columns: template.layout?.columns ?? (container === 'max-w-3xl' || container === 'max-w-5xl' ? 2 : 4),
            spacing: template.layout?.spacing ?? 'normal',
        },
        design_tokens: {
            ...(template.design_tokens ?? {}),
            colors,
        },
    };
}

/** Enriched templates: header + explicit classes + vivid palette + columns. */
const templates: Record<string, TemplateConfig> = Object.fromEntries(
    Object.entries(rawTemplates).map(([slug, t]) => [slug, withTemplateDefaults(t)]),
);

/**
 * Get a template config by slug.
 */
export function getTemplateConfig(slug: string): TemplateConfig | null {
    return templates[slug] || null;
}

/**
 * Get all template configs.
 */
export function getAllTemplates(): TemplateConfig[] {
    return Object.values(templates);
}

/**
 * Get free template configs.
 */
export function getFreeTemplates(): TemplateConfig[] {
    return Object.values(templates).filter((t) => t.is_free);
}

/**
 * Get paid template configs.
 */
export function getPaidTemplates(): TemplateConfig[] {
    return Object.values(templates).filter((t) => !t.is_free);
}

/**
 * Get templates grouped by category.
 */
export function getTemplatesByCategory(): Record<string, TemplateConfig[]> {
    return Object.values(templates).reduce(
        (acc, template) => {
            if (!acc[template.category]) {
                acc[template.category] = [];
            }
            acc[template.category].push(template);
            return acc;
        },
        {} as Record<string, TemplateConfig[]>,
    );
}

/**
 * Get templates accessible for a given plan tier.
 */
export function getAccessibleTemplates(planTier: PlanTier = 'starter'): TemplateConfig[] {
    return Object.values(templates)
        .filter((t) => t.is_free || planTier === 'growth' || planTier === 'professional')
        .sort((a, b) => Number(a.is_free) - Number(b.is_free));
}

/**
 * Get template summaries for listing UI.
 */
export function getTemplateSummaries(planTier: PlanTier = 'starter'): TemplateSummary[] {
    return Object.values(templates)
        .sort((a, b) => a.category.localeCompare(b.category) || Number(a.is_free) - Number(b.is_free))
        .map((t) => ({
            slug: t.slug,
            name: t.name,
            name_en: t.name_en,
            description: t.description,
            category: t.category,
            is_free: t.is_free,
            plan_required: t.plan_required,
            is_accessible: t.is_free || planTier === 'growth' || planTier === 'professional',
        }));
}
