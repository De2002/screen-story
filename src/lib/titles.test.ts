import { describe, expect, it } from "vitest";
import { parseSlug, placeholderFor, slugify } from "./titles";

describe("title urls", () => {
  it("builds readable slugs ending in the catalog id", () => {
    expect(slugify("Interstellar", 2014, 157336)).toBe("interstellar-2014-157336");
  });
  it("reads the catalog id back from a slug", () => {
    expect(parseSlug("breaking-bad-2008-1396")).toBe(1396);
  });
  it("uses series wording on series pages", () => {
    expect(placeholderFor("lessons", "series")).toBe("What did this series teach you?");
  });
});
