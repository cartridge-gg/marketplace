import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/token/$collectionAddress/$tokenId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/token/$collectionAddress/$tokenId"!</div>
}
