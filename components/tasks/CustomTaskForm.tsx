'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CustomTaskFormProps {
  onAdd: (description: string) => Promise<void>;
  onCancel: () => void;
}

export function CustomTaskForm({ onAdd, onCancel }: CustomTaskFormProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    await onAdd(description.trim());
    setLoading(false);
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-none border border-border bg-surface p-4">
      <Input
        placeholder="What would you like to do?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !description.trim()}>
          {loading ? 'Adding…' : 'Add'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
