import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { TABS } from "@/lib/titles";
import type { TitleDetail } from "@/lib/tmdb.functions";

export function SectionIndex({ title }: { title: TitleDetail }) {
  return (
    <nav aria-label="Movie and series conversations" className="section-index">
      {TABS.filter((section) => section.key !== "trailer").map((section, index) => (
        <Link
          key={section.key}
          to={title.kind === "movie" ? "/movie/$slug/$section" : "/series/$slug/$section"}
          params={{ slug: title.slug, section: section.key }}
          className={`section-index-tile section-index-${section.key} group`}
        >
          <span aria-hidden="true" className="section-index-number">0{index + 1}</span>
          <span className="section-index-label">{section.label}</span>
          <ArrowUpRight aria-hidden="true" className="section-index-arrow size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      ))}
    </nav>
  );
}