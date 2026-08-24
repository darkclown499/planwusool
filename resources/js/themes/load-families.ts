/**
 * Registering a family here (via its index.ts side-effect import) is the
 * only step required to plug a brand-new template family into the whole
 * platform — live storefront, designer canvas and page/category chrome all
 * pick it up automatically through getFamilySectionComponent()/
 * getFamilyPageComponent() (resources/js/themes/registry.ts).
 *
 * Import this module (for its side effects only) once, early, from any
 * entry point that needs every family available — e.g. StoreSite.tsx and
 * TemplateStorefront.tsx. Deliberately NOT imported from registry.ts
 * itself: see the comment above FAMILY_LABELS there for why.
 */
import './families/modern-minimal';
import './families/dense-marketplace';
import './families/flash-deals';
import './families/editorial-boutique';
import './families/playful-cards';
import './families/food-menu';
import './families/visual-tech';
