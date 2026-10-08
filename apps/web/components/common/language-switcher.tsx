'use client';

import { Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LOCALES } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/provider';

/** English / മലയാളം toggle. Compact icon button; the menu shows each language in its own script. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.language')}
          className="ui-press h-11 w-11 rounded-lg md:h-9 md:w-9"
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLocale(l.code)}
            className="min-h-11 justify-between gap-3 text-sm"
          >
            <span lang={l.code}>{l.native}</span>
            {locale === l.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
