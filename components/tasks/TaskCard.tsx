'use client';

import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => Promise<boolean>;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [showError, setShowError] = useState(false);

  if (task.is_dismissed) return null;

  async function handleComplete() {
    if (isCompleting || task.is_completed) return;
    setIsCompleting(true);
    setShowError(false);

    const succeeded = await onComplete(task.id);

    if (succeeded) {
      setShowDrop(true);
      setTimeout(() => setShowDrop(false), 1500);
    } else {
      setShowError(true);
    }
    setIsCompleting(false);
  }

  return (
    <div className="relative">
      <button
        onClick={handleComplete}
        disabled={isCompleting || task.is_completed}
        className={`flex w-full items-center gap-3 rounded-full border p-3.5 px-4 text-left transition-all duration-300 disabled:cursor-default ${
          task.is_completed
            ? 'border-tile-done-border bg-tile-done'
            : 'border-tile-idle-border bg-tile-idle'
        }`}
      >
        <NotebookPen
          size={28}
          strokeWidth={1.1}
          className={`shrink-0 ${task.is_completed ? 'text-accent' : 'text-text-soft'}`}
        />
        <span className={`flex-1 text-sm ${task.is_completed ? 'text-text' : 'text-text-muted'}`}>
          {task.description}
        </span>
        {task.is_completed && (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.4"
          >
            <polyline points="4,12 10,18 20,6" />
          </svg>
        )}
      </button>

      {showDrop && (
        <span className="animate-water-drop pointer-events-none absolute right-6 top-2 text-xl">
          💧
        </span>
      )}

      {showError && (
        <p className="mt-2 text-sm text-text-muted">
          That did not work. Please try again.
        </p>
      )}
    </div>
  );
}
