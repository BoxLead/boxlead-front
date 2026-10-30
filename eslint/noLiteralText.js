const TEXT_ATTRIBUTES = new Set(['aria-label', 'aria-description', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext', 'alt', 'label', 'placeholder', 'title'])
const LETTER = /\p{L}/u

function hiddenFromReaders(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type !== 'JSXElement') continue
    const hidden = current.openingElement.attributes.some(
      (attribute) =>
        attribute.type === 'JSXAttribute' &&
        attribute.name.name === 'aria-hidden' &&
        (attribute.value === null ||
          (attribute.value.type === 'Literal' && attribute.value.value === 'true') ||
          (attribute.value.type === 'JSXExpressionContainer' && attribute.value.expression.type === 'Literal' && attribute.value.expression.value === true)),
    )
    if (hidden) return true
  }
  return false
}

export const noLiteralText = {
  meta: {
    type: 'problem',
    docs: { description: 'Visible text must come from the message files in src/i18n/messages' },
    schema: [{ type: 'object', properties: { allow: { type: 'array', items: { type: 'string' } } }, additionalProperties: false }],
    messages: { literal: 'Move "{{text}}" to the message files and read it with t().' },
  },
  create(context) {
    const allowed = new Set(context.options[0]?.allow ?? [])

    function check(node, raw) {
      const text = raw.replace(/\s+/g, ' ').trim()
      if (!LETTER.test(text) || allowed.has(text) || hiddenFromReaders(node)) return
      context.report({ node, messageId: 'literal', data: { text: text.slice(0, 40) } })
    }

    return {
      JSXText(node) {
        check(node, node.value)
      },
      'JSXElement > JSXExpressionContainer > Literal'(node) {
        if (typeof node.value === 'string') check(node, node.value)
      },
      'JSXElement > JSXExpressionContainer > TemplateLiteral'(node) {
        check(node, node.quasis.map((quasi) => quasi.value.cooked ?? '').join(' '))
      },
      JSXAttribute(node) {
        if (!TEXT_ATTRIBUTES.has(node.name.name) || !node.value) return
        if (node.value.type === 'Literal' && typeof node.value.value === 'string') check(node, node.value.value)
        if (node.value.type === 'JSXExpressionContainer' && node.value.expression.type === 'Literal' && typeof node.value.expression.value === 'string') {
          check(node, node.value.expression.value)
        }
      },
    }
  },
}
