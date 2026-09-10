import React from 'react';

export function SkeletonItem({ className = '' }) {
  return (
    <div className={`animate-pulse bg-surface-hover/80 rounded-lg ${className}`} />
  );
}

export function SkeletonCatedraCard() {
  return (
    <div className="bg-surface rounded-2xl border border-surface-border p-5 space-y-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-16 h-5 bg-surface-hover rounded-full" />
          <div className="w-14 h-5 bg-surface-hover rounded-full" />
        </div>
        <div className="w-4 h-4 bg-surface-hover rounded" />
      </div>
      <div className="w-3/4 h-6 bg-surface-hover rounded-lg" />
      <div className="w-1/2 h-4 bg-surface-hover rounded" />
      <div className="h-16 bg-surface-hover/50 rounded-xl" />
      <div className="pt-3 border-t border-surface-border flex justify-between items-center">
        <div className="w-20 h-4 bg-surface-hover rounded" />
        <div className="w-24 h-8 bg-surface-hover rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border overflow-hidden p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-center pb-2 border-b border-surface-border">
        <div className="w-1/3 h-5 bg-surface-hover rounded" />
        <div className="w-24 h-8 bg-surface-hover rounded-lg" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center py-2">
          <div className="w-8 h-4 bg-surface-hover rounded" />
          <div className="w-24 h-4 bg-surface-hover rounded" />
          <div className="flex-1 h-4 bg-surface-hover rounded" />
          <div className="w-20 h-6 bg-surface-hover rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default {
  SkeletonItem,
  SkeletonCatedraCard,
  SkeletonTable
};
