import { extractUrls } from "../src/utils/url-utils";

describe("extractUrls", () => {
  it("returns empty array for empty or non-URL text", () => {
    expect(extractUrls("")).toEqual([]);
    expect(extractUrls("   ")).toEqual([]);
    expect(extractUrls("hola sin url")).toEqual([]);
  });

  it("extracts a single URL", () => {
    expect(extractUrls("https://www.youtube.com/watch?v=abc")).toEqual([
      "https://www.youtube.com/watch?v=abc",
    ]);
    expect(extractUrls("Mira esto https://twitter.com/x/status/123")).toEqual([
      "https://twitter.com/x/status/123",
    ]);
  });

  it("extracts multiple URLs and deduplicates", () => {
    const text =
      "https://youtube.com/watch?v=1 y más https://youtube.com/watch?v=2 y https://youtube.com/watch?v=1";
    expect(extractUrls(text)).toEqual([
      "https://youtube.com/watch?v=1",
      "https://youtube.com/watch?v=2",
    ]);
  });
});
