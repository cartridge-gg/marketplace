import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/collection/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/collection/"!</div>
}
