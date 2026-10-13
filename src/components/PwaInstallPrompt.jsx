import { useEffect, useMemo, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

function isStandaloneDisplayMode() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplayMode());
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setIsInstalled(isStandaloneDisplayMode());
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const shouldShow = useMemo(
    () => !isInstalled && Boolean(installEvent),
    [installEvent, isInstalled],
  );

  const handleInstall = async () => {
    if (!installEvent) {
      return;
    }

    try {
      setIsInstalling(true);
      await installEvent.prompt();
      const outcome = await installEvent.userChoice;

      if (outcome?.outcome !== 'accepted') {
        setInstallEvent(null);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-[0_18px_60px_-24px_rgba(21,128,61,0.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3">
            <Smartphone className="h-5 w-5 text-emerald-800" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Install CampusFood</p>
            <p className="mt-1 text-sm text-slate-600">
              Add the app to your home screen for a faster, native mobile experience.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          onClick={handleInstall}
          disabled={isInstalling}
        >
          <Download className="mr-2 h-4 w-4" />
          {isInstalling ? 'Opening prompt...' : 'Install App'}
        </button>
      </div>
    </div>
  );
}
