/**
 * Text Variables - Dynamic text replacement for batch processing
 */

import { TextVariableContext } from './types';

export function replaceTextVariables(
  text: string,
  context: TextVariableContext
): string {
  return text
    .replace(/\{filename\}/g, context.filename)
    .replace(/\{date\}/g, context.date.toLocaleDateString())
    .replace(/\{year\}/g, context.date.getFullYear().toString())
    .replace(/\{index\}/g, context.index.toString());
}

