import { ListContent, normalizeFilter } from '../page'

interface PageProps {
  params: Promise<{ crId: string }>
  searchParams: Promise<{ filter?: string; q?: string }>
}

/**
 * When the user navigates to /changes/[crId], the parallel @list slot
 * matches this route — same list as /changes, with the selected PR
 * highlighted. The list component is reused; only the `selectedId`
 * differs, so React keeps the DOM stable across navigation.
 */
export default async function ListSlotWithSelection({ params, searchParams }: PageProps) {
  const [{ crId }, sp] = await Promise.all([params, searchParams])
  return (
    <ListContent filter={normalizeFilter(sp.filter)} query={sp.q ?? ''} selectedId={crId} />
  )
}
