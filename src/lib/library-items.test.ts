import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, upsert, match } = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), match: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { writeLibraryStatus } from "./library-items";

describe("library status writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ upsert, delete: () => ({ match }) });
    upsert.mockResolvedValue({ error: null });
    match.mockResolvedValue({ error: null });
  });
  it.each(["watched", "want"] as const)("saves %s without rewriting protected catalog data", async (status) => {
    await writeLibraryStatus("user-1", "movie-157336", status);
    expect(from.mock.calls).toEqual([["library"]]);
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", title_id: "movie-157336", status },
      { onConflict: "user_id,title_id" },
    );
  });
  it("removes the member's existing selection", async () => {
    await writeLibraryStatus("user-1", "movie-157336", null);
    expect(match).toHaveBeenCalledWith({ user_id: "user-1", title_id: "movie-157336" });
  });
  it("rejects failed saves", async () => {
    const error = { code: "42501" };
    upsert.mockResolvedValue({ error });
    await expect(writeLibraryStatus("user-1", "movie-157336", "watched")).rejects.toEqual(error);
  });
});