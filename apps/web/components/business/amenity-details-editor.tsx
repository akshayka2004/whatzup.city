'use client';

/**
 * Shared by registration Step 4 (hotel branch) and the hotel section of
 * dashboard settings. Renders the existing amenity selection toggles, and
 * for each *selected* amenity, an expandable list of structured detail
 * entries (a hall, a room type, a menu section, ...) the hotel enters
 * itself. Purely informational — shown on the public business page, does
 * not affect the flat ₹2,500/amenity billing.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HOTEL_AMENITIES, ADDON_PRICE, type HotelAmenities } from '@/lib/hotel-pricing';
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, X } from 'lucide-react';

export type AmenityItem = {
  id: string;
  title: string;
  capacity?: string;
  price?: string;
  features: string[];
  notes?: string;
};

type FieldLabels = {
  title: string; titlePh: string;
  capacity: string; capacityPh: string;
  price: string; pricePh: string;
};

const DEFAULT_LABELS: FieldLabels = {
  title: 'Name', titlePh: 'e.g. Standard Package',
  capacity: 'Capacity', capacityPh: 'e.g. 20 people',
  price: 'Price', pricePh: 'e.g. ₹1,000',
};

const AMENITY_LABELS: Record<string, FieldLabels> = {
  staycationRooms: {
    title: 'Room type', titlePh: 'e.g. Deluxe Room, Suite',
    capacity: 'Capacity', capacityPh: 'e.g. 2 adults + 1 child',
    price: 'Price', pricePh: 'e.g. ₹3,500 / night',
  },
  dayoutPackages: {
    title: 'Package name', titlePh: 'e.g. Full-Day Family Package',
    capacity: 'Group size', capacityPh: 'e.g. up to 6 people',
    price: 'Price', pricePh: 'e.g. ₹1,200 / person',
  },
  venue: {
    title: 'Hall / space name', titlePh: 'e.g. Grand Ballroom',
    capacity: 'Capacity', capacityPh: 'e.g. 200 guests seated',
    price: 'Rental cost', pricePh: 'e.g. ₹25,000 / day',
  },
  fitness: {
    title: 'Facility name', titlePh: 'e.g. Fitness Centre',
    capacity: 'Capacity', capacityPh: 'e.g. 15 people',
    price: 'Price', pricePh: 'e.g. ₹300 / day pass',
  },
  spa: {
    title: 'Service name', titlePh: 'e.g. Deep Tissue Massage',
    capacity: 'Duration', capacityPh: 'e.g. 60 minutes',
    price: 'Price', pricePh: 'e.g. ₹2,000',
  },
  cafe: {
    title: 'Cafe name / section', titlePh: 'e.g. Poolside Cafe',
    capacity: 'Seating', capacityPh: 'e.g. 30 seats',
    price: 'Avg. cost for two', pricePh: 'e.g. ₹800',
  },
  restaurant: {
    title: 'Section name', titlePh: 'e.g. Main Dining Hall',
    capacity: 'Seating capacity', capacityPh: 'e.g. 80 seats',
    price: 'Avg. cost for two', pricePh: 'e.g. ₹1,500',
  },
  buffet: {
    title: 'Meal type', titlePh: 'e.g. Sunday Brunch',
    capacity: 'Timing', capacityPh: 'e.g. 12pm – 3pm',
    price: 'Price per person', pricePh: 'e.g. ₹999',
  },
  bars: {
    title: 'Bar name / type', titlePh: 'e.g. Rooftop Bar',
    capacity: 'Seating', capacityPh: 'e.g. 40 seats',
    price: 'Price range', pricePh: 'e.g. ₹300 – ₹800',
  },
};

export function labelsFor(key: string): FieldLabels {
  return AMENITY_LABELS[key] || DEFAULT_LABELS;
}

function newId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface ItemFormProps {
  labels: FieldLabels;
  initial?: AmenityItem;
  onSave: (item: AmenityItem) => void;
  onCancel: () => void;
}

function ItemForm({ labels, initial, onSave, onCancel }: ItemFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [capacity, setCapacity] = useState(initial?.capacity || '');
  const [price, setPrice] = useState(initial?.price || '');
  const [features, setFeatures] = useState<string[]>(initial?.features || []);
  const [featureInput, setFeatureInput] = useState('');
  const [notes, setNotes] = useState(initial?.notes || '');

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    setFeatures((f) => [...f, v]);
    setFeatureInput('');
  };

  const save = () => {
    if (!title.trim()) return;
    onSave({
      id: initial?.id || newId(),
      title: title.trim(),
      capacity: capacity.trim() || undefined,
      price: price.trim() || undefined,
      features,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`${labels.title} — ${labels.titlePh}`}
        className="h-9 bg-background border-input rounded-lg text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={`${labels.capacity} — ${labels.capacityPh}`}
          className="h-9 bg-background border-input rounded-lg text-xs"
        />
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={`${labels.price} — ${labels.pricePh}`}
          className="h-9 bg-background border-input rounded-lg text-xs"
        />
      </div>
      <div>
        <div className="flex gap-1.5">
          <Input
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
            placeholder="Feature — press Enter to add (e.g. AC, Projector, Sea view)"
            className="h-9 bg-background border-input rounded-lg text-xs"
          />
          <Button type="button" onClick={addFeature} size="sm" variant="outline" className="h-9 rounded-lg px-3 shrink-0">
            Add
          </Button>
        </div>
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {features.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-secondary text-foreground">
                {f}
                <button type="button" onClick={() => setFeatures((fs) => fs.filter((_, idx) => idx !== i))} className="cursor-pointer">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Additional notes (optional)"
        className="w-full p-2.5 bg-background border border-input rounded-lg text-xs text-foreground"
      />
      <div className="flex justify-end gap-2 pt-0.5">
        <Button type="button" onClick={onCancel} size="sm" variant="outline" className="h-8 rounded-lg text-xs">
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={!title.trim()} size="sm" className="h-8 rounded-lg text-xs">
          Save item
        </Button>
      </div>
    </div>
  );
}

interface AmenityDetailsEditorProps {
  amenities: HotelAmenities;
  onAmenitiesChange: (next: HotelAmenities) => void;
  details: Record<string, AmenityItem[]>;
  onDetailsChange: (next: Record<string, AmenityItem[]>) => void;
}

export function AmenityDetailsEditor({ amenities, onAmenitiesChange, details, onDetailsChange }: AmenityDetailsEditorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ key: string; id: string } | null>(null);

  const toggleSelected = (key: string) => {
    const on = !!amenities[key]?.selected;
    onAmenitiesChange({ ...amenities, [key]: { ...amenities[key], selected: !on } });
    if (on) {
      // Deselecting collapses it too, so a stale open panel doesn't linger.
      setExpanded((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const items = (key: string) => details[key] || [];

  const saveItem = (key: string, item: AmenityItem) => {
    const list = items(key);
    const exists = list.some((i) => i.id === item.id);
    onDetailsChange({
      ...details,
      [key]: exists ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item],
    });
    setAdding(null);
    setEditingItem(null);
  };

  const removeItem = (key: string, id: string) => {
    onDetailsChange({ ...details, [key]: items(key).filter((i) => i.id !== id) });
  };

  return (
    <div className="space-y-2">
      {HOTEL_AMENITIES.map((a) => {
        const on = !!amenities[a.key]?.selected;
        const isOpen = expanded.has(a.key);
        const itemList = items(a.key);
        const labels = labelsFor(a.key);
        return (
          <div key={a.key} className={`rounded-xl border transition ${on ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
            <div className="flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => toggleSelected(a.key)}
                className={`flex-1 flex items-center justify-between gap-2 text-left cursor-pointer`}
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">{a.label}</div>
                  {a.subOptions && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.subOptions.join(' · ')}</div>
                  )}
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${on ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {on ? `Selected · ₹${ADDON_PRICE.toLocaleString('en-IN')}` : 'Not selected'}
                </span>
              </button>
              {on && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(a.key)}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded-lg hover:bg-secondary"
                >
                  {itemList.length > 0 ? `${itemList.length} item${itemList.length === 1 ? '' : 's'}` : 'Add details'}
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {on && isOpen && (
              <div className="px-3 pb-3 space-y-2">
                {itemList.map((item) => (
                  editingItem?.key === a.key && editingItem?.id === item.id ? (
                    <ItemForm
                      key={item.id}
                      labels={labels}
                      initial={item}
                      onSave={(it) => saveItem(a.key, it)}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <div key={item.id} className="rounded-xl border border-border bg-background p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground break-words">{item.title}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                          {item.capacity && <span>{labels.capacity}: {item.capacity}</span>}
                          {item.price && <span>{labels.price}: {item.price}</span>}
                        </div>
                        {item.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.features.map((f, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground break-words">{f}</span>
                            ))}
                          </div>
                        )}
                        {item.notes && <p className="text-[11px] text-muted-foreground mt-1.5 break-words">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setEditingItem({ key: a.key, id: item.id })} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => removeItem(a.key, item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                ))}

                {adding === a.key ? (
                  <ItemForm labels={labels} onSave={(it) => saveItem(a.key, it)} onCancel={() => setAdding(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(a.key)}
                    className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-input text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add {labels.title.toLowerCase()}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
