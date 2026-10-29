import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/tmdb.functions", () => ({ ensureTitles: vi.fn() }));
import { validateFavouriteSlot } from "./profile-favourites";

describe("Favourite Four limit", () => {
  it("permits exactly the four available slots", () => {
    for (const slot of [0, 1, 2, 3]) expect(() => validateFavouriteSlot(slot)).not.toThrow();
    for (const slot of [-1, 4, 5, 0.5]) expect(() => validateFavouriteSlot(slot)).toThrow();
  });
});