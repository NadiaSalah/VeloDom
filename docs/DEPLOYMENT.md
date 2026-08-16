# VeloDom Deployment Recipes

VeloDom applications build to static assets in `dist/`. The hosting target
should serve real files and generated SEO route folders first, then fall back
unknown client-side routes to `/index.html`.

## Build Output

```bash
npm run build
```

Expected output:

```text
dist/
  index.html
  features/index.html
  blog/posts/html-first/index.html
  assets/*
  sitemap.xml
  robots.txt
```

Generated route HTML gives crawlers and no-JavaScript visitors meaningful
metadata and summary content. The client router still takes over after the
browser loads JavaScript.

## Static Host Rule

Use this mental model for every provider:

```text
try real file -> try generated directory -> fallback to /index.html
```

## Vercel

Create `vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Build command: `npm run build`

Output directory: `dist`

Verify direct generated routes such as `/features/` and
`/blog/posts/html-first/` after deployment.

## Netlify

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-cache"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Netlify serves existing files before redirects, so generated SEO route folders
continue to work.

## Cloudflare Pages

Project settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: none or Vite

Create `public/_redirects` if the project needs SPA fallback rules copied into
`dist`:

```text
/* /index.html 200
```

Cloudflare Pages serves static files before fallback redirects.

## Nginx

```nginx
server {
  root /var/www/velodom/dist;

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Apache

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>

<FilesMatch "\.html$">
  Header set Cache-Control "no-cache"
</FilesMatch>
```

## GitHub Pages

GitHub Pages has no server rewrite support. For SPA route recovery, copy the
shell to `404.html` after build:

```bash
npm run build
cp dist/index.html dist/404.html
```

Generated SEO folders still work when visited directly, but unknown dynamic
routes recover through the GitHub Pages 404 shell.

## Node Static Preview

For a simple production-like local preview without provider behavior:

```bash
npm run build
npx serve dist --single
```

If you avoid `npx`, use Vite's built-in preview command:

```bash
npm run preview
```

Provider-specific cache headers and rewrites should still be verified on the
actual host before release.

## Verification Checklist

Before calling a deployment ready:

1. Open `/` directly.
2. Open a generated route directly, for example `/features/`.
3. Open a dynamic SEO entry directly, for example `/blog/posts/html-first/`.
4. Open an unknown client route and confirm the SPA fallback loads.
5. Inspect page source before JavaScript and confirm title, description,
   canonical, and visible SEO fallback content exist where expected.
6. Confirm hashed files under `/assets/` use long-lived cache headers.
