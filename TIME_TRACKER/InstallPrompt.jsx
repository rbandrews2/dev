import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-slate-800 border-2 border-orange-500 rounded-2xl p-4 shadow-2xl z-50 max-w-md mx-auto">
      <button
        onClick={() => setShowPrompt(false)}
        className="absolute top-2 right-2 text-slate-400 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-3 bg-orange-500/20 rounded-xl">
          <Download className="w-6 h-6 text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">
            Install Time Clock App
          </h3>
          <p className="text-slate-400 text-sm mb-3">
            Add to your home screen for quick access and offline use
          </p>
          <button
            onClick={handleInstall}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-xl"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}