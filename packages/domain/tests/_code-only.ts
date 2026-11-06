// The CODE of a TypeScript source file, for the tests that pin what a file does or does not contain (Story 13.1b, code review CB34).
// A twin of `apps/jobs/tests/_code-only.ts`: keep the two in lockstep.
//
// The first version stripped comments with two regexes. A line comment holding `/*` (for instance `// see packages/*`) opened a "block comment"
// that ran to the next close anywhere later in the file and deleted real code, a string holding ` // ` lost the rest of its line, and a glued
// `;//text` stayed as code. The compiler's parser has none of those faults, so it does the stripping.

import ts from 'typescript';

/**
 * `source` as the compiler reads it: comments removed by the PARSER, types erased, `import` statements kept as written apart from `type`
 * specifiers (`verbatimModuleSyntax`). The printer normalises layout (indentation, line breaks), so a pin on this text must be
 * whitespace-tolerant. A pin that reads this text should still assert that something it requires IS present, so that a file which is
 * unexpectedly empty fails loudly rather than passing a "does not contain" check.
 */
export function codeOnly(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true, verbatimModuleSyntax: true },
  }).outputText;
}
