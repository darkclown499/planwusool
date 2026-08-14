import { WefaqStore } from '@/themes/wefaq/WefaqStore';
import React from 'react';
import type { TemplatePageProps } from './types';

/**
 * Wefaq — dedicated pixel-perfect supermarket page.
 * Renders live store data when available, otherwise falls back to the
 * hardcoded Wefaq Supermarket preview (real photos + Arabic copy).
 */
const WefaqPage: React.FC<TemplatePageProps> = (props) => <WefaqStore {...props} />;

export default WefaqPage;
