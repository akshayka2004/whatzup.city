# Edge cache and origin lock (Cloudflare + nginx)

Two infrastructure changes from the October 2026 audit. Neither can be made from
the codebase; both are a few minutes in the Cloudflare dashboard and on the VPS.

## 1. Cache public pages at Cloudflare

Public pages already send `Cache-Control: s-maxage=120, stale-while-revalidate`
and the HTML is identical for every visitor (sign-in state is applied in the
browser), but Cloudflare does not cache HTML by default (`cf-cache-status: DYNAMIC`).
Phone TTFB on the home page averaged 890 ms; an edge hit is about 50 ms.

Cloudflare dashboard → the `whtzup.city` zone → **Caching → Cache Rules → Create rule**:

- **Name:** Public pages
- **When incoming requests match** (custom filter expression):

  ```
  (http.host eq "platform.whtzup.city")
  and not starts_with(http.request.uri.path, "/api/")
  and not starts_with(http.request.uri.path, "/dashboard")
  and not starts_with(http.request.uri.path, "/admin")
  and not starts_with(http.request.uri.path, "/super-admin")
  and not starts_with(http.request.uri.path, "/staff")
  and not starts_with(http.request.uri.path, "/profile")
  and not starts_with(http.request.uri.path, "/register")
  and not starts_with(http.request.uri.path, "/login")
  and http.request.method eq "GET"
  ```

- **Then:** Eligible for cache. **Edge TTL:** use cache-control header from origin.
  **Browser TTL:** respect origin.

Check after a minute: `curl -sI https://platform.whtzup.city/ | grep -i cf-cache-status`
should show `HIT` on the second request.

Listings change at most every couple of minutes (origin `s-maxage=120`), so no
purge hook is needed. If an urgent takedown must disappear immediately, purge the
URL in Cloudflare → Caching → Configuration → Custom Purge.

## 2. Only accept traffic from Cloudflare

The API rate limit keys on `cf-connecting-ip` when the request comes through our
own proxy. Anyone who reaches nginx directly on the VPS IP could set that header
and dodge per-visitor limits. Lock the origin to Cloudflare:

`/etc/nginx/conf.d/cloudflare-only.conf` (IP lists: https://www.cloudflare.com/ips/):

```nginx
# Real client IP from Cloudflare
real_ip_header CF-Connecting-IP;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
```

Then in the `server` block for `platform.whtzup.city`, allow only those ranges
(copy the same list as `allow` lines, then `deny all;`), or firewall ports 80/443
to Cloudflare ranges with `ufw`. Test with `nginx -t && systemctl reload nginx`,
and confirm the site still loads through Cloudflare.

## 3. Deploys keep the previous build's chunks

`scripts/deploy.sh` now archives the old `.next/static` before building and
merges it back (without overwriting) after, keeping files for two days. Tabs
opened before a deploy keep working instead of hitting missing-chunk errors.
Run deploys with `bash scripts/deploy.sh` rather than the manual steps.
