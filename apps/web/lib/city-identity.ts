/**
 * Per-city visual identity for the dynamic hero. Each city gets a landmark line
 * and an accent hue (OKLCH hue angle) used to tint the hero gradient, so
 * switching city visibly changes the banner without needing per-city imagery.
 * Cities not listed fall back to the generic Kerala identity.
 */
export type CityIdentity = {
  landmark: string;
  /** OKLCH hue angle for the hero gradient tint */
  hue: number;
};

const CITY_IDENTITY: Record<string, CityIdentity> = {
  Thiruvananthapuram: { landmark: 'Capital city · Padmanabhaswamy & the Secretariat', hue: 43 },
  Kochi: { landmark: 'Queen of the Arabian Sea · Fort Kochi & the harbour', hue: 220 },
  Kozhikode: { landmark: 'City of spices · Beach & SM Street', hue: 30 },
  Kollam: { landmark: 'Gateway to the backwaters · Ashtamudi Lake', hue: 190 },
  Thrissur: { landmark: 'Cultural capital · Vadakkunnathan & Thrissur Pooram', hue: 12 },
  Kannur: { landmark: 'Land of looms & lore · Fort & beaches', hue: 150 },
  Palakkad: { landmark: 'Gateway of Kerala · Fort & paddy plains', hue: 130 },
  Alappuzha: { landmark: 'Venice of the East · Backwaters & houseboats', hue: 200 },
  Kottayam: { landmark: 'Land of letters, latex & lakes', hue: 160 },
  Malappuram: { landmark: 'Hills, heritage & football', hue: 140 },
  Guruvayoor: { landmark: 'Temple town · Sree Krishna Temple', hue: 55 },
};

const DEFAULT_IDENTITY: CityIdentity = {
  landmark: 'Everything happening across Kerala',
  hue: 43,
};

export function getCityIdentity(city?: string | null): CityIdentity {
  if (!city) return DEFAULT_IDENTITY;
  return CITY_IDENTITY[city] ?? { landmark: `Discover ${city}`, hue: 43 };
}
