import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createResponsiveImageAttributes,
  inspectImageAsset,
  inspectImageDirectory
} from "../../packages/velodom/src/assets.ts";

test("asset helpers inspect PNG dimensions and report oversized files", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-assets-"));
  const source = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(source, 0);
  source.writeUInt32BE(640, 16);
  source.writeUInt32BE(360, 20);
  const image = join(root, "cover.png");
  await writeFile(image, source);

  const inspected = await inspectImageAsset(image);
  const report = await inspectImageDirectory({ root, maxBytes: 20 });

  assert.deepEqual(
    { format: inspected.format, width: inspected.width, height: inspected.height },
    { format: "png", width: 640, height: 360 }
  );
  assert.equal(report.images.length, 1);
  assert.equal(report.oversized[0].path, image);
});

test("asset helpers generate standard responsive image attributes", () => {
  assert.deepEqual(createResponsiveImageAttributes({
    src: "/images/hero-1200.webp",
    width: 1200,
    height: 675,
    sizes: "(max-width: 640px) 100vw, 640px",
    variants: [
      { src: "/images/hero-640.webp", width: 640 },
      { src: "/images/hero-1200.webp", width: 1200 }
    ]
  }), {
    src: "/images/hero-1200.webp",
    width: "1200",
    height: "675",
    srcset: "/images/hero-640.webp 640w, /images/hero-1200.webp 1200w",
    sizes: "(max-width: 640px) 100vw, 640px",
    loading: "lazy",
    decoding: "async"
  });
  assert.throws(
    () => createResponsiveImageAttributes({
      src: "/image.webp",
      variants: [{ src: "/image.webp", width: 640 }]
    }),
    /sizes/
  );
});
