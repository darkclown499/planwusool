import React from 'react';
import { usePage, Head } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import TrustedBySection from './components/TrustedBySection';
import FeaturesSection from './components/FeaturesSection';
import NicheThemesSection from './components/NicheThemesSection';
import ScreenshotsSection from './components/ScreenshotsSection';
import WhyChooseUs from './components/WhyChooseUs';
import AboutUs from './components/AboutUs';
import TeamSection from './components/TeamSection';
import PlansSection from './components/PlansSection';
import FaqSection from './components/FaqSection';
import NewsletterSection from './components/NewsletterSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import ActiveCampaignsSection from './components/ActiveCampaignsSection';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { useFavicon } from '@/hooks/use-favicon';
import { useTranslation } from 'react-i18next';
import languageData from '@/../../resources/lang/language.json';
import AIChatWidget from '@/components/AIChatWidget';
import { type SharedData } from '@/types';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearly_price?: number;
  duration: string;
  features?: string[];
  is_popular?: boolean;
  is_plan_enable: string;
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company?: string;
  content: string;
  avatar?: string;
  rating: number;
}

interface Faq {
  id: number;
  question: string;
  answer: string;
}

interface LandingSettings {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  config_sections?: {
    sections: Array<{
      key: string;
      [key: string]: any;
    }>;
    theme?: {
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      logo_light?: string;
      logo_dark?: string;
      favicon?: string;
    };
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    seo?: {
      meta_title?: string;
      meta_description?: string;
      meta_keywords?: string;
    };
    custom_css?: string;
    custom_js?: string;
    section_order?: string[];
    section_visibility?: {
      [key: string]: boolean;
    };
  };
}

interface CustomPage {
  id: number;
  title: string;
  slug: string;
}

interface FeaturedStore {
  id: number;
  name: string;
  description: string;
  slug: string;
  logo?: string;
}

interface PageProps extends SharedData {
  plans: Plan[];
  testimonials: Testimonial[];
  faqs: Faq[];
  customPages: CustomPage[];
  settings: LandingSettings;
  featuredStores: FeaturedStore[];
  demoStoreUrl?: string;
  superadminLogoDark?: string;
  superadminLogoLight?: string;
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function LandingPage() {
  const { t } = useTranslation();
  const { plans, faqs, customPages = [], settings, featuredStores = [], flash, superadminLogoDark, superadminLogoLight, demoStoreUrl = '' } = usePage<PageProps>().props;
  const { i18n } = useTranslation();

  // This is the public landing page, not the admin settings page
  // No breadcrumbs needed here as it's a public page

  useFavicon();
  // Get brand colors - prioritize superadmin landing page colors over brand context
  const { themeColor, customColor } = useBrand();
  const configColors = settings.config_sections?.colors;
  // Use landing page colors first, then fall back to brand context
  const primaryColor = configColors?.primary || (themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS]) || '#10b77f';
  const secondaryColor = configColors?.secondary || '#059669';
  const accentColor = configColors?.accent || '#065f46';
  const page = usePage<any>();
  const { auth, superadminSettings } = page.props;

  // Arabic-first design: the whole interface is always right-to-left.
  // Never derive direction from the language, otherwise the page flips to LTR.
  React.useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  // Use Superadmin Settings from the 'settings' table for SEO as requested
  const pageTitle = superadminSettings?.metaTitle || superadminSettings?.titleText || 'Wusool - Build Your Online Store';
  const metaDescription = superadminSettings?.metaDescription || 'أنشئ متجرك الإلكتروني الاحترافي خلال دقائق مع منصة وصول. ربط مباشر مع الواتساب، طرق دفع متعددة، وإدارة كاملة لطلباتك من مكان واحد. جرب مجاناً!';
  const metaKeywords = superadminSettings?.metaKeywords || '';
  const metaImage = superadminSettings?.metaImage ? getImageUrl(superadminSettings.metaImage) : '';

  // Custom CSS
  React.useEffect(() => {
    const customCss = settings.config_sections?.custom_css;
    if (customCss) {
      const styleId = 'landing-custom-css';
      let styleElement = document.getElementById(styleId);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = customCss;
    }
  }, [settings.config_sections?.custom_css]);

  // Custom JS
  React.useEffect(() => {
    const customJs = settings.config_sections?.custom_js;
    if (customJs) {
      const scriptId = 'landing-custom-js';
      let scriptElement = document.getElementById(scriptId);
      if (scriptElement) {
        scriptElement.remove();
      }
      scriptElement = document.createElement('script');
      scriptElement.id = scriptId;
      scriptElement.textContent = customJs;
      document.body.appendChild(scriptElement);
    }
  }, [settings.config_sections?.custom_js]);

  // Get section data helper
  const getSectionData = (key: string) => {
    return settings.config_sections?.sections?.find(section => section.key === key) || {};
  };

  const compactDefaultSections = ['header', 'hero', 'trusted_by', 'features', 'niche_themes', 'plans', 'faq', 'footer'];

  // Respect admin visibility settings when provided; otherwise keep the homepage lean by default.
  const isSectionVisible = (key: string) => {
    const explicitValue = settings.config_sections?.section_visibility?.[key];
    if (typeof explicitValue === 'boolean') {
      return explicitValue;
    }

    return compactDefaultSections.includes(key);
  };

  // Keep the homepage compact by default, while still allowing explicit ordering from settings.
  const sectionOrder = settings.config_sections?.section_order || compactDefaultSections;

  // Component mapping
  const sectionComponents = {
    header: () => isSectionVisible('header') && (
      <Header
        settings={settings}
        sectionData={getSectionData('header')}
        customPages={customPages}
        brandColor={primaryColor}
        user={auth.user}
        superadminLogoDark={superadminLogoDark}
        superadminLogoLight={superadminLogoLight}
      />
    ),
    hero: () => isSectionVisible('hero') && (
      <HeroSection
        settings={settings}
        sectionData={getSectionData('hero')}
        brandColor={primaryColor}
        superadminLogoLight={superadminLogoLight}
      />
    ),
    features: () => isSectionVisible('features') && (
      <FeaturesSection
        settings={settings}
        sectionData={getSectionData('features')}
        brandColor={primaryColor}
      />
    ),
    trusted_by: () => isSectionVisible('trusted_by') && (
      <TrustedBySection
        settings={settings}
        sectionData={getSectionData('trusted_by')}
        brandColor={primaryColor}
      />
    ),
    niche_themes: () => isSectionVisible('niche_themes') && (
      <NicheThemesSection brandColor={primaryColor} />
    ),
    screenshots: () => isSectionVisible('screenshots') && (
      <ScreenshotsSection
        settings={settings}
        sectionData={getSectionData('screenshots')}
        brandColor={primaryColor}
      />
    ),
    themes: () => null,
    why_choose_us: () => isSectionVisible('why_choose_us') && (
      <WhyChooseUs
        settings={settings}
        sectionData={getSectionData('why_choose_us')}
        brandColor={primaryColor}
      />
    ),

    about: () => isSectionVisible('about') && (
      <AboutUs
        settings={settings}
        sectionData={getSectionData('about')}
        brandColor={primaryColor}
      />
    ),
    team: () => isSectionVisible('team') && (
      <TeamSection
        settings={settings}
        sectionData={getSectionData('team')}
        brandColor={primaryColor}
      />
    ),
    featured_stores: () => isSectionVisible('featured_stores') && featuredStores.length > 0 && (
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: primaryColor }}>
            Featured Stores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredStores.map((store) => (
              <div key={store.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                {store.logo && (
                  <img src={store.logo} alt={store.name} className="w-16 h-16 object-cover rounded-lg mb-4" />
                )}
                <h3 className="text-xl font-semibold mb-2">{store.name}</h3>
                <p className="text-gray-600 mb-4">{store.description}</p>
                <a
                  href={route('store.home', store.slug)}
                  className="inline-block px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Visit Store
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    plans: () => isSectionVisible('plans') && (
      <PlansSection
        plans={plans}
        settings={settings}
        sectionData={getSectionData('plans')}
        brandColor={primaryColor}
      />
    ),
    faq: () => isSectionVisible('faq') && (
      <FaqSection
        faqs={faqs}
        settings={settings}
        sectionData={getSectionData('faq')}
        brandColor={primaryColor}
      />
    ),
    newsletter: () => isSectionVisible('newsletter') && (
      <NewsletterSection
        flash={flash}
        settings={settings}
        sectionData={getSectionData('newsletter')}
        brandColor={primaryColor}
      />
    ),
    contact: () => isSectionVisible('contact') && (
      <ContactSection
        flash={flash}
        settings={settings}
        sectionData={getSectionData('contact')}
        brandColor={primaryColor}
      />
    ),
    footer: () => isSectionVisible('footer') && (
      <Footer
        settings={settings}
        sectionData={getSectionData('footer')}
        brandColor={primaryColor}
        superadminLogoLight={superadminLogoLight}
      />
    )
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        {metaKeywords && <meta name="keywords" content={metaKeywords} />}
        <meta property="og:site_name" content="Wusool" />
        <meta property="og:title" content={pageTitle} />
        {metaDescription && <meta property="og:description" content={metaDescription} />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        {metaDescription && <meta name="twitter:description" content={metaDescription} />}
        {metaImage && <meta property="og:image" content={metaImage} />}
        {metaImage && <meta name="twitter:image" content={metaImage} />}
      </Head>
      <main
        className="min-h-screen overflow-x-hidden bg-slate-50"
        data-landing-page="true"
        style={{
          scrollBehavior: 'smooth',
          '--brand-color': primaryColor,
          '--primary-color': primaryColor,
          '--secondary-color': secondaryColor,
          '--accent-color': accentColor
        } as React.CSSProperties}
      >
        {sectionOrder.map((sectionKey) => {
          const Component = sectionComponents[sectionKey as keyof typeof sectionComponents];
          return Component ? <React.Fragment key={sectionKey}>{Component()}</React.Fragment> : null;
        })}

        {/* AI Chat Widget */}
        <AIChatWidget position="left" enabled={true} />
      </main>
    </>
  );
}