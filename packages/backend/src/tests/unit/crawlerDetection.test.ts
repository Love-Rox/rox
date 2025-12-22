import { describe, it, expect } from "bun:test";
import {
  isEmbedCrawler,
  isActivityPubRequest,
} from "../../lib/crawlerDetection.js";

describe("crawlerDetection", () => {
  describe("isEmbedCrawler", () => {
    it("should return false for undefined User-Agent", () => {
      expect(isEmbedCrawler(undefined)).toBe(false);
    });

    it("should return false for empty User-Agent", () => {
      expect(isEmbedCrawler("")).toBe(false);
    });

    it("should return false for regular browser User-Agent", () => {
      expect(
        isEmbedCrawler(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
      ).toBe(false);
    });

    it("should detect Discord bot", () => {
      expect(
        isEmbedCrawler(
          "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
        )
      ).toBe(true);
    });

    it("should detect Discord bot case-insensitively", () => {
      expect(
        isEmbedCrawler(
          "Mozilla/5.0 (compatible; discordbot/2.0; +https://discordapp.com)"
        )
      ).toBe(true);
    });

    it("should detect Slack link expanding bot", () => {
      expect(
        isEmbedCrawler(
          "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"
        )
      ).toBe(true);
    });

    it("should detect Slack image proxy bot", () => {
      expect(
        isEmbedCrawler("Slack-ImgProxy 0.19 (+https://api.slack.com/robots)")
      ).toBe(true);
    });

    it("should detect Twitter bot", () => {
      expect(isEmbedCrawler("Twitterbot/1.0")).toBe(true);
    });

    it("should detect Facebook external hit bot", () => {
      expect(
        isEmbedCrawler(
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
        )
      ).toBe(true);
    });

    it("should detect LinkedIn bot", () => {
      expect(
        isEmbedCrawler("LinkedInBot/1.0 (compatible; Mozilla/5.0;)")
      ).toBe(true);
    });

    it("should detect Telegram bot", () => {
      expect(
        isEmbedCrawler(
          "TelegramBot (like TwitterBot)"
        )
      ).toBe(true);
    });

    it("should detect WhatsApp", () => {
      expect(isEmbedCrawler("WhatsApp/2.19.258")).toBe(true);
    });

    it("should detect Apple bot", () => {
      expect(
        isEmbedCrawler(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1)"
        )
      ).toBe(true);
    });

    it("should detect Line", () => {
      expect(isEmbedCrawler("Line/1.0.0")).toBe(true);
    });

    it("should not detect Google bot (not an embed crawler)", () => {
      expect(
        isEmbedCrawler(
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        )
      ).toBe(false);
    });

    it("should not detect Bing bot (not an embed crawler)", () => {
      expect(
        isEmbedCrawler(
          "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
        )
      ).toBe(false);
    });
  });

  describe("isActivityPubRequest", () => {
    it("should return false for undefined Accept header", () => {
      expect(isActivityPubRequest(undefined)).toBe(false);
    });

    it("should return false for empty Accept header", () => {
      expect(isActivityPubRequest("")).toBe(false);
    });

    it("should return false for HTML Accept header", () => {
      expect(isActivityPubRequest("text/html")).toBe(false);
    });

    it("should return false for JSON Accept header", () => {
      expect(isActivityPubRequest("application/json")).toBe(false);
    });

    it("should return true for activity+json Accept header", () => {
      expect(isActivityPubRequest("application/activity+json")).toBe(true);
    });

    it("should return true for ld+json Accept header", () => {
      expect(isActivityPubRequest("application/ld+json")).toBe(true);
    });

    it("should return true for activity+json with profile parameter", () => {
      expect(
        isActivityPubRequest(
          'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
        )
      ).toBe(true);
    });

    it("should return true when activity+json is part of Accept header", () => {
      expect(
        isActivityPubRequest(
          "application/activity+json, application/ld+json, text/html"
        )
      ).toBe(true);
    });

    it("should return true when ld+json is part of Accept header", () => {
      expect(
        isActivityPubRequest("text/html, application/ld+json")
      ).toBe(true);
    });
  });
});
