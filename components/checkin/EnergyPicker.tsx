'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLocalDateString } from '@/lib/dates';

const ENERGY_LABELS = [
  'Deeply tired',
  'Very low energy',
  'Low energy',
  'Some energy',
  'Good energy',
  'Full of energy',
];

interface EnergyPickerProps {
  onSaved: (energyLevel: number) => void;
}

export function EnergyPicker({ onSaved }: EnergyPickerProps) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  async function handleSelect(level: number) {
    if (saving) return;
    setSaving(true);
    setSelected(level);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const today = getLocalDateString();

    const { error } = await supabase
      .from('daily_checkins')
      .upsert(
        { user_id: user.id, date: today, energy_level: level },
        { onConflict: 'user_id,date' }
      );

    if (!error) {
      await supabase.rpc('generate_daily_tasks', {
        p_user_id: user.id,
        p_date: today,
        p_energy_level: level,
      });
      onSaved(level);
    } else {
      setSaving(false);
      setSelected(null);
    }
  }

  return (
    <div className="w-full max-w-sm text-center">
      <p className="mb-4 text-sm text-text-muted">How much energy do you have today?</p>
      <div className="flex items-center justify-center gap-2">
        {ENERGY_LABELS.map((label, i) => {
          const level = i + 1;
          const isSelected = selected === level;
          return (
            <button
              key={level}
              onClick={() => handleSelect(level)}
              disabled={saving}
              aria-label={label}
              style={{ width: 40, height: 40 }}
              className={`flex shrink-0 items-center justify-center rounded-full border text-sm transition-all duration-300 disabled:opacity-60 ${
                isSelected
                  ? 'border-tile-done-border bg-tile-done text-text'
                  : 'border-tile-idle-border bg-tile-idle text-text-muted'
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>
    </div>
  );
}
