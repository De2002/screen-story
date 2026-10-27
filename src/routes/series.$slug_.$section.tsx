import { createFileRoute } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";
import { loadTitle, titleHead } from "@/lib/title-route";

export const Route = createFileRoute("/series/$slug/$section")({
  loader: ({ params }) => loadTitle("series", params.slug),
  head: ({ loaderData, params }) => titleHead(loaderData, params.section),
  component: SeriesSectionPage,
});

function SeriesSectionPage() {
  const t = Route.useLoaderData();
  return <SectionPage t={t} section={Route.useParams().section} />;
}
