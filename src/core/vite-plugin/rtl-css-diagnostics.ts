/**
 * ----------------------------------------
 * Module: RTL CSS Diagnostics
 * ----------------------------------------
 *
 * Produces advisory build-time warnings for physical directional CSS that can
 * make multilingual layouts harder to maintain.
 * ----------------------------------------
 */

import { VD_RTL_CSS } from "../constants.ts";

/** One advisory warning emitted for RTL-sensitive CSS. */
export interface RtlCssDiagnostic {
  code: string;
  filename: string;
  line: number;
  column: number;
  property: string;
  alternative: string;
  message: string;
}

/** Finds physical left/right CSS usage and suggests logical alternatives. */
export function analyzeRtlCss(
  source: string,
  filename = "style.css"
): RtlCssDiagnostic[] {
  const diagnostics: RtlCssDiagnostic[] = [];
  let inComment = false;

  source.split(/\r?\n/).forEach((line, index) => {
    const uncommented = stripLineComments(line, inComment);

    inComment = uncommented.inComment;
    collectPropertyDiagnostic(
      diagnostics,
      uncommented.text,
      filename,
      index + 1
    );
  });

  return diagnostics;
}

function collectPropertyDiagnostic(
  diagnostics: RtlCssDiagnostic[],
  line: string,
  filename: string,
  lineNumber: number
) {
  const match = line.match(/^\s*([A-Za-z-]+)\s*:\s*([^;]+)/);

  if (!match) return;

  const property = match[1].toLowerCase();
  const value = match[2].trim().toLowerCase();
  const alternatives = VD_RTL_CSS.PHYSICAL_PROPERTY_ALTERNATIVES;
  const textAlignValues = VD_RTL_CSS.TEXT_ALIGN_VALUES;
  const alternative = Object.hasOwn(alternatives, property)
    ? alternatives[property]
    : getTextAlignAlternative(property, value, textAlignValues);

  if (!alternative) return;

  diagnostics.push({
    code: VD_RTL_CSS.CODE,
    filename,
    line: lineNumber,
    column: line.indexOf(match[1]) + 1,
    property,
    alternative,
    message: `Use "${alternative}" instead of physical CSS "${property}" for better RTL support.`
  });
}

function getTextAlignAlternative(
  property: string,
  value: string,
  alternatives: typeof VD_RTL_CSS.TEXT_ALIGN_VALUES
) {
  if (property !== "text-align") return "";

  return Object.hasOwn(alternatives, value)
    ? alternatives[value]
    : "";
}

function stripLineComments(
  line: string,
  inComment: boolean
) {
  let text = "";
  let index = 0;
  let commentOpen = inComment;

  while (index < line.length) {
    if (commentOpen) {
      const end = line.indexOf("*/", index);

      if (end === -1) {
        return {
          text,
          inComment: true
        };
      }

      commentOpen = false;
      index = end + 2;
      continue;
    }

    const start = line.indexOf("/*", index);

    if (start === -1) {
      text += line.slice(index);
      break;
    }

    text += line.slice(index, start);
    commentOpen = true;
    index = start + 2;
  }

  return {
    text,
    inComment: commentOpen
  };
}
