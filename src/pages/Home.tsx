import { useNavigate } from "react-router-dom";
import LiquidGlassCard from "@/components/ui/LiquidGlassCard";
import { toast } from "sonner";
import {
  Building2,
  ClipboardList,
  MapPin,
  GraduationCap,
  Clock,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Organization",
      subtitle: "Create or manage your workspace",
      icon: <Building2 className="w-5 h-5" />,
      onClick: () => navigate("/organization"),
    },
    {
      title: "Daily Forms",
      subtitle: "C85, JSA, DVIR, Incident & more",
      icon: <ClipboardList />,
      onClick: () => navigate("/forms/hub"),
    },
    {
      title: "GPS Navigation",
      subtitle: "Online & offline navigation",
      icon: <MapPin />,
      onClick: () => navigate("/navigation"),
    },
    {
      title: "Training Center",
      subtitle: "PMT, Flagger & safety modules",
      icon: <GraduationCap />,
      onClick: () => navigate("/training"),
    },
    {
      title: "Crew Schedule",
      subtitle: "View upcoming jobs & shifts",
      icon: <Clock />,
      onClick: () => navigate("/scheduling"),
    },
    {
      title: "Messages",
      subtitle: "Internal crew communication",
      icon: <MessageSquare />,
      onClick: () => navigate("/messages"),
    },
    {
      title: "Hazard Map",
      subtitle: "See active zones & alerts",
      icon: <AlertTriangle />,
      onClick: () => navigate("/navigation/hazard"),
    },
    {
      title: "Weather",
      subtitle: "Conditions near your location",
      icon: <AlertTriangle />,
      onClick: () => navigate("/navigation/weather"),
    },
  ];

  return (
    <div className="space-y-6 text-orange-200">
      <div className="rounded-2xl border border-orange-500/25 bg-black/60 p-5 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-wide">
          Crew Dashboard
        </h1>
        <p className="text-sm text-orange-100/75 mt-2">
          Access daily forms, navigation, training, and scheduling. Locked modules show an activation notice instead of routing to missing pages.
        </p>
      </div>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <LiquidGlassCard
              key={card.title}
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              disabled={card.locked}
              statusText={card.locked ? "Available upon activation" : undefined}
              onClick={
                card.locked
                  ? () => toast.info("Available upon activation")
                  : card.onClick
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
