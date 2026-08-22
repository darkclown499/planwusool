import React, { useState } from 'react';
import { Menu, Phone, ShoppingCart, Mail } from 'lucide-react';
import type { WpThemeConfig } from '../types';

interface WpHeaderProps {
  config: WpThemeConfig;
  /** Real store name — wins over the theme placeholder name. */
  displayName?: string;
  /** Real store logo URL — shown instead of the text logo when present. */
  logoSrc?: string | null;
  cartCount: number;
  onCartClick: () => void;
  whatsappHref?: string;
}

/**
 * Faithful port of the family header: dark topbar (phone / email / socials)
 * above a sticky row with logo, menu and round cart button — exactly the
 * structure of the originals' header.php, translated to Arabic.
 */
export const WpHeader: React.FC<WpHeaderProps> = ({ config, displayName, logoSrc, cartCount, onCartClick, whatsappHref }) => {
  const [open, setOpen] = useState(false);
  const { header } = config;

  return (
    <>
      {(header.topbarText || header.phone || header.email || header.socials) && (
        <div className="wpt-topbar">
          <div className="wpt-container wpt-topbar__inner">
            <p className="m-0">{header.topbarText}</p>
            <div className="flex items-center gap-5 flex-wrap">
              {header.phone && (
                <a href={`tel:${header.phone}`} className="inline-flex items-center gap-2 no-underline">
                  <Phone size={13} />
                  <span dir="ltr">{header.phone}</span>
                </a>
              )}
              {header.email && (
                <a href={`mailto:${header.email}`} className="hidden sm:inline-flex items-center gap-2 no-underline">
                  <Mail size={13} />
                  {header.email}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="wpt-header">
        <div className="wpt-container wpt-header__inner">
          <button
            type="button"
            className="wpt-menu-toggle wpt-cart-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
          >
            <Menu size={20} />
          </button>

          <a className="wpt-logo no-underline" href="#">
            {logoSrc ? (
              <img src={logoSrc} alt={displayName || config.name} />
            ) : (
              displayName || config.name
            )}
          </a>

          <nav className={`wpt-nav ${open ? 'is-open' : ''}`}>
            {header.menu.map((item) => (
              <a key={item} href="#" className="no-underline">
                {item}
              </a>
            ))}
          </nav>

          <div className="wpt-header__actions">
            {whatsappHref && (
              <a
                className="wpt-btn hidden md:inline-block !px-7"
                style={{ paddingBlock: 10 }}
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                تواصل معنا
              </a>
            )}
            <button
              type="button"
              className="wpt-cart-btn"
              onClick={onCartClick}
              aria-label="سلة التسوق"
            >
              <ShoppingCart size={19} />
              {cartCount > 0 && <span className="wpt-cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
