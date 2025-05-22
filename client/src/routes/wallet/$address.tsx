import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wallet/$address')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/wallet/$address"!</div>
}
