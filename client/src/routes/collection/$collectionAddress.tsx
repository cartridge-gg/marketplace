import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/collection/$collectionAddress')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/collection/$collectionAddress"!</div>
}
