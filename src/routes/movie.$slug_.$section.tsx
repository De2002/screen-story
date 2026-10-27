import { createFileRoute } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";
import { loadTitle, titleHead } from "@/lib/title-route";

export const Route = createFileRoute("/movie/$slug_/$section")({
  loader: ({ params }) => loadTitle("movie", params.slug),
  head: ({ loaderData, params }) => titleHead(loaderData, params.section),
  component: MovieSectionPage,
});

function MovieSectionPage() {
  const t = Route.useLoaderData();
  return <SectionPage t={t} section={Route.useParams().section} />;
}
