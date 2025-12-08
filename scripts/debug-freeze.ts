/**
 * Debug script to detect browser freeze on timeline page
 *
 * This script uses Playwright to:
 * 1. Load the timeline page
 * 2. Monitor for long tasks (>50ms) that could cause freezing
 * 3. Click on various elements and detect if the browser becomes unresponsive
 * 4. Capture performance metrics and console logs
 *
 * Usage: bun run scripts/debug-freeze.ts [url]
 */

import { chromium } from "playwright";

const BASE_URL = process.argv[2] || "http://localhost:3000";
const LOGIN_TOKEN = process.env.DEBUG_TOKEN || "";

async function debugFreeze() {
  console.log(`\n🔍 Starting browser freeze debug on ${BASE_URL}\n`);

  const browser = await chromium.launch({
    headless: false, // Show browser for visual debugging
    devtools: true,  // Open devtools to see console
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Set auth token if provided
  if (LOGIN_TOKEN) {
    await context.addCookies([
      {
        name: "token",
        value: LOGIN_TOKEN,
        domain: new URL(BASE_URL).hostname,
        path: "/",
      },
    ]);
  }

  const page = await context.newPage();

  // Collect console logs
  const consoleLogs: string[] = [];
  page.on("console", (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === "error") {
      console.log(`❌ Console error: ${msg.text()}`);
    }
  });

  // Detect page errors
  page.on("pageerror", (error) => {
    console.log(`💥 Page error: ${error.message}`);
  });

  // Inject performance monitoring
  await page.addInitScript(() => {
    // Track long tasks
    const longTasks: { duration: number; startTime: number; name: string }[] = [];

    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
            console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
          if (entry.duration > 500) {
            console.error(`🔴 VERY LONG TASK: ${entry.duration.toFixed(2)}ms - This could cause freeze!`);
          }
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    }

    // Track click events and measure response time
    let clickStartTime = 0;
    document.addEventListener("mousedown", () => {
      clickStartTime = performance.now();
    }, { capture: true });

    document.addEventListener("mouseup", () => {
      const duration = performance.now() - clickStartTime;
      if (duration > 100) {
        console.warn(`⚠️ Slow click response: ${duration.toFixed(2)}ms`);
      }
    }, { capture: true });

    // Expose long tasks to playwright
    (window as any).__longTasks = longTasks;

    // Monitor for infinite loops by tracking call stack depth
    let callCount = 0;
    const maxCalls = 10000;
    const originalSetState = (window as any).React?.Component?.prototype?.setState;
    if (originalSetState) {
      (window as any).React.Component.prototype.setState = function(...args: any[]) {
        callCount++;
        if (callCount > maxCalls) {
          console.error("🔴 Possible infinite setState loop detected!");
          callCount = 0;
        }
        return originalSetState.apply(this, args);
      };

      // Reset counter periodically
      setInterval(() => { callCount = 0; }, 1000);
    }
  });

  console.log("📄 Loading page...");

  try {
    // Navigate to timeline
    await page.goto(`${BASE_URL}/timeline`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log("✅ Page loaded");

    // Wait for content to render
    await page.waitForTimeout(3000);

    // Check for long tasks after initial load
    const initialLongTasks = await page.evaluate(() => (window as any).__longTasks || []);
    if (initialLongTasks.length > 0) {
      console.log(`\n⚠️ Long tasks during initial load: ${initialLongTasks.length}`);
      for (const task of initialLongTasks.slice(0, 5)) {
        console.log(`  - ${task.duration.toFixed(2)}ms at ${task.startTime.toFixed(2)}ms`);
      }
    }

    // Test clicking on different areas
    console.log("\n🖱️ Testing click interactions...\n");

    const clickTargets = [
      { selector: "body", name: "body" },
      { selector: "[role='feed']", name: "timeline feed" },
      { selector: "[role='article']", name: "note card" },
      { selector: "button", name: "first button" },
      { selector: "a", name: "first link" },
    ];

    for (const target of clickTargets) {
      const element = await page.$(target.selector);
      if (element) {
        console.log(`Clicking on ${target.name}...`);

        const startTime = Date.now();

        // Set up a timeout to detect freeze
        const freezePromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 5000); // 5 second timeout = freeze
        });

        const clickPromise = (async () => {
          try {
            await element.click({ timeout: 5000 });
            return false;
          } catch (e) {
            return true;
          }
        })();

        const didFreeze = await Promise.race([freezePromise, clickPromise]);
        const duration = Date.now() - startTime;

        if (didFreeze || duration > 3000) {
          console.log(`  🔴 FREEZE DETECTED! Click on ${target.name} took ${duration}ms`);
        } else {
          console.log(`  ✅ Click on ${target.name} completed in ${duration}ms`);
        }

        await page.waitForTimeout(500);
      }
    }

    // Get final performance metrics
    const metrics = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return {
        longTasks: (window as any).__longTasks?.length || 0,
        jsHeapSize: memory?.usedJSHeapSize ? (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + " MB" : "N/A",
        domNodes: document.querySelectorAll("*").length,
      };
    });

    console.log("\n📊 Performance Metrics:");
    console.log(`  - Long tasks: ${metrics.longTasks}`);
    console.log(`  - JS Heap Size: ${metrics.jsHeapSize}`);
    console.log(`  - DOM Nodes: ${metrics.domNodes}`);

    // Keep browser open for manual inspection
    console.log("\n🔍 Browser is open for manual inspection.");
    console.log("Press Ctrl+C to close.\n");

    // Keep the script running
    await new Promise(() => {}); // Never resolves - wait for Ctrl+C

  } catch (error) {
    console.error("Error during debug:", error);
  }
}

debugFreeze().catch(console.error);
