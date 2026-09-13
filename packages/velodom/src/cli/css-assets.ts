/**
 * ----------------------------------------
 * Module: CSS and Asset Intelligence
 * ----------------------------------------
 *
 * Produces conservative, build-only CSS and local-asset diagnostics from the
 * shared project index. It reports evidence and advice without rewriting CSS,
 * generating image variants, or adding browser runtime behavior.
 * ----------------------------------------
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  join
} from "node:path";
import {
  inspectImageAsset,
  type AssetImageInspection
} from "../assets.ts";
import { VD_CSS_ASSET_INTELLIGENCE } from "../constants.ts";
import { analyzeRtlCss } from "../vite-plugin/rtl-css-diagnostics.ts";
import {
  discoverFiles,
  readOptionalText
} from "./analyzer.ts";
import type {
  IndexedProjectTemplate,
  ProjectSourceIndex
} from "./project-index.ts";

/** One source location attached to a CSS or asset finding. */
export interface CssAssetFinding {
  code: string;
  file: string;
  line?: number;
  message: string;
  suggestion: string;
}

/** Route and resource ownership derived for one stylesheet. */
export interface CssRouteAttribution {
  file: string;
  owners: string[];
  routes: string[];
  scope: "resource" | "shared";
}

/** One duplicated CSS declaration block found in separate resources. */
export interface DuplicateCssRule {
  files: string[];
  selectors: string[];
}

/** Static information and references for one local asset. */
export interface IndexedAsset {
  bytes: number;
  file: string;
  format: string;
  height?: number;
  usedBy: string[];
  width?: number;
}

/** Complete read-only CSS and local-asset report. */
export interface CssAssetIntelligenceReport {
  assets: {
    duplicates: Array<{ bytes: number; files: string[] }>;
    files: IndexedAsset[];
    lcpAdvice: CssAssetFinding[];
    missingDimensions: CssAssetFinding[];
    oversized: CssAssetFinding[];
    responsiveAdvice: CssAssetFinding[];
    unused: CssAssetFinding[];
  };
  css: {
    duplicates: DuplicateCssRule[];
    files: Array<{ bytes: number; file: string; selectorCount: number }>;
    logicalProperties: CssAssetFinding[];
    possiblyUnusedSelectors: CssAssetFinding[];
    routeAttribution: CssRouteAttribution[];
  };
  summary: {
    assetBytes: number;
    assets: number;
    cssBytes: number;
    cssFiles: number;
    findings: number;
  };
}

interface SourceRecord {
  file: string;
  source: string;
}

interface CssSourceRecord extends SourceRecord {
  lineOffset: number;
}

interface CssRule {
  declarations: string;
  file: string;
  line: number;
  selectors: string[];
}

interface ImageTagRecord {
  file: string;
  line: number;
  source: string;
  tag: string;
}

/**
 * Inspects application CSS and local assets using only source text and file
 * metadata. Findings are advisory because dynamic class and asset paths cannot
 * always be proven statically.
 */
export async function createCssAssetIntelligence(
  root: string,
  index: ProjectSourceIndex
): Promise<CssAssetIntelligenceReport> {
  const [cssSources, applicationSources, assetFiles, shellSource] = await Promise.all([
    readCssSources(root, index),
    readApplicationSources(root),
    discoverAssetFiles(root),
    readOptionalText(join(root, "index.html"))
  ]);
  const contentSources = mergeSources([
    ...applicationSources.filter(item => !item.file.endsWith(".css")),
    ...(shellSource ? [{ file: "index.html", source: shellSource }] : [])
  ]);
  const cssRules = cssSources.flatMap(item => parseCssRules(
    item.source,
    item.file,
    item.lineOffset
  ));
  const imageTags = collectImageTags(index, shellSource);
  const assets = await inspectAssets(root, assetFiles, [
    ...contentSources,
    ...cssSources
  ]);
  const report: CssAssetIntelligenceReport = {
    assets: {
      duplicates: findDuplicateAssets(assets),
      files: assets.map(({ hash: _hash, ...asset }) => asset),
      lcpAdvice: findLcpAdvice(assets, imageTags, shellSource),
      missingDimensions: findMissingDimensions(assets, imageTags),
      oversized: findOversizedAssets(assets),
      responsiveAdvice: findResponsiveAdvice(assets, imageTags),
      unused: findUnusedAssets(assets)
    },
    css: {
      duplicates: findDuplicateCssRules(cssRules),
      files: cssSources.map(item => ({
        bytes: Buffer.byteLength(item.source),
        file: item.file,
        selectorCount: cssRules.filter(rule => rule.file === item.file)
          .reduce((total, rule) => total + rule.selectors.length, 0)
      })),
      logicalProperties: cssSources.flatMap(item => analyzeRtlCss(item.source, item.file)
        .map(diagnostic => ({
          code: diagnostic.code,
          file: diagnostic.filename,
          line: diagnostic.line + item.lineOffset,
          message: diagnostic.message,
          suggestion: `Use ${diagnostic.alternative}.`
        }))),
      possiblyUnusedSelectors: findPossiblyUnusedSelectors(cssRules, contentSources),
      routeAttribution: cssSources.map(item => createCssAttribution(item.file, index))
    },
    summary: {
      assetBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
      assets: assets.length,
      cssBytes: cssSources.reduce(
        (total, item) => total + Buffer.byteLength(item.source),
        0
      ),
      cssFiles: cssSources.length,
      findings: 0
    }
  };

  report.summary.findings = countFindings(report);
  return report;
}

/** Reads ordinary stylesheets plus style blocks from single-file resources. */
async function readCssSources(root: string, index: ProjectSourceIndex) {
  const files = await Promise.all(index.css.map(async file => ({
    file,
    lineOffset: 0,
    source: await readOptionalText(join(root, file))
  })));
  const embedded = index.templates
    .filter(template => template.module.source.endsWith(".vd"))
    .map(template => readEmbeddedStyle(template))
    .filter(item => item.source.trim());

  return [...files, ...embedded].sort((left, right) => left.file.localeCompare(right.file));
}

/** Preserves the original line offset for a single-file style block. */
function readEmbeddedStyle(template: IndexedProjectTemplate): CssSourceRecord {
  const match = /<style\b[^>]*>([\s\S]*?)<\/style>/i.exec(template.rawSource);
  const source = match?.[1] || "";
  const contentStart = match?.index === undefined
    ? 0
    : match.index + (match[0].indexOf(source));

  return {
    file: `${template.module.source}#style`,
    lineOffset: countLines(template.rawSource, contentStart),
    source
  };
}

/** Reads text-bearing application files once for conservative usage checks. */
async function readApplicationSources(root: string): Promise<SourceRecord[]> {
  const files = await discoverFiles(root, "src", [
    ".css",
    ".html",
    ".js",
    ".mjs",
    ".ts",
    ".vd"
  ]);

  return await Promise.all(files.map(async file => ({
    file,
    source: await readOptionalText(join(root, file))
  })));
}

/** Discovers application-owned assets from conventional source and public roots. */
async function discoverAssetFiles(root: string) {
  const extensions = [...VD_CSS_ASSET_INTELLIGENCE.ASSET_EXTENSIONS];
  const [sourceAssets, publicAssets] = await Promise.all([
    discoverFiles(root, "src/assets", extensions),
    discoverFiles(root, "public", extensions)
  ]);

  return [...new Set([...sourceAssets, ...publicAssets])].sort();
}

/** Reads hashes, image metadata, and conservative source references. */
async function inspectAssets(
  root: string,
  files: string[],
  sources: SourceRecord[]
) {
  return await Promise.all(files.map(async file => {
    const absolute = join(root, file);
    const content = await readFile(absolute);
    const extension = extname(file).toLowerCase();
    let image: AssetImageInspection | undefined;

    if (VD_CSS_ASSET_INTELLIGENCE.IMAGE_EXTENSIONS.includes(extension)) {
      try {
        image = await inspectImageAsset(absolute);
      } catch {
        image = undefined;
      }
    }

    return {
      bytes: content.byteLength,
      file,
      format: image?.format || extension.slice(1) || "unknown",
      hash: createHash("sha256").update(content).digest("hex"),
      ...(image?.height ? { height: image.height } : {}),
      usedBy: sources
        .filter(source => referencesAsset(source.source, file))
        .map(source => source.file)
        .filter(source => source !== file)
        .sort(),
      ...(image?.width ? { width: image.width } : {})
    };
  }));
}

/** Recognizes explicit source references while tolerating public-root URLs. */
function referencesAsset(source: string, file: string) {
  const normalized = source.replaceAll("\\", "/");
  const relativeAsset = file.replace(/^src\//, "").replace(/^public\//, "");
  const name = basename(file);

  return normalized.includes(file)
    || normalized.includes(relativeAsset)
    || normalized.includes(`/${relativeAsset}`)
    || normalized.includes(name);
}

/** Produces stable route ownership for resource and shared stylesheets. */
function createCssAttribution(
  file: string,
  index: ProjectSourceIndex
): CssRouteAttribution {
  const sourceFile = file.replace(/#style$/, "");
  const sourceFolder = dirname(sourceFile);
  const direct = index.templates.filter(template => (
    template.module.source === sourceFile
    || dirname(template.module.source) === sourceFolder
  ));
  const owners = direct.map(template => `${template.kind}:${template.module.name}`).sort();
  const routes = new Set<string>();

  direct.forEach(template => {
    if (template.kind === "page") {
      routes.add(template.module.route || routeFromName(template.module.name));
      return;
    }
    if (template.kind === "component") {
      index.templates
        .filter(candidate => candidate.kind === "page")
        .filter(candidate => pageUsesComponent(
          candidate,
          template.module.name,
          index
        ))
        .forEach(candidate => routes.add(
          candidate.module.route || routeFromName(candidate.module.name)
        ));
      return;
    }
    if (template.kind === "layout") {
      index.templates
        .filter(candidate => candidate.kind === "page")
        .filter(candidate => referencesLayout(
          candidate,
          template.module.name,
          index
        ))
        .forEach(candidate => routes.add(
          candidate.module.route || routeFromName(candidate.module.name)
        ));
    }
  });

  if (!direct.length) {
    index.pages.forEach(page => routes.add(page.route || routeFromName(page.name)));
  }

  return {
    file,
    owners,
    routes: [...routes].sort(),
    scope: direct.length ? "resource" : "shared"
  };
}

/** Finds direct component references without guessing dynamic names. */
function referencesComponent(source: string, name: string) {
  const escaped = escapeRegExp(name);

  return new RegExp(
    `<vd-component\\b[^>]*\\bname\\s*=\\s*["']${escaped}["']`,
    "i"
  ).test(source);
}

/** Resolves direct and nested component use from one page and its layout. */
function pageUsesComponent(
  page: IndexedProjectTemplate,
  name: string,
  index: ProjectSourceIndex
) {
  const layout = resolveStaticPageLayout(page, index);
  const sources = [page.analysisHtml, ...(layout ? [layout.analysisHtml] : [])];

  return sources.some(source => sourceUsesComponent(
    source,
    name,
    index,
    new Set()
  ));
}

/** Walks statically named component references while preventing cycles. */
function sourceUsesComponent(
  source: string,
  name: string,
  index: ProjectSourceIndex,
  visited: Set<string>
): boolean {
  if (referencesComponent(source, name)) return true;

  for (const referenced of readComponentNames(source)) {
    if (visited.has(referenced)) continue;
    visited.add(referenced);
    const component = index.templates.find(template => (
      template.kind === "component" && template.module.name === referenced
    ));

    if (component && sourceUsesComponent(
      component.analysisHtml,
      name,
      index,
      visited
    )) return true;
  }
  return false;
}

/** Reads only literal component names from ordinary component tags. */
function readComponentNames(source: string) {
  return [...source.matchAll(
    /<vd-component\b[^>]*\bname\s*=\s*["']([^"']+)["']/gi
  )].map(match => match[1]).filter((name): name is string => Boolean(name));
}

/** Resolves the explicit or conventional default layout for static analysis. */
function resolveStaticPageLayout(
  page: IndexedProjectTemplate,
  index: ProjectSourceIndex
) {
  if (/\blayout\s*:\s*false\b/.test(page.configSource)) return undefined;
  const configured = page.configSource.match(/\blayout\s*:\s*["']([^"']+)["']/)?.[1];
  const name = configured || (index.layouts.some(layout => layout.name === "default")
    ? "default"
    : "");

  return index.templates.find(template => (
    template.kind === "layout" && template.module.name === name
  ));
}

/** Finds an explicit page layout setting in a static config source. */
function referencesLayout(
  template: IndexedProjectTemplate,
  name: string,
  index: ProjectSourceIndex
) {
  return resolveStaticPageLayout(template, index)?.module.name === name;
}

/** Parses leaf CSS rules recursively through grouping at-rules. */
function parseCssRules(source: string, file: string, lineOffset = 0): CssRule[] {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, " "));
  const rules: CssRule[] = [];

  collectCssRules(clean, file, lineOffset, rules);
  return rules;
}

/** Walks one CSS block while keeping source line offsets stable. */
function collectCssRules(
  source: string,
  file: string,
  lineOffset: number,
  rules: CssRule[]
) {
  let cursor = 0;

  while (cursor < source.length) {
    const open = findCssBrace(source, cursor, "{");

    if (open === -1) break;
    const close = findMatchingCssBrace(source, open);

    if (close === -1) break;
    const headerStart = findCssHeaderStart(source, open);
    const header = source.slice(headerStart, open).trim();
    const body = source.slice(open + 1, close);
    if (isGroupingAtRule(header)) {
      collectCssRules(
        body,
        file,
        lineOffset + countLines(source, open + 1),
        rules
      );
    } else if (header && !header.startsWith("@") && !body.includes("{")) {
      const selectors = splitCssSelectors(header);
      const declarations = normalizeDeclarations(body);

      if (selectors.length && declarations) {
        rules.push({
          declarations,
          file,
          line: lineOffset + 1 + countLines(source, headerStart),
          selectors
        });
      }
    }
    cursor = close + 1;
  }
}

/** Finds a CSS brace outside quoted strings. */
function findCssBrace(source: string, start: number, target: "{" | "}") {
  let quote = "";
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index] || "";

    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (character === target) return index;
  }
  return -1;
}

/** Finds the closing brace for a CSS rule or grouping at-rule. */
function findMatchingCssBrace(source: string, open: number) {
  let depth = 0;
  let cursor = open;

  while (cursor < source.length) {
    const nextOpen = findCssBrace(source, cursor, "{");
    const nextClose = findCssBrace(source, cursor, "}");

    if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
      depth += 1;
      cursor = nextOpen + 1;
      continue;
    }
    if (nextClose === -1) return -1;
    depth -= 1;
    if (depth === 0) return nextClose;
    cursor = nextClose + 1;
  }
  return -1;
}

/** Finds the current rule header after a prior rule or at-statement. */
function findCssHeaderStart(source: string, open: number) {
  const close = source.lastIndexOf("}", open - 1);
  const semicolon = source.lastIndexOf(";", open - 1);

  return Math.max(close, semicolon) + 1;
}

/** Recognizes at-rules whose bodies may contain ordinary selectors. */
function isGroupingAtRule(header: string) {
  return /^@(media|supports|container|layer|document|scope)\b/i.test(header);
}

/** Splits selector lists and omits unsupported at-rule fragments. */
function splitCssSelectors(header: string) {
  return header.split(",")
    .map(selector => selector.trim().replace(/\s+/g, " "))
    .filter(selector => selector && !selector.startsWith("@"));
}

/** Normalizes whitespace without reordering cascade-sensitive declarations. */
function normalizeDeclarations(source: string) {
  return source.trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([:;,])\s*/g, "$1");
}

/** Finds duplicated declaration blocks only when they cross file boundaries. */
function findDuplicateCssRules(rules: CssRule[]): DuplicateCssRule[] {
  const groups = new Map<string, CssRule[]>();

  rules.forEach(rule => {
    if (rule.declarations.length < 20) return;
    const current = groups.get(rule.declarations) || [];

    current.push(rule);
    groups.set(rule.declarations, current);
  });

  return [...groups.values()]
    .filter(group => new Set(group.map(rule => rule.file)).size > 1)
    .map(group => ({
      files: [...new Set(group.map(rule => rule.file))].sort(),
      selectors: [...new Set(group.flatMap(rule => rule.selectors))].sort()
    }))
    .sort((left, right) => left.files.join().localeCompare(right.files.join()));
}

/** Reports selectors whose class/id tokens have no static source reference. */
function findPossiblyUnusedSelectors(
  rules: CssRule[],
  sources: SourceRecord[]
): CssAssetFinding[] {
  const corpus = sources.map(item => item.source).join("\n");
  const findings: CssAssetFinding[] = [];

  rules.forEach(rule => rule.selectors.forEach(selector => {
    const tokens = [...selector.matchAll(/(?:\.|#)(-?[_A-Za-z]+[\w-]*)/g)]
      .map(match => match[1])
      .filter((value): value is string => Boolean(value));

    if (!tokens.length || tokens.some(token => sourceHasToken(corpus, token))) return;
    findings.push({
      code: VD_CSS_ASSET_INTELLIGENCE.CODES.UNUSED_SELECTOR,
      file: rule.file,
      line: rule.line,
      message: `Selector "${selector}" has no statically visible class or id reference.`,
      suggestion: "Confirm dynamic usage before removing this selector."
    });
  }));

  return findings.sort(compareFinding);
}

/** Checks a class/id token with identifier boundaries. */
function sourceHasToken(source: string, token: string) {
  return new RegExp(`(^|[^\\w-])${escapeRegExp(token)}([^\\w-]|$)`).test(source);
}

/** Groups byte-identical assets by cryptographic content hash. */
function findDuplicateAssets(assets: Awaited<ReturnType<typeof inspectAssets>>) {
  const groups = new Map<string, typeof assets>();

  assets.forEach(asset => {
    const current = groups.get(asset.hash) || [];

    current.push(asset);
    groups.set(asset.hash, current);
  });

  return [...groups.values()]
    .filter(group => group.length > 1)
    .map(group => ({
      bytes: group[0]?.bytes || 0,
      files: group.map(asset => asset.file).sort()
    }))
    .sort((left, right) => left.files.join().localeCompare(right.files.join()));
}

/** Reports assets above the conservative default source-size threshold. */
function findOversizedAssets(
  assets: Awaited<ReturnType<typeof inspectAssets>>
): CssAssetFinding[] {
  return assets
    .filter(asset => asset.bytes > VD_CSS_ASSET_INTELLIGENCE.MAX_ASSET_BYTES)
    .map(asset => ({
      code: VD_CSS_ASSET_INTELLIGENCE.CODES.LARGE_ASSET,
      file: asset.file,
      message: `${asset.bytes} byte asset exceeds the ${VD_CSS_ASSET_INTELLIGENCE.MAX_ASSET_BYTES} byte advisory threshold.`,
      suggestion: "Compress it or provide application-generated responsive variants."
    }));
}

/** Reports local assets with no literal source reference. */
function findUnusedAssets(
  assets: Awaited<ReturnType<typeof inspectAssets>>
): CssAssetFinding[] {
  return assets
    .filter(asset => asset.usedBy.length === 0)
    .map(asset => ({
      code: VD_CSS_ASSET_INTELLIGENCE.CODES.UNUSED_ASSET,
      file: asset.file,
      message: "Asset has no statically visible source reference.",
      suggestion: "Confirm dynamic paths before removing this asset."
    }));
}

/** Collects actual image tags from page templates and the HTML shell. */
function collectImageTags(index: ProjectSourceIndex, shellSource: string) {
  const sources = [
    ...index.templates
      .filter(template => template.kind === "page")
      .map(template => ({ file: template.module.source, source: template.analysisHtml })),
    ...(shellSource ? [{ file: "index.html", source: shellSource }] : [])
  ];
  const tags: ImageTagRecord[] = [];

  sources.forEach(item => {
    for (const match of item.source.matchAll(/<img\b[^>]*>/gi)) {
      const tag = match[0];
      const src = readHtmlAttribute(tag, "src");

      if (!src) continue;
      tags.push({
        file: item.file,
        line: 1 + countLines(item.source, match.index || 0),
        source: src,
        tag
      });
    }
  });
  return tags;
}

/** Reports image tags without intrinsic width and height. */
function findMissingDimensions(
  assets: Awaited<ReturnType<typeof inspectAssets>>,
  tags: ImageTagRecord[]
): CssAssetFinding[] {
  return tags.flatMap(tag => {
    const asset = matchAssetToUrl(assets, tag.source);

    if (!asset || (hasHtmlAttribute(tag.tag, "width") && hasHtmlAttribute(tag.tag, "height"))) {
      return [];
    }
    return [{
      code: VD_CSS_ASSET_INTELLIGENCE.CODES.MISSING_DIMENSIONS,
      file: tag.file,
      line: tag.line,
      message: `Image "${tag.source}" omits intrinsic width and height.`,
      suggestion: asset.width && asset.height
        ? `Add width="${asset.width}" and height="${asset.height}" to reduce layout shift.`
        : "Add intrinsic width and height to reduce layout shift."
    }];
  }).sort(compareFinding);
}

/** Advises responsive markup for statically large local images. */
function findResponsiveAdvice(
  assets: Awaited<ReturnType<typeof inspectAssets>>,
  tags: ImageTagRecord[]
): CssAssetFinding[] {
  return tags.flatMap(tag => {
    const asset = matchAssetToUrl(assets, tag.source);

    if (!asset?.width || asset.width < VD_CSS_ASSET_INTELLIGENCE.LARGE_IMAGE_WIDTH) {
      return [];
    }
    if (hasHtmlAttribute(tag.tag, "srcset") && hasHtmlAttribute(tag.tag, "sizes")) {
      return [];
    }
    return [{
      code: VD_CSS_ASSET_INTELLIGENCE.CODES.RESPONSIVE_VARIANTS,
      file: tag.file,
      line: tag.line,
      message: `Wide ${asset.width}px image "${tag.source}" has no complete srcset/sizes pair.`,
      suggestion: "Generate variants in the application asset pipeline and use standard srcset and sizes attributes."
    }];
  }).sort(compareFinding);
}

/** Flags only first-page-image candidates whose source size makes LCP advice useful. */
function findLcpAdvice(
  assets: Awaited<ReturnType<typeof inspectAssets>>,
  tags: ImageTagRecord[],
  shellSource: string
): CssAssetFinding[] {
  const firstByPage = new Map<string, ImageTagRecord>();

  tags.forEach(tag => {
    if (!firstByPage.has(tag.file)) firstByPage.set(tag.file, tag);
  });

  return [...firstByPage.values()].flatMap(tag => {
    const asset = matchAssetToUrl(assets, tag.source);

    if (!asset || asset.bytes < VD_CSS_ASSET_INTELLIGENCE.LCP_CANDIDATE_BYTES) {
      return [];
    }
    const loading = readHtmlAttribute(tag.tag, "loading");
    const prioritized = readHtmlAttribute(tag.tag, "fetchpriority") === "high"
      || shellHasPreload(shellSource, tag.source);

    if (loading !== "lazy" && prioritized) return [];
    return [{
      code: VD_CSS_ASSET_INTELLIGENCE.CODES.LCP_HINT,
      file: tag.file,
      line: tag.line,
      message: `First large image "${tag.source}" is a possible LCP candidate.`,
      suggestion: "If it is above the fold, use eager loading with fetchpriority=\"high\" or an explicit preload."
    }];
  }).sort(compareFinding);
}

/** Matches a public or imported URL to one discovered local asset. */
function matchAssetToUrl(
  assets: Awaited<ReturnType<typeof inspectAssets>>,
  url: string
) {
  const clean = url.split(/[?#]/, 1)[0]?.replaceAll("\\", "/") || "";

  return assets.find(asset => (
    clean.endsWith(`/${basename(asset.file)}`)
    || clean === basename(asset.file)
    || clean.endsWith(asset.file.replace(/^src\//, "").replace(/^public\//, ""))
  ));
}

/** Detects an explicit image preload in the HTML shell. */
function shellHasPreload(source: string, imageUrl: string) {
  return [...source.matchAll(/<link\b[^>]*>/gi)].some(match => (
    readHtmlAttribute(match[0], "rel") === "preload"
    && readHtmlAttribute(match[0], "as") === "image"
    && readHtmlAttribute(match[0], "href") === imageUrl
  ));
}

/** Reads one quoted HTML attribute from a single start tag. */
function readHtmlAttribute(tag: string, name: string) {
  const escaped = escapeRegExp(name);

  return tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]
    || "";
}

/** Checks whether an HTML start tag declares a named attribute. */
function hasHtmlAttribute(tag: string, name: string) {
  return new RegExp(`\\b${escapeRegExp(name)}(?:\\s*=|\\s|/?>)`, "i").test(tag);
}

/** Merges duplicate source records generated by overlapping scans. */
function mergeSources(sources: SourceRecord[]) {
  return [...new Map(sources.map(source => [source.file, source])).values()];
}

/** Returns the conventional route path for an indexed page name. */
function routeFromName(name: string) {
  return (name === "home" ? "/" : `/${name}`)
    .replace(/\[([^\]]+)\]/g, ":$1");
}

/** Counts line breaks before a source offset. */
function countLines(source: string, end: number) {
  return (source.slice(0, end).match(/\n/g) || []).length;
}

/** Counts all advisory findings in a complete report. */
function countFindings(report: CssAssetIntelligenceReport) {
  return report.css.duplicates.length
    + report.css.logicalProperties.length
    + report.css.possiblyUnusedSelectors.length
    + report.assets.duplicates.length
    + report.assets.lcpAdvice.length
    + report.assets.missingDimensions.length
    + report.assets.oversized.length
    + report.assets.responsiveAdvice.length
    + report.assets.unused.length;
}

/** Escapes one literal for a generated regular expression. */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Keeps finding output stable across operating systems. */
function compareFinding(left: CssAssetFinding, right: CssAssetFinding) {
  return left.file.localeCompare(right.file)
    || (left.line || 0) - (right.line || 0)
    || left.code.localeCompare(right.code);
}
