<script>
  import {prop, reject, sortBy, last} from 'ramda'
  import {fuzzy} from "src/util/misc"
  import {fromParentOffset} from "src/util/html"
  import Badge from "src/partials/Badge.svelte"
  import {people} from "src/relay"

  export let onSubmit

  let index = 0
  let mentions = []
  let suggestions = []
  let input = null
  let prevContent = ''
  let search = fuzzy(
    Object.values($people).filter(prop('name')),
    {keys: ["name", "pubkey"]}
  )

  const getText = () => {
    const selection = document.getSelection()
    const range = selection.getRangeAt(0)

    range.setStartBefore(input)

    const text = range.cloneContents().textContent

    range.collapse()

    return text
  }

  const getWord = () => {
    return last(getText().split(/[\s\u200B]+/))
  }

  const pickSuggestion = ({name, pubkey}) => {
    const text = getText()
    const word = getWord()
    const selection = document.getSelection()
    const {focusNode, focusOffset} = selection
    const at = document.createTextNode("@")
    const span = document.createElement('span')

    // Space includes a zero-width space to avoid having the cursor end up inside
    // mention span on backspace, and a space for convenience in composition.
    const space = document.createTextNode("\u200B\u00a0")

    span.classList.add('underline')
    span.innerText = name

    // Remove our partial mention text
    selection.setBaseAndExtent(...fromParentOffset(input, text.length - word.length), focusNode, focusOffset)
    selection.deleteFromDocument()

    // Add the at sign, decorated mention text, and a trailing space
    selection.getRangeAt(0).insertNode(at)
    selection.collapse(at, 1)
    selection.getRangeAt(0).insertNode(span)
    selection.collapse(span.nextSibling, 0)
    selection.getRangeAt(0).insertNode(space)
    selection.collapse(space, 2)

    mentions.push({
      name,
      pubkey,
      length: name.length + 1,
      end: getText().length - 2,
    })

    index = 0
    suggestions = []
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      return onSubmit()
    }

    if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', ' '].includes(e.key) && suggestions[index]) {
      e.preventDefault()
    }
  }

  const onKeyUp = e => {
    if (['Enter', 'Tab', ' '].includes(e.key) && suggestions[index]) {
      pickSuggestion(suggestions[index])
    }

    if (e.key === 'ArrowUp' && suggestions[index - 1]) {
      index -= 1
    }

    if (e.key === 'ArrowDown' && suggestions[index + 1]) {
      index += 1
    }

    if (input.innerText !== prevContent) {
      const text = getText()
      const word = getWord()

      if (!text.match(/\s$/) && word.startsWith('@')) {
        suggestions = search(word.slice(1)).slice(0, 3)
      } else {
        index = 0
        suggestions = []
      }

      if (input.innerText.length < prevContent.length) {
        const delta = prevContent.length - input.innerText.length
        const text = getText()

        for (const mention of mentions) {
          if (mention.end - mention.length > text.length) {
            mention.end -= delta
          } else if (mention.end > text.length) {
            mention.invalid = true
          }
        }
      }

      prevContent = input.innerText
    }
  }

  export const parse = () => {
    // Interpolate mentions
    let offset = 0
    let content = input.innerText
    const validMentions = sortBy(prop('end'), reject(prop('invalid'), mentions))
    for (const [i, {end, length}] of validMentions.entries()) {
      const offsetEnd = end - offset
      const start = offsetEnd - length
      const tag = `#[${i}]`

      content = content.slice(0, start) + tag + content.slice(offsetEnd)
      offset += length - tag.length
    }

    // Remove our zero-length spaces
    content = content.replace(/\u200B/g, '')

    return {content, mentions: validMentions.map(prop('pubkey'))}
  }
</script>

<div class="flex">
  <div
    class="text-white w-full outline-0 p-2"
    autofocus
    contenteditable
    bind:this={input}
    on:keydown={onKeyDown}
    on:keyup={onKeyUp} />
  <slot name="addon" />
</div>
{#each suggestions as person, i (person.pubkey)}
<div
  class="py-2 px-4 cursor-pointer"
  class:bg-black={index !== i}
  class:bg-dark={index === i}
  on:click={() => pickSuggestion(person)}>
  <Badge inert {person} />
</div>
{/each}
