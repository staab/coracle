<script>
  import {propEq, sortBy} from 'ramda'
  import {onMount} from 'svelte'
  import {fly} from 'svelte/transition'
  import {alerts} from 'src/state/app'
  import {findReply, isLike} from 'src/util/nostr'
  import relay, {people, user} from 'src/relay'
  import {now} from 'src/util/misc'
  import Spinner from "src/partials/Spinner.svelte"
  import Note from 'src/partials/Note.svelte'
  import Like from 'src/partials/Like.svelte'

  let annotatedNotes = []

  onMount(async () => {
    alerts.set({since: now()})

    const events = await relay.filterEvents({
      kinds: [1, 7],
      '#p': [$user.pubkey],
      customFilter: e => {
        // Don't show people's own stuff
        if (e.pubkey === $user.pubkey) {
          return false
        }

        // Only notify users about positive reactions
        if (e.kind === 7 && !isLike(e.content)) {
          return false
        }

        return true
      }
    })

    const notes = await relay.annotateChunk(
      events.filter(propEq('kind', 1))
    )

    const reactions = await Promise.all(
      events
        .filter(e => e.kind === 7)
        .map(async e => ({
          ...e,
          person: $people[e.pubkey] || {pubkey: e.pubkey},
          parent: await relay.findNote(findReply(e)),
        }))
    )

    // Combine likes of a single note. Remove grandchild likes
    const likesById = {}
    for (const reaction of reactions.filter(e => e.parent?.pubkey === $user.pubkey)) {
      if (!likesById[reaction.parent.id]) {
        likesById[reaction.parent.id] = {...reaction.parent, people: []}
      }

      likesById[reaction.parent.id].people.push(reaction.person)
    }

    annotatedNotes = sortBy(
      e => -e.created_at,
      notes
        .filter(e => e.pubkey !== $user.pubkey)
        .concat(Object.values(likesById))
    )
  })

  alerts.set({since: now()})
</script>

<ul class="py-4 flex flex-col gap-2 max-w-xl m-auto">
  {#each annotatedNotes as e (e.id)}
  {#if e.people}
  <li in:fly={{y: 20}}><Like note={e} /></li>
  {:else}
  <li in:fly={{y: 20}}><Note note={e} /></li>
  {/if}
  {/each}
</ul>

<Spinner />
