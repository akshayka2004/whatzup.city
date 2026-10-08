import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Our type-scale utilities (globals.css @utility text-*) are font sizes, not colours.
// Without this, twMerge would treat `text-title` as a text colour and drop it next to `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'title', 'heading', 'body', 'label', 'caption', 'overline', 'metric'] },
      ],
      shadow: [{ shadow: ['e1', 'e2', 'e3', 'brand'] }],
      rounded: [{ rounded: ['control', 'card', 'sheet'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
