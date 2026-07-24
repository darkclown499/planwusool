import React from 'react';
import StaticPageLayout from './StaticPageLayout';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <StaticPageLayout title={t('من نحن')}>
      <div className="space-y-8">
        <section>
          <p className="text-lg leading-relaxed text-gray-700">
            {t('وصول منصة إلكترونية متكاملة لإنشاء وإدارة المتاجر على واتساب. نوفر لأصحاب المتاجر أدوات احترافية لإدارة منتجاتهم وعملاءهم وطلباتهم بسهولة وفعالية.')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('رؤيتنا')}</h2>
          <p>
            {t('نسعى لإنشاء أكبر منصة عربية لإدارة المتاجر على واتساب، تمكّن رواد الأعمال من بيع منتجاتهم بسهولة وتحقيق أرباح أعلى مع تجربة مبيعات سلسة واحترافية لعملائهم.')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('مهمتنا')}</h2>
          <p>
            {t('تقديم حلول بيع ذكية وسهلة الاستخدام على واتساب تساعد أصحاب المتاجر على النمو والتوسع، مع توفير تجربة شراء مميزة للعملاء تجمع بين سهولة واتساب وقوة الأدوات الرقمية الحديثة.')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('لماذا وصول؟')}</h2>
          <ul className="list-disc space-y-2 pr-6">
            <li>{t('سهولة الاستخدام: واجهة بديهية لا تتطلب خبرة تقنية')}</li>
            <li>{t('إدارة شاملة: منتجات، عملاء، طلبات، وتحليلات من مكان واحد')}</li>
            <li>{t('دعم متعدد اللغات: العربية والإنجليزية وغيرها')}</li>
            <li>{t('أمان متقدم: حماية بياناتك وبيانات عملائك')}</li>
            <li>{t('دعم فني متميز: فريق متخصص على مدار الساعة')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('تواصل معنا')}</h2>
          <p>
            {t('لأي استفسارات أو دعم فني، يُرجى التواصل معنا عبر البريد الإلكتروني')}{' '}
            <a href="mailto:info@wusool.ps" className="text-emerald-600 hover:underline">info@wusool.ps</a>
            {' '}{t('أو عبر الواتساب على الرقم')}{' '}
            <a href="https://wa.me/970591234567" className="text-emerald-600 hover:underline">+970 59 123 4567</a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
