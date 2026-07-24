import React, { useState, useEffect } from 'react';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';

interface WhatsAppWidgetProps {
  phone: string;
  message: string;
  position: 'left' | 'right';
  showOnMobile: boolean;
  showOnDesktop: boolean;
  enabled: boolean;
}

export default function WhatsAppWidget({
  phone,
  message,
  position = 'right',
  showOnMobile = true,
  showOnDesktop = true,
  enabled = false
}: WhatsAppWidgetProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [userMessage, setUserMessage] = useState('');

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    if (!enabled || !phone) {
      setIsVisible(false);
      return;
    }

    const shouldShow = (isMobile && showOnMobile) || (!isMobile && showOnDesktop);
    setIsVisible(shouldShow);
  }, [enabled, phone, isMobile, showOnMobile, showOnDesktop]);

  const handleClick = () => {
    if (!phone) return;
    setShowChat(!showChat);
  };

  const handleSendMessage = () => {
    if (!phone) return;
    const finalMessage = userMessage.trim() || message;
    const whatsappUrl = createWhatsAppUrl(phone, finalMessage);
    window.open(whatsappUrl, '_blank');
    setShowChat(false);
    setUserMessage('');
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-6 z-50 ${
        position === 'left' ? 'left-6' : 'right-6'
      }`}
    >
      {/* Mini Chat Interface */}
      {showChat && (
        <div 
          className={`absolute bottom-16 ${
            position === 'left' ? 'left-0' : 'right-0'
          } bg-white rounded-lg shadow-xl border w-80 sm:w-80 xs:w-72 max-w-[calc(100vw-3rem)] transform transition-all duration-300`}
        >
          {/* Chat Header */}
          <div className="bg-green-500 text-white p-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">WhatsApp Chat</h4>
              </div>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="text-white hover:bg-green-600 rounded p-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Chat Body */}
          <div className="p-4 bg-gray-50 min-h-[100px] sm:min-h-[120px]">
            <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm mb-3">
              <p className="text-xs sm:text-sm text-gray-700">Hello! How can I help you today?</p>
              <span className="text-xs text-gray-400">Just now</span>
            </div>
          </div>
          
          {/* Chat Input */}
          <div className="p-2 sm:p-3 border-t bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-green-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 ml-0.5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L18.685 12.283c.377.145.377.72 0 .865L2.003 19.547c-.415.159-.85-.158-.85-.6V15.86c0-.273.16-.526.41-.639L9.61 12.5 1.564 9.778c-.25-.113-.41-.366-.41-.639V4.484c0-.442.435-.759.85-.6z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* WhatsApp Button */}
      <button
        onClick={handleClick}
        className="group bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        aria-label="Contact us on WhatsApp"
      >
        <svg 
          className="w-6 h-6 fill-current" 
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
        </svg>
        
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"></div>
      </button>
    </div>
  );
}