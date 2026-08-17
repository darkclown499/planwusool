import { createSafeHtml } from '@/utils/xss-protection';
import React from 'react';
import { usePage, Head } from '@inertiajs/react';
import Header from './components/Header';
import Footer from './components/Footer';
import { useFavicon } from '@/hooks/use-favicon';
import { getImageUrl } from '@/utils/image-helper';
import { type SharedData } from '@/types';

interface CustomPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  is_active: boolean;
}

interface CustomPageData {
  id: number;
  title: string;
  slug: string;
}

interface PageProps extends SharedData {
  page: CustomPage;
  customPages: CustomPageData[];
  settings: {
    company_name: string;
    contact_email?: string;
    contact_phone?: string;
    contact_address?: string;
    config_sections?: {
      sections?: Array<{
        key: string;
        [key: string]: any;
      }>;
      theme?: {
        primary_color?: string;
        secondary_color?: string;
        accent_color?: string;
      };
    };
    [key: string]: any;
  };
  superadminLogoDark?: string;
  superadminLogoLight?: string;
}

export default function CustomPage() {
  // Custom CSS to fix styling issues
  const customCSS = `
    /* Fix form inputs */
    .custom-page-content input:focus, 
    .custom-page-content textarea:focus {
      --tw-ring-color: var(--primary-color) !important;
      border-color: var(--primary-color) !important;
    }
    
    /* Fix color issues */
    .custom-page-content .bg-blue-50 { background-color: rgba(var(--primary-color-rgb), 0.1) !important; }
    .custom-page-content .bg-purple-50 { background-color: rgba(var(--secondary-color-rgb), 0.1) !important; }
    .custom-page-content .bg-green-50 { background-color: rgba(var(--accent-color-rgb), 0.1) !important; }
    .custom-page-content .bg-red-50 { background-color: rgba(var(--accent-color-rgb), 0.1) !important; }
    
    .custom-page-content .text-blue-600 { color: var(--primary-color) !important; }
    .custom-page-content .text-purple-600 { color: var(--secondary-color) !important; }
    .custom-page-content .text-green-600 { color: var(--accent-color) !important; }
    .custom-page-content .text-red-600 { color: var(--accent-color) !important; }
    
    .custom-page-content .border-blue-500 { border-color: var(--primary-color) !important; }
    .custom-page-content .border-purple-500 { border-color: var(--secondary-color) !important; }
    .custom-page-content .border-green-500 { border-color: var(--accent-color) !important; }
    .custom-page-content .border-red-500 { border-color: var(--accent-color) !important; }
    
    .custom-page-content .bg-blue-600 { background-color: var(--primary-color) !important; }
    .custom-page-content .bg-purple-600 { background-color: var(--secondary-color) !important; }
    .custom-page-content .bg-green-600 { background-color: var(--accent-color) !important; }
    .custom-page-content .bg-red-500 { background-color: var(--accent-color) !important; }
    
    /* Fix border colors */
    .custom-page-content .border-blue-200 { border-color: rgba(var(--primary-color-rgb), 0.2) !important; }
    .custom-page-content .border-green-200 { border-color: rgba(var(--accent-color-rgb), 0.2) !important; }
    
    /* Fix hover states */
    .custom-page-content .hover\:bg-blue-700:hover { background-color: var(--primary-color) !important; opacity: 0.9; }
    
    /* Fix form button */
    .custom-page-content .bg-blue-600 { background-color: var(--primary-color) !important; }
  `;

  const pageProps = usePage<PageProps>();
  const { page, customPages = [], settings, superadminLogoDark, superadminLogoLight } = pageProps.props;
  const { auth, superadminSettings } = pageProps.props as any;

  // Use Superadmin Settings from the 'settings' table for SEO
  const pageTitle = superadminSettings?.metaTitle || superadminSettings?.titleText || 'Wusool - Build Your Online Store';
  const metaDescription = superadminSettings?.metaDescription || 'أنشئ متجرك الإلكتروني الاحترافي خلال دقائق مع منصة وصول. ربط مباشر مع الواتساب، طرق دفع متعددة، وإدارة كاملة لطلباتك من مكان واحد. جرب مجاناً!';
  const metaKeywords = superadminSettings?.metaKeywords || '';
  const metaImage = superadminSettings?.metaImage ? getImageUrl(superadminSettings.metaImage) : '';

  const primaryColor = settings?.config_sections?.theme?.primary_color || '#3b82f6';
  const secondaryColor = settings?.config_sections?.theme?.secondary_color || '#8b5cf6';
  const accentColor = settings?.config_sections?.theme?.accent_color || '#10b77f';
  useFavicon();
  return (
    <>
      <Head>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && (
          <meta name="description" content={page.meta_description} />
        )}
        {metaKeywords && <meta name="keywords" content={metaKeywords} />}
        {metaImage && <meta property="og:image" content={metaImage} />}
        {metaImage && <meta name="twitter:image" content={metaImage} />}
        <style>{customCSS}</style>
      </Head>

      <div
        className="min-h-screen bg-white"
        style={{
          '--primary-color': primaryColor,
          '--secondary-color': secondaryColor,
          '--accent-color': accentColor,
          '--primary-color-rgb': primaryColor.replace('#', '').match(/.{2}/g)?.map((x: any) => parseInt(x, 16)).join(', ') || '59, 130, 246',
          '--secondary-color-rgb': secondaryColor.replace('#', '').match(/.{2}/g)?.map((x: any) => parseInt(x, 16)).join(', ') || '139, 92, 246',
          '--accent-color-rgb': accentColor.replace('#', '').match(/.{2}/g)?.map((x: any) => parseInt(x, 16)).join(', ') || '16, 185, 129'
        } as React.CSSProperties}
      >
        <Header
          settings={settings}
          customPages={customPages}
          sectionData={settings?.config_sections?.sections?.find(s => s.key === 'header') || {}}
          brandColor={primaryColor}
          superadminLogoDark={superadminLogoDark}
          superadminLogoLight={superadminLogoLight}
          user={auth?.user}
        />

        <main className="pt-16">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold mb-8 text-gray-900">{page.title}</h1>
              <div
                className="custom-page-content prose prose-lg max-w-none"
                dangerouslySetInnerHTML={createSafeHtml(page.content)}
              />
            </div>
          </div>
        </main>

        <Footer
          settings={settings as any}
          sectionData={(settings?.config_sections?.sections?.find(s => s.key === 'footer') || {}) as any}
          brandColor={primaryColor}
          superadminLogoLight={superadminLogoLight}
        />
      </div>
    </>
  );
}