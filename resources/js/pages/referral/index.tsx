import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { BarChart3, DollarSign, Users, Settings as SettingsIcon } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useTranslation } from 'react-i18next';
import { usePage, router } from '@inertiajs/react';
import ReferralDashboard from './components/referral-dashboard';
import PayoutRequests from './components/payout-requests';
import ReferralSettings from './components/referral-settings';
import { hasPermission } from '@/utils/permissions';

export default function Referral() {
  const { t } = useTranslation();
  const { props } = usePage();
  const { userType, settings, stats, payoutRequests, referralLink, formattedSettings } = props as any;
  const [activeSection, setActiveSection] = useState('dashboard');

  const sidebarNavItems: { title: string; href: string; icon: React.ReactNode }[] = [
    {
      title: t('Dashboard'),
      href: '#dashboard',
      icon: <BarChart3 className="h-4 w-4 shrink-0" />,
    },
    {
      title: t('Referred Users'),
      href: route('referral.referred-users'),
      icon: <Users className="h-4 w-4 shrink-0" />,
    },
    ...(hasPermission('manage-payout-referral') ? [{
      title: t('Payout Requests'),
      href: '#payout-requests',
      icon: <DollarSign className="h-4 w-4 shrink-0" />,
    }] : []),
    ...(userType === 'superadmin' ? [{
      title: t('Settings'),
      href: '#settings',
      icon: <SettingsIcon className="h-4 w-4 shrink-0" />,
    }] : [])
  ];

  const dashboardRef = useRef<HTMLDivElement>(null);
  const payoutRequestsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      const dashboardPosition = dashboardRef.current?.offsetTop || 0;
      const payoutRequestsPosition = payoutRequestsRef.current?.offsetTop || 0;
      const settingsPosition = settingsRef.current?.offsetTop || 0;

      if (settingsPosition > 0 && scrollPosition >= settingsPosition) {
        setActiveSection('settings');
      } else if (payoutRequestsPosition > 0 && scrollPosition >= payoutRequestsPosition) {
        setActiveSection('payout-requests');
      } else {
        setActiveSection('dashboard');
      }
    };

    window.addEventListener('scroll', handleScroll);

    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(hash);
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [userType]);

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const id = href.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(id);
      }
    } else {
      router.visit(href);
    }
  };

  return (
    <PageTemplate
      title={t('Referral Program')}
      url="/referral"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Referral Program') }
      ]}
    >
      <div className="space-y-8">
        {/* Segmented control tabs */}
        <div className="w-full overflow-x-auto pb-1">
          <div className="inline-flex items-center gap-1 bg-muted p-1 rounded-xl min-w-max sm:min-w-0">
            {sidebarNavItems.map((item) => {
              const isActive = activeSection === item.href.replace('#', '');
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background hover:text-foreground'
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <section id="dashboard" ref={dashboardRef} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('Dashboard')}</h2>
            <ReferralDashboard
              userType={userType}
              stats={stats}
              referralLink={referralLink}
              recentReferredUsers={(props as any).recentReferredUsers}
            />
          </section>

          {hasPermission('manage-payout-referral') && (
            <section id="payout-requests" ref={payoutRequestsRef} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('Payout Requests')}</h2>
              <PayoutRequests
                userType={userType}
                payoutRequests={payoutRequests}
                settings={settings}
                stats={stats}
                formattedSettings={formattedSettings}
              />
            </section>
          )}

          {userType === 'superadmin' && (
            <section id="settings" ref={settingsRef} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{t('Settings')}</h2>
              <ReferralSettings settings={settings} />
            </section>
          )}
        </div>
      </div>
      <Toaster />
    </PageTemplate>
  );
}