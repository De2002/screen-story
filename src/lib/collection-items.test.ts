import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ upsert }) },
}));
import { addCollectionItem } from "./collection-items";

describe("adding collection items", () => {
  beforeEach(() => upsert.mockReset());
  it("ignores repeated additions without overwriting the existing position", async () => {
    upsert.mockResolvedValue({ error: null });
    await addCollectionItem("collection-1", "movie-157336", 3);
    expect(upsert).toHaveBeenCalledWith(
      { collection_id: "collection-1", title_id: "movie-157336", position: 3 },
      { onConflict: "collection_id,title_id", ignoreDuplicates: true },
    );
  });
  it("rejects failed additions so callers cannot report success", async () => {
    const error = { code: "23503", message: "Missing title" };
    upsert.mockResolvedValue({ error });
    await expect(addCollectionItem("collection-1", "movie-157336", 0)).rejects.toEqual(error);
  });
});