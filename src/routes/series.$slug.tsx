import { createFileRoute } from "@tanstack/react-router";
import { TitlePage } from "@/components/title-page";
import { loadTitle, tabSearch, titleHead } from "@/lib/title-route";

export const Route = createFileRoute("/series/$slug")({
  validateSearch: tabSearch,
  loader: ({ params }) => loadTitle("series", params.slug),
  head: ({ loaderData }) => titleHead(loaderData),
  component: SeriesPage,
});

function SeriesPage() {
  const t = Route.useLoaderData();
  const { tab } = Route.useSearch();
  return <TitlePage t={t} tab={tab} />;
}
