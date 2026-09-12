import React from 'react';

export function SkeletonItem({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-surface-hover/80 rounded-lg ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-border/50 to-transparent animate-shimmer" />
    </div>
  );
}

export function SkeletonCatedraCard({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="relative overflow-hidden bg-white/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/40 dark:via-white/5 to-transparent animate-shimmer pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-16 h-5 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
              <div className="w-14 h-5 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="w-4 h-4 bg-slate-200/70 dark:bg-slate-800 rounded" />
          </div>
          <div className="w-3/4 h-6 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
          <div className="w-1/2 h-4 bg-slate-200/70 dark:bg-slate-800 rounded" />
          <div className="h-16 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl" />
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex justify-between items-center">
            <div className="w-20 h-4 bg-slate-200/70 dark:bg-slate-800 rounded" />
            <div className="w-24 h-8 bg-slate-200/70 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </>
  );
}

export const SkeletonCard = SkeletonCatedraCard;

export function SkeletonBentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 animate-pulse">
      {/* Box 1: Hero */}
      <div className="md:col-span-2 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 p-6 h-60" />
      {/* Box 2 */}
      <div className="rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 p-6 h-60" />
      {/* Box 3 */}
      <div className="rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 p-6 h-60" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="relative overflow-hidden bg-surface rounded-2xl border border-surface-border p-4 space-y-3 shadow-xs">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-hover/50 to-transparent animate-shimmer pointer-events-none" />
      <div className="flex justify-between items-center pb-2 border-b border-surface-border">
        <div className="w-1/3 h-5 bg-surface-hover rounded" />
        <div className="w-24 h-8 bg-surface-hover rounded-lg" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center py-2.5">
          <div className="w-8 h-4 bg-surface-hover rounded" />
          <div className="w-24 h-4 bg-surface-hover rounded" />
          <div className="flex-1 h-4 bg-surface-hover rounded" />
          <div className="w-20 h-6 bg-surface-hover rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CatedraDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top back button skeleton */}
      <div className="w-40 h-4 bg-slate-200/70 dark:bg-slate-800 rounded-lg mb-3.5" />

      {/* Bento Header Skeleton */}
      <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 space-y-6 shadow-xs relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/30 dark:via-white/5 to-transparent animate-shimmer pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-3 w-full max-w-xl">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-20 h-6 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
              <div className="w-16 h-6 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
              <div className="w-28 h-6 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
              <div className="w-36 h-6 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
            </div>

            {/* Title skeleton */}
            <div className="w-3/4 h-8 bg-slate-200/80 dark:bg-slate-800 rounded-xl" />

            {/* Schedules skeleton */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200/70 dark:bg-slate-800 rounded" />
              <div className="w-48 h-5 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
            </div>
          </div>

          {/* Quick stats on right */}
          <div className="flex items-center gap-3 bg-slate-100/60 dark:bg-white/[0.04] p-3 sm:p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shrink-0">
            <div className="w-16 h-10 bg-slate-200/60 dark:bg-slate-800 rounded-lg" />
            <div className="h-7 w-px bg-slate-200/80 dark:bg-white/10" />
            <div className="w-16 h-10 bg-slate-200/60 dark:bg-slate-800 rounded-lg" />
            <div className="h-7 w-px bg-slate-200/80 dark:bg-white/10" />
            <div className="w-20 h-10 bg-slate-200/60 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>

        {/* Tab pills bar */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-200/60 dark:border-white/10 pt-4">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="w-28 h-10 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Bento Progress / Alert Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-28 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 p-5" />
        <div className="h-28 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 p-5" />
      </div>

      {/* Main Tab Table Skeleton */}
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}

export default {
  SkeletonItem,
  SkeletonCatedraCard,
  SkeletonTable,
  CatedraDetailSkeleton
};
