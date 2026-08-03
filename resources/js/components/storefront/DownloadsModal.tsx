import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { getImageUrl } from '@/utils/image-helper';

interface DownloadItem {
  id: string | number;
  product_name: string;
  product_image?: string | null;
  file_name: string;
  file_size?: string | null;
  download_count: number;
  max_downloads: number;
  is_usable: boolean;
  download_url: string;
  created_at?: string;
  expires_at?: string | null;
}

interface DownloadsModalProps {
  onClose: () => void;
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({ onClose }) => {
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const { store } = useStore();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    const loadDownloads = async () => {
      setLoading(true);
      try {
        const response = await fetch(route('api.digital-downloads.index', { store_id: store.id }));
        if (response.ok) {
          const data = await response.json();
          setDownloads(data.downloads || []);
        }
      } catch (error) {
        console.error('Failed to load downloads:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDownloads();
  }, [isLoggedIn, store.id]);

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative min-h-full flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-3">التنزيلات الرقمية</h2>
            <p className="text-gray-600 mb-6">سجّل الدخول لعرض ملفاتك الرقمية</p>
            <button
              onClick={() => {
                onClose();
                setShowLoginModal(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative min-h-full flex items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">التنزيلات الرقمية</h2>
              <p className="text-gray-500 text-sm">{downloads.length} ملف</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : downloads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <p className="text-gray-500">لا توجد تنزيلات متاحة</p>
                <p className="text-gray-400 text-sm mt-1">ستظهر ملفاتك الرقمية هنا بعد إتمام الطلب</p>
              </div>
            ) : (
              <div className="space-y-3">
                {downloads.map((download) => (
                  <div key={download.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                    {download.product_image ? (
                      <img
                        src={getImageUrl(download.product_image)}
                        alt={download.product_name}
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{download.product_name}</h3>
                      <p className="text-gray-500 text-xs" dir="ltr">{download.file_name} {download.file_size ? `(${download.file_size})` : ''}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {download.download_count} / {download.max_downloads} تنزيل
                        {download.expires_at && (
                          <span> · تنتهي {new Date(download.expires_at).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    {download.is_usable ? (
                      <a
                        href={download.download_url}
                        className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        تنزيل
                      </a>
                    ) : (
                      <span className="flex-shrink-0 text-xs text-gray-400 font-medium px-3 py-1.5 bg-gray-100 rounded-lg">
                        غير متاح
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
