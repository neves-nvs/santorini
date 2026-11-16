const ACCENTED: Record<string, string> = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ',
  n: 'ñ', o: 'ö', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ḿ',
  N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Ü', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
}

// i18next interpolation ({{name}}, {{count, number}}) and nesting ($t(key)) must reach the library untouched
const TOKEN = /\{\{[^}]*\}\}|\$t\([^)]*\)/g

const accent = (text: string) => text.replace(/[a-z]/gi, (letter) => ACCENTED[letter])

/** Accents every letter, pads the text by about 30% and wraps it in brackets so truncation is visible. */
export const pseudoLocalize = (text: string): string => {
  let accented = ''
  let end = 0
  for (const token of text.matchAll(TOKEN)) {
    accented += accent(text.slice(end, token.index)) + token[0]
    end = token.index + token[0].length
  }
  accented += accent(text.slice(end))
  const padding = '~'.repeat(Math.ceil(text.replace(TOKEN, '').length * 0.3))
  return `[${accented}${padding}]`
}

export type Catalog = { [key: string]: string | Catalog }

/** Keys, including plural suffixes such as `_one` and `_other`, stay as they are: only the text changes. */
export const pseudoLocalizeCatalog = (catalog: Catalog): Catalog =>
  Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [
      key,
      typeof value === 'string' ? pseudoLocalize(value) : pseudoLocalizeCatalog(value),
    ]),
  )
