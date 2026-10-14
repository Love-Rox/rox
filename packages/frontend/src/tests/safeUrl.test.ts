/**
 * safeUrl Utility Tests
 *
 * Ensures remote-controlled URLs with dangerous schemes are rejected.
 */

import { describe, test, expect } from "bun:test";
import { toSafeHttpUrl } from "../lib/utils/safeUrl";

describe("toSafeHttpUrl", () => {
  test("accepts http and https URLs", () => {
    expect(toSafeHttpUrl("https://remote.example/notes/1")).toBe("https://remote.example/notes/1");
    expect(toSafeHttpUrl("http://remote.example/@alice")).toBe("http://remote.example/@alice");
    expect(toSafeHttpUrl("  https://remote.example/x  ")).toBe("https://remote.example/x");
  });

  test("rejects javascript: URLs in any casing or with whitespace", () => {
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeHttpUrl("JavaScript:alert(1)")).toBeNull();
    expect(toSafeHttpUrl(" javascript:alert(document.cookie)")).toBeNull();
    expect(toSafeHttpUrl("java\tscript:alert(1)")).toBeNull();
  });

  test("rejects other non-http schemes", () => {
    expect(toSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(toSafeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(toSafeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(toSafeHttpUrl("ftp://example.com/file")).toBeNull();
  });

  test("rejects relative, empty, and malformed values", () => {
    expect(toSafeHttpUrl("/notes/1")).toBeNull();
    expect(toSafeHttpUrl("")).toBeNull();
    expect(toSafeHttpUrl(null)).toBeNull();
    expect(toSafeHttpUrl(undefined)).toBeNull();
    expect(toSafeHttpUrl("not a url")).toBeNull();
  });
});
