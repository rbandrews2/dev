import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { wzosTheme, wzosCardClasses } from "@/theme/wzosTheme";

interface Props {
  to?: string;
  onClick?: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
  statusText?: string;
}

export default function LiquidGlassCard({
  to,
  onClick,
  title,
  subtitle,
  icon,
  disabled = false,
  statusText,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    let frameId: number | null = null;

    const updateTransform = () => {
      const rect = node.getBoundingClientRect();
      const center = window.innerHeight / 2;
      const delta = rect.top + rect.height / 2 - center;
      const value = Math.max(-18, Math.min(18, delta * 0.08));
      setOffsetY(value);
    };

    const handleScroll = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateTransform);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerGlow = () => {
    setClicked(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setClicked(false);
    }, 260);
  };

  const className = `
        group 
        relative p-5 rounded-2xl 
        ${wzosCardClasses.hover}
        border
        ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
        overflow-hidden
        text-white
        flex flex-col
        glass-card glass-parallax-card
        ${clicked ? "glass-click-glow" : ""}
      `;

  const content = (
    <>
      {icon && <div className="mb-3 text-amber-200">{icon}</div>}

      <h2 className="font-semibold text-lg tracking-wide">{title}</h2>
      {subtitle && (
        <p className="text-sm text-slate-200/80 mt-1 leading-tight">
          {subtitle}
        </p>
      )}
      {statusText && (
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-amber-200/60">
          {statusText}
        </p>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/6 via-transparent to-white/10 opacity-20" />
      <div className="glass-card-beam pointer-events-none absolute inset-0 opacity-14 group-hover:opacity-24 transition-opacity duration-500" />
    </>
  );

  const style = {
    transform: `translate3d(0, ${offsetY}px, 0)`,
    transition: "transform 0.28s ease-out, box-shadow 0.25s ease",
    background:
      "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.08), transparent 32%)," +
      "radial-gradient(circle at 78% 6%, rgba(255,204,64,0.08), transparent 25%)," +
      "linear-gradient(180deg, rgba(12,12,16,0.64), rgba(4,4,7,0.54))",
    borderColor: "rgba(255,204,64,0.18)",
    boxShadow: `0 18px 40px rgba(0,0,0,0.45), 0 0 28px rgba(255,204,64,0.14)`,
  };

  const sharedProps = {
    ref: cardRef,
    className,
    style,
    onPointerDown: disabled ? undefined : triggerGlow,
  };

  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} {...sharedProps}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      {...sharedProps}
      aria-disabled={disabled}
    >
      {content}
    </button>
  );
}
