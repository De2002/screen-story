import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it.each(["movie", "series"])("opens %s sections outside the title-page parent", (kind) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const section of ["lessons", "quotes", "reviews", "questions", "moments", "director"]) {
      const matches = router.matchRoutes(`/${kind}/interstellar-2014-157336/${section}`);
      expect(matches.at(-1)?.routeId).toBe(`/${kind}/$slug_/$section`);
      expect(matches.map((match) => match.routeId)).not.toContain(`/${kind}/$slug`);
    }
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
