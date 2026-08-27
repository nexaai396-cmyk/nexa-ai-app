import { CheckCircle2, X } from 'lucide-react';

export interface BannerState {
  visible: boolean;
  message: string;
}

export default function SelfBuildBanner({ banner, onDismiss }: { banner: BannerState; onDismiss: () => void }) {
  if (!banner.visible) return null;
  return (
    <div className="animate-fade-up rounded-xl border border-success/30 bg-success/10 backdrop-blur-md px-4 py-3 flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
      <p className="text-sm text-success font-medium flex-1">{banner.message}</p>
      <button onClick={onDismiss} className="text-success/70 hover:text-success transition" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
