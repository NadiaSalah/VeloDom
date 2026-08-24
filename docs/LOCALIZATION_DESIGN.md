# VeloDom Localization Design

Status: V1.1 optional build-time localization is shipped. It strengthens static
multilingual sites without a translation provider, global locale state,
template-specific message syntax, or server requirement.

## Shipped Boundary

`velodom/localization` contains application-owned build helpers only:

- inferred TypeScript message keys and a pure declaration generator;
- `Intl` wrappers for dates, numbers, currencies, relative time, and time-zone
  options;
- locale-path helpers that preserve query strings and hashes;
- localized static SEO entries with canonical and `hreflang` alternate links.

Applications keep dictionaries, locale selection, navigation markup, and any
generated `.d.ts` file in their own source tree. Vanilla JavaScript users can
use the same helpers without TypeScript.

## ICU Evaluation

ICU MessageFormat supports plural, select, selectordinal, date, and number
patterns, but a built-in parser would add a second expression language to the
framework. It would require a message parser, escaping policy, diagnostic
surface, locale-data strategy, and a decision about client versus build-time
evaluation.

VeloDom therefore does not add an ICU parser in V1. A V2 implementation may be
considered only as an explicit compiler/build adapter that receives plain
application dictionaries and produces static strings or diagnostics. It must:

- remain opt-in and tree-shakable;
- expose no mandatory provider or global locale state;
- keep ordinary HTML and `vd-*` directives unchanged;
- use documented fallback and missing-variable errors;
- avoid bundling broad locale data into the default browser runtime.

Until that contract exists, applications that need ICU messages should use a
small application-owned formatter or a separately reviewed adapter. No
`vd-i18n` directive will be added, because it would create a hidden translation
runtime for applications that only need one language.

## Request-Time Locale Decisions

Browser language headers, cookies, subdomains, domain routing, user profiles,
and CMS translation loading are server or product policy. They cannot be
resolved correctly by a static browser framework without imposing a server
runtime and persistence model.

The permitted future shape is an application or server adapter that resolves a
locale before VeloDom is mounted or before static output is selected. Such an
adapter may read request headers, cookies, domains, or CMS data, but it must
pass a final locale and resource map through an explicit integration boundary.
Core must not read cookies, make network requests, select a locale
automatically, or store translation credentials.

## Practical Recommendation

Use locale-prefixed static routes and explicit language links for public sites.
Use `createLocalization()` for dictionary validation and localized SEO, then add
a server adapter only when the product genuinely needs request-time locale
policy. This preserves VeloDom's HTML-first, compiler-first, and lightweight
runtime model.
