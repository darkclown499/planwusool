import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';

interface LoyaltyHistoryItem {
  id: string | number;
  points: number;
  type: string;
  description?: string;
  created_at?: string;
}

interface LoyaltyModalProps {
  onClose: () => void;
}

export const LoyaltyModal: React.FC<LoyaltyModalProps> = ({ onClose }) => {
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const { store } = useStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<LoyaltyHistoryItem[]>([]);
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
    const loadLoyalty = async () => {
      setLoading(true);
      try {
        const [balanceRes, historyRes] = await Promise.all([
          fetch(route('api.loyalty.balance', { store_id: store.id })),
          fetch(route('api.loyalty.history', { store_id: store.id, limit: 30 }))
        ]);
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setBalance(balanceData.balance);
        }
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData.history || []);
        }
      } catch (error) {
        console.error('Failed to load loyalty data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLoyalty();
  }, [isLoggedIn, store.id]);

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative min-h-full flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-3">نقاط الولاء</h2>
            <p className="text-gray-600 mb-6">سجّل الدخول لعرض رصيد نقاطك</p>
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">نقاط الولاء</h2>
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
            ) : (
              <>
                {/* Balance card */}
                <div className="bg-gradient-to-l from-amber-500 to-orange-500 rounded-2xl p-5 mb-5 text-white">
                  <p className="text-white/80 text-sm mb-1">رصيد النقاط الحالي</p>
                  <p className="text-3xl font-bold">{balance ?? 0} نقطة</p>
                  <p className="text-white/80 text-xs mt-2">اجمع النقاط مع كل طلب واستبدلها بخصومات على مشترياتك القادمة</p>
                </div>

                {/* History */}
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">سجل النقاط</h3>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">لا يوجد سجل نقاط بعد</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.description || item.type}</p>
                          {item.created_at && (
                            <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        <span className={`text-sm font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {item.points > 0 ? '+' : ''}{item.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
