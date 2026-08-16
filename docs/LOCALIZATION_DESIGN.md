# VeloDom Localization Design

Status: approved V2 research direction. V1's direction plugin manages document
`lang` and `dir`; it intentionally does not translate application copy.

## Build-Time Model

A future optional localization plugin should accept explicit local dictionaries
and emit locale route/SEO artifacts during the build. It must support normal
HTML files and preserve a no-plugin path for applications that use another
translation system.

The minimum viable contract is:

- dictionary files are application-owned;
- locale routes are explicit and static where possible;
- compiler analysis reports missing keys and unused keys;
- page config provides locale-aware title, description, canonical, and
  alternate-link metadata;
- remote providers, CMS loaders, and runtime dictionary fetching stay outside
  Core as optional adapters or application code.

No `vd-i18n` directive will be added until static extraction and diagnostics
are proven. This avoids a hidden translation runtime for applications that only
need one language.
