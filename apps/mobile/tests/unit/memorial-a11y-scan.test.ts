// Story 11b.4, R5 (checklist family 13 (a)) — a CONTAINER that carries `accessibilityLabel` is explicitly `accessible`.
//
// A label on a view that is not an accessibility element is never announced — and the mocked `tamagui` of the render tests
// maps `accessibilityLabel` to `aria-label` and never sees `accessible`, so those tests cannot catch it. This scans the
// SOURCE of every memorial screen and component (a parsed-JSX scan, not a regex over text): every element that carries
// `accessibilityLabel` / `aria-label` is either one React Native makes an accessibility element by default (text, inputs,
// buttons) or says `accessible` itself. The scan has teeth: planted violations (below) must be flagged.
//
// ⚠ The fix for a container that HOLDS a button (the Send refusal and its helpline button) is NOT `accessible={true}` —
// grouping hides the button from focus. That container has no label at all and is a live region; the render tests pin that
// the refusal text is announced instead.
// T11 — a `Text` is an accessibility element only at the TOP of a text run: React Native flattens a `<Text>` NESTED in
// another text element (`Text`, `Paragraph`, `H1`–`H6`) into its parent, so a label on the nested one is never announced (the
// visible text is read). The scan flags a labelled text element nested in a text element (Fragments looked through).
// V14 (c) — through ANY depth: every JSX ancestor is walked (not only the nearest), and a tamagui `Button` counts as a text
// run too (it draws its children as ITS label — a labelled `Text` inside it is never announced on its own).
// W10 — but only through the CHILDREN of those ancestors: the walk stops at a JSX attribute (`<Button icon={<Text …/>}>` —
// an element passed as a prop is drawn wherever the component puts it, ⛔ in the button's text run) and at a function
// boundary (`renderItem={() => …}`, a row component defined inline), unless that function is called right there to draw
// children in place (`{xs.map((x) => …)}`, an IIFE).
// X7 — except the attribute that IS the children: `<Paragraph children={<Text …/>} />` draws its value in the element's own
// text run, exactly as nested JSX children would, so the walk goes on through it (and counts that element — self-closing or
// not — as an ancestor).

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const MEMORIAL_DIRS = ['app/(memorial)', 'components/memorial-authorship']
const memorialSources = (): Array<{ file: string; source: string }> =>
  MEMORIAL_DIRS.flatMap((dir) =>
    readdirSync(path.join(mobileRoot, dir))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => ({ file: `${dir}/${f}`, source: readFileSync(path.join(mobileRoot, dir, f), 'utf8') })),
  )

/**
 * Accessibility elements BY DEFAULT in React Native / tamagui: text, text inputs, buttons. Everything else is a plain view.
 * ⚠ Known limits of this allow-list (no logic here handles them): it would FALSE-FLAG a future labelled `Switch`, `Checkbox`
 * or `Spinner` (accessible by default, but not listed), and an element given `accessible` through a spread
 * (`{...props}`) reads as not saying it. When that happens, add the tag to this set (after checking that RN really makes it
 * an accessibility element), or write `accessible` on the element itself — do not weaken the scan to "any label passes".
 */
const ACCESSIBLE_BY_DEFAULT = new Set(['Button', 'Input', 'TextInput', 'Text', 'Paragraph', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Pressable', 'TouchableOpacity'])

/** Text elements: RN flattens one nested inside another into a single accessibility element (T11). */
const TEXT_TAGS = new Set(['Text', 'Paragraph', 'SizableText', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])

/** Ancestors that swallow a nested text element's label: any text element, and a tamagui `Button` (V14 (c)). */
const FLATTENING_ANCESTORS = new Set([...TEXT_TAGS, 'Button'])

interface Labelled {
  readonly tag: string
  readonly line: number
  readonly accessible: boolean
  readonly attrs: ReadonlySet<string>
  /** SOME enclosing JSX element, at any depth (Fragments looked through), is a text element or a `Button` — T11 / V14 (c). */
  readonly nestedInText: boolean
}

/**
 * W10 — does a function draw its JSX IN PLACE where it is written? Only when it is called right there: an argument of a call
 * (`xs.map((x) => …)`, `flatMap`, …) or the callee of an IIFE. Any other function (a prop value, an object property, a
 * variable) draws its JSX wherever it is later called — its lexical JSX ancestors say nothing about that.
 */
function drawsInPlace(fn: ts.Node): boolean {
  let child: ts.Node = fn
  let up = fn.parent
  while (ts.isParenthesizedExpression(up)) {
    child = up
    up = up.parent
  }
  return ts.isCallExpression(up) && (up.arguments.some((a) => a === child) || up.expression === child)
}

/**
 * The tags of EVERY JSX element enclosing `node` through children, nearest first, Fragments left out (V14 (c) — ⛔ only the
 * nearest). W10 — the walk stops at a JSX attribute and at a function boundary that does not draw in place; X7 — but goes on
 * through a `children={…}` attribute (its value IS the element's children).
 */
function enclosingTags(node: ts.Node, file: ts.SourceFile): string[] {
  const tags: string[] = []
  const push = (tag: string): void => {
    if (tag !== 'Fragment' && tag !== 'React.Fragment') tags.push(tag)
  }
  // `node` is the opening / self-closing element; for an opening element, start above its own JsxElement.
  let at: ts.Node | undefined = ts.isJsxOpeningElement(node) ? node.parent.parent : node.parent
  while (at !== undefined) {
    if (ts.isJsxSpreadAttribute(at)) break
    if (ts.isJsxAttribute(at) && at.name.getText(file) !== 'children') break
    if ((ts.isArrowFunction(at) || ts.isFunctionExpression(at) || ts.isFunctionDeclaration(at)) && !drawsInPlace(at)) break
    if (ts.isJsxElement(at)) push(at.openingElement.tagName.getText(file))
    // Reached only through a `children={…}` attribute (the walk starts ABOVE the labelled element itself): its owner.
    if (ts.isJsxSelfClosingElement(at)) push(at.tagName.getText(file))
    at = at.parent
  }
  return tags
}

/** Every JSX element in `source` that carries a label, with whether it says `accessible` (and not `accessible={false}`). */
function labelledElements(source: string): Labelled[] {
  const file = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out: Labelled[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute)
      const names = new Set(attrs.map((a) => a.name.getText(file)))
      if (names.has('accessibilityLabel') || names.has('aria-label')) {
        const accessible = attrs.find((a) => a.name.getText(file) === 'accessible')
        // bare `accessible` or `accessible={true}`; not `accessible={false}` and not any other expression
        const saysTrue =
          accessible !== undefined &&
          (accessible.initializer === undefined ||
            (ts.isJsxExpression(accessible.initializer) && accessible.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword))
        const ancestors = enclosingTags(node, file)
        out.push({
          tag: node.tagName.getText(file),
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          accessible: saysTrue,
          attrs: names,
          nestedInText: ancestors.some((tag) => FLATTENING_ANCESTORS.has(tag)),
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return out
}

/**
 * The labels that are never announced — the defect: a labelled plain view that does NOT say `accessible`, and (T11) a
 * labelled TEXT element nested in another text element (flattened into its parent: `accessible` cannot save it).
 */
function unannounced(source: string): string[] {
  return labelledElements(source)
    .filter((e) => (TEXT_TAGS.has(e.tag) && e.nestedInText) || (!ACCESSIBLE_BY_DEFAULT.has(e.tag) && !e.accessible))
    .map((e) => `<${e.tag}> at line ${e.line}${e.nestedInText ? ' (nested in text)' : ''}`)
}

interface LiveRegion {
  readonly line: number
  /** The attribute value is a string literal, or holds one anywhere (`{'polite'}`, `{x ? 'polite' : 'assertive'}`). */
  readonly literal: boolean
  readonly text: string
}

/** Every `accessibilityLiveRegion` attribute in `source`, and whether its value contains a string literal. */
function liveRegions(source: string): LiveRegion[] {
  const file = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out: LiveRegion[] = []
  const hasLiteral = (n: ts.Node): boolean => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) return true
    let found = false
    ts.forEachChild(n, (c) => {
      if (hasLiteral(c)) found = true
    })
    return found
  }
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'accessibilityLiveRegion' && node.initializer !== undefined) {
      out.push({
        line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
        literal: hasLiteral(node.initializer),
        text: node.initializer.getText(file),
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return out
}

describe('the live-region VALUE is never a literal on a memorial line — the announcement plan decides it (error ⇒ assertive)', () => {
  it('scans real attributes (not vacuous): every one is an expression fed by the plan', () => {
    const all = memorialSources().flatMap((f) => liveRegions(f.source).map((r) => ({ ...r, file: f.file })))
    expect(all.length).toBeGreaterThanOrEqual(10)
    expect(new Set(all.map((r) => r.file)).size).toBeGreaterThanOrEqual(5)
    for (const r of all) expect(r.text.startsWith('{') && !r.literal, `${r.file}:${r.line} ${r.text}`).toBe(true)
  })

  it.each(memorialSources().map((f) => [f.file, f.source] as const))('%s — no string literal as an accessibilityLiveRegion value', (_file, source) => {
    expect(liveRegions(source).filter((r) => r.literal).map((r) => `line ${r.line}: ${r.text}`)).toEqual([])
  })

  describe('PLANTED — the rule can fail', () => {
    it.each([
      ['a string attribute', `const A = () => <Paragraph accessibilityLiveRegion="polite" />`],
      ['an expression that is a literal', `const A = () => <Paragraph accessibilityLiveRegion={'assertive'} />`],
      ['a conditional of literals', `const A = () => <Paragraph accessibilityLiveRegion={bad ? 'assertive' : 'polite'} />`],
      ['a template literal', 'const A = () => <Paragraph accessibilityLiveRegion={`polite`} />'],
    ])('flags %s', (_name, src) => {
      expect(liveRegions(src).filter((r) => r.literal)).toHaveLength(1)
    })

    it.each([
      ['a hook result', `const A = () => <Paragraph accessibilityLiveRegion={refusalLive} />`],
      ['a value computed above the JSX', `const A = () => <Paragraph accessibilityLiveRegion={counterLive} />`],
      ['a call with no literal', `const A = () => <Paragraph accessibilityLiveRegion={memorialLiveRegion(kind)} />`],
    ])('passes %s', (_name, src) => {
      expect(liveRegions(src).filter((r) => r.literal)).toEqual([])
    })

    it('flags even a plan-helper call written inline with a literal KIND (compute the value above the JSX, so the rule stays strict)', () => {
      const src = `const A = () => <Paragraph accessibilityLiveRegion={memorialLiveRegion(over ? 'error' : 'status')} />`
      expect(liveRegions(src).filter((r) => r.literal)).toHaveLength(1)
    })
  })
})

describe('family 13 (a) — a labelled container is `accessible` (memorial screens and components)', () => {
  it('scans real files and real labels (the scan is not vacuous)', () => {
    const files = memorialSources()
    expect(files.length).toBeGreaterThanOrEqual(10)
    const all = files.flatMap((f) => labelledElements(f.source))
    expect(all.length).toBeGreaterThanOrEqual(8)
    const tags = new Set(all.map((e) => e.tag))
    // (T11 removed the one labelled `Text` — a marker nested in its paragraph, whose label was never read.)
    for (const tag of ['Button', 'Input', 'Image']) expect(tags.has(tag), tag).toBe(true)
  })

  it.each(memorialSources().map((f) => [f.file, f.source] as const))('%s — no labelled plain view without `accessible`', (_file, source) => {
    expect(unannounced(source)).toEqual([])
  })

  it('every <Image> with a label says `accessible` (an RN image is not an accessibility element on iOS by default)', () => {
    const images = memorialSources().flatMap((f) => labelledElements(f.source).filter((e) => e.tag === 'Image'))
    expect(images.length).toBeGreaterThanOrEqual(3) // picked photo (photo + preview) and the kept photo
    for (const img of images) expect(img.accessible, `Image at line ${img.line}`).toBe(true)
  })

  it('the Send refusal container is a live region with NO label, and is NOT grouped (it holds the helpline button)', () => {
    const src = readFileSync(path.join(mobileRoot, 'app/(memorial)/preview.tsx'), 'utf8')
    const file = ts.createSourceFile('preview.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let found: Set<string> | undefined
    const visit = (n: ts.Node): void => {
      if (ts.isJsxOpeningElement(n)) {
        const attrs = n.attributes.properties.filter(ts.isJsxAttribute)
        if (attrs.some((a) => a.name.getText(file) === 'testID' && a.initializer !== undefined && /memorial-refusal/.test(a.initializer.getText(file)))) {
          found = new Set(attrs.map((a) => a.name.getText(file)))
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(file)
    expect(found).toBeDefined()
    expect(found!.has('accessibilityLiveRegion')).toBe(true)
    expect(found!.has('accessibilityLabel')).toBe(false)
    expect(found!.has('aria-label')).toBe(false)
    expect(found!.has('accessible')).toBe(false)
  })

  describe('PLANTED — the scan can fail', () => {
    it.each([
      ['a label on a plain view', `const A = () => <YStack accessibilityLabel="x"><Button /></YStack>`],
      ['an aria-label on a plain view', `const A = () => <XStack aria-label="x" />`],
      ['accessible={false}', `const A = () => <YStack accessible={false} accessibilityLabel="x" />`],
      ['an Image with a label and no `accessible`', `const A = () => <Image accessibilityLabel="x" source={s} />`],
      ['accessible={cond} (not literally true)', `const A = () => <YStack accessible={cond} accessibilityLabel="x" />`],
      // T11 — RN flattens nested text: the inner label is never announced.
      ['a labelled Text nested in a Paragraph', `const A = () => <Paragraph><Text accessibilityLabel="x">[…]</Text></Paragraph>`],
      ['a labelled Text nested in a Text, through a Fragment', `const A = () => <Text>a<Fragment key={1}><Text accessibilityLabel="x">b</Text></Fragment></Text>`],
      ['a labelled Text nested in a Paragraph, inside a map callback', `const A = () => <Paragraph>{xs.map((x) => <Text key={x} aria-label="y">{x}</Text>)}</Paragraph>`],
      ['…even when it says `accessible` (flattening ignores it)', `const A = () => <Paragraph><Text accessible accessibilityLabel="x">b</Text></Paragraph>`],
      // V14 (c) — every ancestor, not only the nearest.
      ['a labelled Text inside a tamagui Button (the Button reads its children as its label)', `const A = () => <Button onPress={go}><Text accessibilityLabel="x">Send</Text></Button>`],
      ['a labelled Text inside a Button, behind a stack', `const A = () => <Button><XStack><Text accessibilityLabel="x">Send</Text></XStack></Button>`],
      ['a labelled Text TWO levels down in a Paragraph (a view between them)', `const A = () => <Paragraph><YStack><Text accessibilityLabel="x">b</Text></YStack></Paragraph>`],
      ['a labelled Text two levels down in an H2, through a Fragment and a stack', `const A = () => <H2><><XStack><Fragment><Text aria-label="x">b</Text></Fragment></XStack></></H2>`],
      // W10 — a function that draws IN PLACE is looked through.
      ['a labelled Text in a Paragraph, inside a flatMap callback in parentheses', `const A = () => <Paragraph>{xs.flatMap(((x) => [<Text key={x} accessibilityLabel="y">{x}</Text>]))}</Paragraph>`],
      ['a labelled Text in a Paragraph, inside an IIFE', `const A = () => <Paragraph>{(() => <Text accessibilityLabel="y">b</Text>)()}</Paragraph>`],
      // X7 — an explicit `children={…}` prop IS the children: the walk goes on through it.
      ['a labelled Text passed as a self-closing Paragraph\'s children prop', `const A = () => <Paragraph children={<Text aria-label="x">b</Text>} />`],
      ['a labelled Text passed as a Button\'s children prop (opening + closing tags)', `const A = () => <Button onPress={go} children={<Text accessibilityLabel="x">Send</Text>}></Button>`],
      ['a labelled Text in a children prop, behind a stack inside a Paragraph', `const A = () => <Paragraph><YStack children={<Text accessibilityLabel="x">b</Text>} /></Paragraph>`],
    ])('flags %s', (_name, src) => {
      expect(unannounced(src)).toHaveLength(1)
    })

    it.each([
      ['a bare `accessible`', `const A = () => <YStack accessible accessibilityLabel="x" />`],
      ['accessible={true}', `const A = () => <YStack accessible={true} accessibilityLabel="x" />`],
      ['a labelled Button / Input / Text (accessible by default)', `const A = () => <><Button accessibilityLabel="x" /><Input accessibilityLabel="y" /><Text accessibilityLabel="z" /></>`],
      ['an unlabelled container (nothing to announce)', `const A = () => <YStack testID="t" accessibilityLiveRegion="polite" />`],
      ['a labelled Text at the TOP of its run (inside a view, not a text)', `const A = () => <YStack><Text accessibilityLabel="x">b</Text></YStack>`],
      ['an unlabelled Text nested in a Paragraph (the visible text is read)', `const A = () => <Paragraph><Text fontStyle="italic">b</Text></Paragraph>`],
      // W10 — an element passed as a PROP, or drawn by a function called elsewhere, is not in the enclosing text run.
      ['a labelled Text passed as a Button\'s icon prop', `const A = () => <Button icon={<Text aria-label="x">i</Text>}>Send</Button>`],
      ['a labelled Text self-closing in a Button\'s icon prop', `const A = () => <Button icon={<Text accessibilityLabel="x" />} onPress={go}>Send</Button>`],
      ['a labelled element in renderItem={() => …} under a Paragraph', `const A = () => <Paragraph><List data={xs} renderItem={() => <Text accessibilityLabel="x">b</Text>} /></Paragraph>`],
      ['a labelled element in a renderItem function expression under a Paragraph', `const A = () => <Paragraph><List renderItem={function row() { return <Text aria-label="x">b</Text> }} /></Paragraph>`],
      ['a labelled element in a row function held in an object, under a Paragraph', `const A = () => <Paragraph>{list({ renderRow: () => <Text aria-label="x">b</Text> })}</Paragraph>`],
      // X7 — a `children={…}` prop of a VIEW is still the top of its text run.
      ['a labelled Text passed as a YStack\'s children prop', `const A = () => <YStack children={<Text accessibilityLabel="x">b</Text>} />`],
    ])('passes %s', (_name, src) => {
      expect(unannounced(src)).toEqual([])
    })
  })
})
