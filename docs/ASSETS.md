# VeloDom Build-Time Asset Helpers

`velodom/assets` is an optional Node/build-time module for image inspection and
standard responsive-image attributes. It is not imported by `createApp()` and
adds no browser runtime behavior.

```js
import {
  createResponsiveImageAttributes,
  inspectImageDirectory
} from "velodom/assets";

const report = await inspectImageDirectory({
  root: "src/assets",
  maxBytes: 500_000
});

const hero = createResponsiveImageAttributes({
  src: "/images/hero-1200.webp",
  width: 1200,
  height: 675,
  sizes: "(max-width: 640px) 100vw, 640px",
  variants: [
    { src: "/images/hero-640.webp", width: 640 },
    { src: "/images/hero-1200.webp", width: 1200 }
  ]
});
```

Use the resulting object directly in normal HTML or a template-building step:

```html
<img
  src="/images/hero-1200.webp"
  srcset="/images/hero-640.webp 640w, /images/hero-1200.webp 1200w"
  sizes="(max-width: 640px) 100vw, 640px"
  width="1200"
  height="675"
  loading="lazy"
  decoding="async"
  alt="VeloDom compiler illustration"
>
```

VeloDom intentionally does not choose an image transformer, CDN, format, or
deployment vendor. Applications generate variants through their chosen pipeline
and provide their URLs explicitly. The compiler warns when an image has a
source but lacks both intrinsic `width` and `height`; decorative `alt=""`
remains valid.
