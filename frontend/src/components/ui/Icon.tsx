import React from 'react';

type IconName =
  | 'wallet' | 'chart' | 'trend' | 'activity' | 'zap' | 'briefcase'
  | 'clock' | 'settings' | 'user' | 'users' | 'check' | 'x'
  | 'chevDown' | 'chevRight' | 'chevLeft' | 'arrowUp' | 'arrowDown'
  | 'shield' | 'save' | 'copy' | 'bot' | 'dollar' | 'play' | 'pause'
  | 'history' | 'globe' | 'sim';

interface IconProps {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, style }: IconProps) {
  const s: React.SVGProps<SVGSVGElement> = {
    width: size, height: size,
    strokeWidth: 1.8, fill: 'none', stroke: 'currentColor',
    style,
  };

  const icons: Record<IconName, React.ReactNode> = {
    wallet:    <svg {...s} viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 010-4h12v4"/><path d="M4 6v12a2 2 0 002 2h14V12"/><circle cx="18" cy="14" r="1"/></svg>,
    chart:     <svg {...s} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    trend:     <svg {...s} viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    activity:  <svg {...s} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    zap:       <svg {...s} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    briefcase: <svg {...s} viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
    clock:     <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    settings:  <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.3-6.7l-1.4 1.4M5.7 18.3l-1.4 1.4m0-13.4l1.4 1.4m12.6 12.6l1.4 1.4"/></svg>,
    user:      <svg {...s} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users:     <svg {...s} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    check:     <svg {...s} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    x:         <svg {...s} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    chevDown:  <svg {...s} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
    chevRight: <svg {...s} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
    chevLeft:  <svg {...s} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    arrowUp:   <svg {...s} viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    arrowDown: <svg {...s} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    shield:    <svg {...s} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    save:      <svg {...s} viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
    copy:      <svg {...s} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    bot:       <svg {...s} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
    dollar:    <svg {...s} viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    play:      <svg {...s} viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>,
    pause:     <svg {...s} viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></svg>,
    history:   <svg {...s} viewBox="0 0 24 24"><path d="M3 3v5h5"/><path d="M3 8a9 9 0 1018 0 9 9 0 00-18 0z"/><path d="M12 7v5l3 3"/></svg>,
    globe:     <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10A15 15 0 0112 2z"/></svg>,
    sim:       <svg {...s} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8v4H8z"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="8" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="16" cy="18" r="1"/></svg>,
  };

  return <>{icons[name] ?? null}</>;
}
