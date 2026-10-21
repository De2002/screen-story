import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/shell";
import { CollectionsGrid } from "@/components/collections";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Collections — Scruttin" },
      { name: "description", content: "Lists of movies and series curated by Scruttin members." },
      { property: "og:title", content: "Member collections — Scruttin" },
      { property: "og:description", content: "Lists of movies and series curated by members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Page>
      <h1 className="font-display text-4xl">Collections</h1>
      <p className="mt-2 text-muted-foreground">Lists made by people who watch things and remember them.</p>
      <div className="mt-8"><CollectionsGrid /></div>
    </Page>
  ),
});
