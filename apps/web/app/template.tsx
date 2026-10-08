/**
 * Re-mounts on every navigation (unlike layouts), which gives each page a short
 * fade-in. Opacity only — see .ui-page-enter in foundation.css for why a
 * transform here would break fixed navigation bars. Disabled for reduced motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ui-page-enter">{children}</div>;
}
