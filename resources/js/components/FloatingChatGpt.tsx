import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { ChatGptModal } from '@/components/chatgpt';
import { Button } from '@/components/ui/button';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

interface FloatingChatAuth {
  user?: {
    type?: string;
    plan_is_active?: number;
    plan?: { enable_chatgpt?: string };
    creator?: { plan_is_active?: number; plan?: { enable_chatgpt?: string } };
  };
  roles?: string[];
}

export function FloatingChatGpt() {
  const { t } = useTranslation();
  const { auth } = usePage<{ auth?: FloatingChatAuth }>().props;
  const [isOpen, setIsOpen] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);

  // Hide the button when the user scrolls near the bottom of the page so it
  // doesn't sit on top of the footer / last dashboard rows.
  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.scrollingElement || document.documentElement;
      const distanceFromBottom = scrollable.scrollHeight - scrollable.scrollTop - window.innerHeight;
      setNearBottom(distanceFromBottom < 160);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Check if user can access ChatGPT
  const userRole = auth?.roles?.[0] || auth?.user?.type;
  const isSuperAdmin = userRole === 'superadmin' || auth?.user?.type === 'superadmin';
  const isCompany = auth?.user?.type === 'company';

  let canUseChatGPT = false;

  if (isSuperAdmin) {
    canUseChatGPT = true;
  } else if (isCompany) {
    // For company users, check their own plan
    const hasActivePlan = auth?.user?.plan_is_active === 1 && auth?.user?.plan;
    canUseChatGPT = !!hasActivePlan && auth?.user?.plan?.enable_chatgpt === 'on';
  } else {
    // For other users, check the plan of the company user who created them
    const creator = auth?.user?.creator;
    const hasActivePlan = creator?.plan_is_active === 1 && creator?.plan;
    canUseChatGPT = !!hasActivePlan && creator?.plan?.enable_chatgpt === 'on';
  }

  // Don't render if user doesn't have access
  if (!canUseChatGPT) {
    return null;
  }

  const handleGenerate = () => {
    // Reserved for post-generation logic (e.g. persisting AI drafts).
  };

  const handleModalOpen = () => {
    setIsOpen(true);
  };

  const handleModalClose = () => {
    setIsOpen(false);
  };

  return createPortal(
    <>
      <div
        className={`fixed bottom-6 rtl:left-6 ltr:right-6 z-40 pointer-events-none cursor-pointer transition-all duration-300 ${nearBottom ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}
        data-chatgpt-button
        style={{ pointerEvents: 'none', zIndex: 40, cursor: 'pointer' }}
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          handleModalOpen();
        }}
        onMouseDownCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleModalOpen();
          }}
          aria-label={t("AI Assistant")}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow pointer-events-auto cursor-pointer"
          size="lg"
          data-chatgpt-button
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
          <Brain className="h-6 w-6" />
        </Button>
      </div>

      <ChatGptModal
        isOpen={isOpen}
        onClose={handleModalClose}
        onGenerate={handleGenerate}
        title={t("AI Assistant")}
        placeholder={t("What would you like me to help you generate?")}
      />
    </>,
    document.body
  );
}