import React from 'react';
import { PlayCircle } from 'lucide-react';
import { SectionHeading, css, EmptySection } from './helpers';
import type { BuilderSectionProps } from './helpers';

const toEmbed = (url?: string): string => {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
};

export const VideoSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const contentVideo = storeData?.content?.video || {};
  const url = props.video_url || contentVideo.video_url || '';
  const title = props.section_title || contentVideo.title || 'فيديو تعريفي';
  const poster = props.poster || contentVideo.poster || '';
  const embed = toEmbed(url);

  if (!embed) {
    return <EmptySection title="لا يوجد فيديو" hint="أضف رابط فيديو من يوتيوب أو فيميو ليظهر هنا." />;
  }

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="mx-auto max-w-4xl">
        <SectionHeading title={title} subtitle={'تعرّف أكثر على متجرنا ومنتجاتنا.'} />
        <div className="relative overflow-hidden rounded-3xl shadow-2xl" style={{ background: '#0f172a' }}>
          {poster && !embed.startsWith('https://www.youtube.com/embed') && !embed.startsWith('https://player.vimeo.com') ? (
            <a
              href={embed}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block aspect-video w-full"
              style={{
                backgroundImage: `url(${poster})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/40 backdrop-blur transition hover:scale-110">
                  <PlayCircle className="h-9 w-9" />
                </span>
              </span>
            </a>
          ) : (
            <iframe
              src={embed}
              title={title}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </section>
  );
};