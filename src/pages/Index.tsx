
import React, { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, Brain, MapPin, CalendarCheck, WifiOff, Clipboard, ClipboardList, Map, Clock, MessageSquare, GraduationCap, Video, Building2 } from "lucide-react";
import AuthLandingCard from "@/components/auth/AuthLandingCard";
import { GlassCard } from "@/components/GlassCard";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import InstallExperience from "@/components/install/InstallExperience";

type SavedWorkOrder = {
  id?: string;
  title?: string;
  jobName?: string;
  location?: string;
  status?: "pending" | "in-progress" | "completed";
  assignee?: string;
  crewLead?: string;
  assigneeImage?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
};

type HomeCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  to?: string;
  active?: boolean;
  lockedMessage?: string;
  placeholder?: boolean;
};

type PermissionKey = "location" | "media" | "notifications";
type PermissionStateLabel = "granted" | "prompt" | "denied" | "default" | "unsupported" | "checking";

const Index: React.FC = () => {
  const [showInstallNudge, setShowInstallNudge] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [installChecklist, setInstallChecklist] = useState({
    location: false,
    media: false,
    notifications: false,
    license: false,
  });
  const [permissionStates, setPermissionStates] = useState<Record<PermissionKey, PermissionStateLabel>>({
    location: "checking",
    media: "checking",
    notifications: "checking",
  });
  const videoEnabled =
    (import.meta.env.VITE_VIDEO_CONFERENCE_ENABLED ?? "true").toLowerCase() !== "false";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const installIntent = searchParams.get("install") === "1" || searchParams.get("setup") === "install";
  const [savedWorkOrders, setSavedWorkOrders] = useState<SavedWorkOrder[]>([]);
  const { isInstallable, isInstalled: pwaInstalled, updateAvailable, promptInstall, applyUpdate } = usePWAInstall();

  useEffect(() => {
    const installedFlag = localStorage.getItem("wzos_pwa_installed") === "1";
    const isStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (installIntent && !installedFlag && !isStandalone && !pwaInstalled) {
      setShowInstallNudge(true);
    } else {
      setShowInstallNudge(false);
    }
    if (installedFlag || isStandalone || pwaInstalled) {
      setIsInstalled(true);
    }

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallNudge(false);
      localStorage.setItem("wzos_pwa_installed", "1");
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => window.removeEventListener("appinstalled", handleAppInstalled);
  }, [installIntent, pwaInstalled]);

  useEffect(() => {
    if (updateAvailable && installIntent) {
      setShowInstallNudge(true);
      localStorage.removeItem("wzos_install_dismissed");
    }
  }, [installIntent, updateAvailable]);

  useEffect(() => {
    const updatePermissionState = async () => {
      const next: Record<PermissionKey, PermissionStateLabel> = {
        location: navigator.geolocation ? "prompt" : "unsupported",
        media: navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported",
        notifications: "Notification" in window ? (Notification.permission as PermissionStateLabel) : "unsupported",
      };

      if (navigator.permissions?.query) {
        try {
          const geo = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          next.location = geo.state as PermissionStateLabel;
          geo.onchange = () => {
            const state = geo.state as PermissionStateLabel;
            setPermissionStates((current) => ({ ...current, location: state }));
            setInstallChecklist((current) => ({ ...current, location: state === "granted" }));
          };
        } catch {
          next.location = navigator.geolocation ? "prompt" : "unsupported";
        }

        try {
          const mic = await navigator.permissions.query({ name: "microphone" as PermissionName });
          next.media = mic.state as PermissionStateLabel;
          mic.onchange = () => {
            const state = mic.state as PermissionStateLabel;
            setPermissionStates((current) => ({ ...current, media: state }));
            setInstallChecklist((current) => ({ ...current, media: state === "granted" }));
          };
        } catch {
          next.media = navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported";
        }

        try {
          const notifications = await navigator.permissions.query({ name: "notifications" as PermissionName });
          next.notifications = notifications.state as PermissionStateLabel;
          notifications.onchange = () => {
            const state = notifications.state as PermissionStateLabel;
            setPermissionStates((current) => ({ ...current, notifications: state }));
            setInstallChecklist((current) => ({ ...current, notifications: state === "granted" }));
          };
        } catch {
          next.notifications = "Notification" in window ? (Notification.permission as PermissionStateLabel) : "unsupported";
        }
      }

      setPermissionStates(next);
      setInstallChecklist((current) => ({
        ...current,
        location: next.location === "granted",
        media: next.media === "granted",
        notifications: next.notifications === "granted",
      }));
    };

    void updatePermissionState();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wzos_work_orders");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedWorkOrders(parsed);
      }
    } catch (err) {
      console.warn("Could not load saved work orders", err);
    }
  }, []);

  const hideInstallNudge = () => {
    setShowInstallNudge(false);
    localStorage.setItem("wzos_install_dismissed", "1");
  };

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      toast.error("Location unavailable", { description: "Your browser does not support location." });
      return false;
    }
    setPermissionNote("Requesting location access for navigation...");
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionStates((current) => ({ ...current, location: "granted" }));
          setInstallChecklist((current) => ({ ...current, location: true }));
          resolve(true);
        },
        () => {
          toast.error("Location is required for navigation.");
          setPermissionStates((current) => ({ ...current, location: "denied" }));
          resolve(false);
        },
        { timeout: 8000 }
      );
    });
  };

  const requestMediaPermissions = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera/mic unavailable", { description: "Browser cannot request video or microphone." });
      return false;
    }
    setPermissionNote("Requesting camera and microphone for video conference...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionStates((current) => ({ ...current, media: "granted" }));
      setInstallChecklist((current) => ({ ...current, media: true }));
      return true;
    } catch (err) {
      toast.error("Camera and microphone are needed for video conferencing.");
      setPermissionStates((current) => ({ ...current, media: "denied" }));
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications unavailable", { description: "Your browser does not support notifications." });
      setPermissionStates((current) => ({ ...current, notifications: "unsupported" }));
      return false;
    }
    setPermissionNote("Requesting notifications for crew alerts and app updates...");
    const result = await Notification.requestPermission();
    setPermissionStates((current) => ({ ...current, notifications: result as PermissionStateLabel }));
    setInstallChecklist((current) => ({ ...current, notifications: result === "granted" }));
    if (result !== "granted") {
      toast.error("Notifications are blocked.", {
        description: "You can enable them later in your browser site settings.",
      });
      return false;
    }
    return true;
  };

  const requestPermission = (key: PermissionKey) => {
    if (key === "location") void requestLocationPermission();
    if (key === "media") void requestMediaPermissions();
    if (key === "notifications") void requestNotificationPermission();
  };

  const handleInstall = async () => {
    if (isInstalled) {
      toast.success("Already installed", { description: "Work Zone OS is on your home screen." });
      hideInstallNudge();
      return;
    }
    setInstalling(true);
    setPermissionNote(null);
    toast.info("Location permission", { description: "Needed so Navigation knows where you are." });
    const locationOk = await requestLocationPermission();
    if (!locationOk) {
      setInstalling(false);
      return;
    }
    toast.info("Camera + mic permissions", {
      description: "Needed for joining video conferences with your crew.",
    });
    const mediaOk = await requestMediaPermissions();
    if (!mediaOk) {
      setInstalling(false);
      return;
    }
    toast.info("Notifications", {
      description: "Needed for crew alerts and app update notices.",
    });
    await requestNotificationPermission();
    setPermissionNote(null);
    hideInstallNudge();
    if (!isInstallable) {
      setInstalling(false);
      toast.info("Add to home screen", {
        description: "Use your browser menu to add Work Zone OS with the WZOS logo shortcut.",
      });
      return;
    }
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      setIsInstalled(true);
      localStorage.setItem("wzos_pwa_installed", "1");
      toast.success("Installed", { description: "Shortcut added with the WZOS logo icon." });
    } else {
      toast.info("Install dismissed", { description: "You can install later from the browser menu." });
    }
  };

  const handleViewWorkOrders = () => {
    if (savedWorkOrders.length === 0) {
      toast.info("No work orders yet", {
        description: "Admins and owners create work orders in the Admin Console.",
      });
    }
    navigate("/work-orders");
  };

  const handleLater = () => hideInstallNudge();

  const handleUpdate = () => {
    const updating = applyUpdate();
    if (!updating) {
      toast.info("No update is waiting yet.");
    }
  };

  const handleChecklistChange = (
    key: "location" | "media" | "notifications" | "license",
    value: boolean,
  ) => {
    setInstallChecklist((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const cards: HomeCard[] = [
    {
      title: "Organization",
      description: "Create or manage your company workspace.",
      icon: <Building2 className="w-5 h-5" />,
      to: "/organization",
      active: true,
    },
    {
      title: "Forms Hub",
      description: "All safety and ops forms",
      icon: <ClipboardList className="w-5 h-5" />,
      to: "/forms/hub",
      active: true,
    },
    {
      title: "Time Clock",
      description: "Clock-in/out tracking",
      icon: <Clock className="w-5 h-5" />,
      active: true,
      to: "/timeclock",
    },
    {
      title: "Work Orders",
      description: "Review assigned work orders",
      icon: <Clipboard className="w-5 h-5" />,
      active: true,
      to: "/work-orders",
    },
    {
      title: "Messages",
      description: "Crew messaging",
      icon: <MessageSquare className="w-5 h-5" />,
      to: "/messages",
      active: true,
    },
    {
      title: "Training / Video Center",
      description: "Courses and video modules",
      icon: <GraduationCap className="w-5 h-5" />,
      to: "/training",
      active: true,
    },
    {
      title: "Navigation / Maps",
      description: "Online + offline navigation",
      icon: <Map className="w-5 h-5" />,
      to: "/navigation",
      active: true,
    },
    {
      title: "Scheduling",
      description: "Daily, weekly, and editor views",
      icon: <CalendarCheck className="w-5 h-5" />,
      to: "/scheduling",
      active: true,
    },
    {
      title: "Video Conference",
      description: "Join live meetings and briefings",
      icon: <Video className="w-5 h-5" />,
      to: "/video-conference",
      active: videoEnabled,
      lockedMessage: "Video conferencing is available upon activation.",
    },
    ...(savedWorkOrders.length > 0
      ? [
          {
            title: savedWorkOrders[0].jobName || "Latest Work Order",
            description: savedWorkOrders[0].location || "Recently created work order",
            icon: <Clipboard className="w-5 h-5" />,
            to: "/work-orders",
            active: true,
          },
        ]
      : []),
  ];

  const renderCard = (card: HomeCard) => {
    if (card.placeholder) {
      return (
        <GlassCard
          key={card.title}
          className="h-full p-5 relative overflow-hidden group"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(255,165,0,0.08), rgba(0,0,0,0.75)), radial-gradient(circle at 20% 30%, rgba(255, 204, 64, 0.16), transparent 48%)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-75 group-hover:opacity-95 transition-opacity duration-300 flex items-center justify-center">
            <img
              src="/wzos-logo.svg"
              alt="WZOS logo"
              className="w-[80%] h-[80%] object-contain opacity-50 blur-[0.4px] drop-shadow-[0_0_20px_rgba(255,239,0,0.35)]"
            />
          </div>
          <div className="relative space-y-2">
            <div className="w-11 h-11 rounded-2xl border border-orange-400/30 bg-black/70 flex items-center justify-center text-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.35)]">
              {card.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="text-sm text-orange-100/75">{card.description}</p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-orange-200/65">
              Branded placeholder
            </p>
          </div>
        </GlassCard>
      );
    }

    const body = (
      <GlassCard
        className={`h-full p-5 flex flex-col gap-3 ${card.active ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
      >
        <div className="w-11 h-11 rounded-2xl border border-orange-400/30 bg-black/50 flex items-center justify-center text-orange-300">
          {card.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{card.title}</h3>
          <p className="text-sm text-orange-100/75">{card.description}</p>
        </div>
        {!card.active && (
          <p className="text-[11px] uppercase tracking-[0.14em] text-orange-200/70">
            Available upon activation
          </p>
        )}
      </GlassCard>
    );

    if (card.active && card.to) {
      return (
        <Link key={card.title} to={card.to} className="focus:outline-none">
          {body}
        </Link>
      );
    }

    return (
      <button
        key={card.title}
        type="button"
        onClick={() =>
          toast.info("Available upon activation", {
            description:
              card.lockedMessage || "This feature can be enabled for your organization.",
          })
        }
        className="text-left"
      >
        {body}
      </button>
    );
  };

  return (
    <div className="space-y-10">
      {/* Hero / Story block */}
      <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 shadow-glow p-6 md:p-10 bg-black">
        <div className="absolute inset-0">
          <img
            src="/hero-construction.png"
            alt="Night highway work zone"
            className="h-full w-full object-cover scale-105 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/85" />
          <div className="absolute inset-0 bg-orange-500/15 mix-blend-screen" />
        </div>

        <div className="relative grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-3 rounded-full bg-black/60 border border-orange-400/40 px-3 py-2 backdrop-blur"
              >
                <img
                  src="/wzos-logo.svg"
                  alt="Work Zone OS"
                  className="h-8 w-auto"
                />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-orange-200 text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                The Operating System for Road Crews
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight">
              Work Zone OS
            </h1>
            <p className="text-lg text-orange-100/85 max-w-3xl">
              Work Zone OS is a centralized operations platform designed to modernize how road crews and field teams manage daily work in active and regulated environments. It brings together essential functions—including digital forms, inspections, training, scheduling, messaging, and compliance tracking—into a single, secure system that is accessible from any device.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleViewWorkOrders}
                className="bg-orange-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-orange-400 hover:shadow-glow-strong transition-all"
              >
                View Work Orders
              </button>
              <button
                type="button"
                onClick={() => window.open("https://workzoneos.org/#purchase", "_blank", "noopener,noreferrer")}
                className="border border-emerald-400/40 text-emerald-200 px-6 py-3 rounded-xl font-semibold hover:bg-white/5 transition-all"
              >
                Purchase Or Gain Access
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-orange-100/85">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-300" />
                SOC2-ready data handling
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-orange-300" />
                Offline-first navigation
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-orange-300" />
                Embedded AI assistant
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-300" />
                Live hazard mapping
              </div>
            </div>
          </div>

          <div className="relative glass-surface rounded-2xl border border-orange-500/30 p-6 lg:p-8 backdrop-blur-md bg-black/50">
            <div className="absolute -top-10 -right-6 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-orange-400/30 bg-orange-500/10 flex items-center justify-center text-orange-200 shadow-glow">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-orange-100/80 mb-1">AI Crew Companion</p>
                <h3 className="text-xl font-semibold text-white">Atlas - Safety + Ops</h3>
                <p className="text-sm text-orange-100/70 mt-2">
                  Predictive alerts, crew briefings, and automatic report drafting baked into the workflow.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-orange-500/25 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-orange-100/70">Active Work Orders</p>
                <p className="text-2xl font-bold text-white mt-1">28</p>
                <p className="text-xs text-orange-200/80 mt-1">+12% from last week</p>
              </div>
              <div className="rounded-xl border border-orange-500/25 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-orange-100/70">Total Hours Today</p>
                <p className="text-2xl font-bold text-white mt-1">25.5</p>
                <p className="text-xs text-orange-200/80 mt-1">Crew-wide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full" id="signin-card">
        <AuthLandingCard
          title="Sign in or create an account"
          subtitle="One login for DVIR, forms, messaging, and navigation."
        />
      </div>

      {/* Card Grid for quick access */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl border border-orange-500/25 bg-black/50 flex items-center justify-center text-orange-300">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Access modules</h2>
            <p className="text-sm text-orange-100/75">Key destinations for your crew.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(renderCard)}
        </div>
      </section>

      <InstallExperience
        visible={installIntent && ((showInstallNudge && !isInstalled) || updateAvailable)}
        installable={isInstallable}
        installed={isInstalled || pwaInstalled}
        updateAvailable={updateAvailable}
        installing={installing}
        permissionNote={permissionNote}
        checklist={installChecklist}
        permissionStates={permissionStates}
        onChecklistChange={handleChecklistChange}
        onPermissionRequest={requestPermission}
        onInstall={handleInstall}
        onUpdate={handleUpdate}
        onLater={handleLater}
      />
    </div>
  );
};

export default Index;
