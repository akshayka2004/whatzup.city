import { ImageResponse } from 'next/og';
import { serverGet, unwrapOne } from '@/lib/server-api';

export const alt = 'Business on Whtzup.city';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 600;

// ImageResponse can't read CSS variables, so the palette is spelled out as hex.
const C = {
  bg: '#F7F7FB',
  card: '#FFFFFF',
  primary: '#4338CA',
  ink: '#1C1B2E',
  muted: '#5E5D75',
};

/** The bundled font only draws Latin glyphs — drop anything else (e.g. Malayalam) instead of printing boxes. */
const drawable = (t: unknown) =>
  String(t ?? '')
    .replace(/[^ -ɏ‐-‧]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const clip = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

function nameSize(len: number) {
  if (len <= 20) return 92;
  if (len <= 32) return 76;
  if (len <= 48) return 62;
  return 50;
}

function StarIcon({ on }: { on: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={C.primary}
        fillOpacity={on ? 1 : 0.2}
      />
    </svg>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  let biz: any = null;
  try {
    const { id } = await params;
    biz = unwrapOne<any>(
      await serverGet(`/v1/businesses/${encodeURIComponent(id)}`, {
        revalidate: 600,
        timeoutMs: 3000,
      }),
    );
    if (!biz || typeof biz.name !== 'string') biz = null;
  } catch {
    biz = null;
  }

  const name =
    clip(drawable(biz?.name), 72) || (biz ? 'Local business' : "Kerala's trusted local directory");
  const category =
    clip(drawable(biz?.category?.name), 40) || (biz ? '' : 'Discover local businesses');
  const place = clip(
    [drawable(biz?.district || biz?.city), drawable(biz?.state)].filter(Boolean).join(', '),
    48,
  );
  const rating = Number(biz?.averageRating) || 0;
  const reviews = Number(biz?.totalReviews ?? biz?._count?.reviews) || 0;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: C.bg,
        padding: 44,
      }}
    >
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: C.card,
          borderRadius: 40,
          padding: '52px 64px 52px 80px',
          overflow: 'hidden',
          border: '2px solid rgba(102,112,133,0.2)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 18,
            background: C.primary,
            display: 'flex',
          }}
        />

        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: C.primary,
                color: '#FFFFFF',
                fontSize: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              W
            </div>
            <div style={{ marginLeft: 16, fontSize: 32, color: C.ink, display: 'flex' }}>
              Whtzup.city
            </div>
          </div>
          {biz?.isVerified && (
            <div
              style={{
                display: 'flex',
                padding: '8px 22px',
                borderRadius: 999,
                border: `2px solid ${C.primary}`,
                color: C.primary,
                fontSize: 26,
              }}
            >
              Verified
            </div>
          )}
        </div>

        {/* Name block */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {category && (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: '8px 24px',
                borderRadius: 999,
                background: 'rgba(184,111,80,0.12)',
                color: C.primary,
                fontSize: 30,
                marginBottom: 24,
              }}
            >
              {category}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: nameSize(name.length),
              lineHeight: 1.08,
              color: C.ink,
            }}
          >
            {name}
          </div>
          {place && (
            <div style={{ display: 'flex', marginTop: 22, fontSize: 34, color: C.muted }}>
              {place}
            </div>
          )}
        </div>

        {/* Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', height: 56 }}>
          {rating > 0 ? (
            <>
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} on={n <= Math.round(rating)} />
              ))}
              <div style={{ display: 'flex', marginLeft: 12, fontSize: 38, color: C.ink }}>
                {rating.toFixed(1)}
              </div>
              {reviews > 0 && (
                <div style={{ display: 'flex', marginLeft: 14, fontSize: 30, color: C.muted }}>
                  {`(${reviews} review${reviews === 1 ? '' : 's'})`}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', fontSize: 30, color: C.muted }}>
              Offers, reviews and opening hours on Whtzup.city
            </div>
          )}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
