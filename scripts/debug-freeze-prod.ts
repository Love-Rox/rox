/**
 * Debug script to detect browser freeze on production timeline page
 *
 * This script uses Playwright to:
 * 1. Load the timeline page with Long Task API monitoring
 * 2. Capture JavaScript execution that blocks the main thread
 * 3. Click on various elements and detect if the browser becomes unresponsive
 * 4. Generate a performance trace for analysis
 *
 * Usage: bun run scripts/debug-freeze-prod.ts
 */

import { chromium } from "playwright";

const BASE_URL = "https://rox.love-rox.cc";

async function debugFreeze() {
  console.log(`\n🔍 Starting browser freeze debug on ${BASE_URL}\n`);

  const browser = await chromium.launch({
    headless: false, // Show browser for visual debugging
    devtools: true,  // Open devtools to see console
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: "./videos" }, // Record video for later analysis
  });

  const page = await context.newPage();

  // Enable CDP session for advanced performance tracing
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");

  // Start tracing
  await browser.startTracing(page, {
    screenshots: true,
    categories: [
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-v8.cpu_profiler",
    ],
  });

  // Collect console logs
  const consoleLogs: string[] = [];
  page.on("console", (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(`📝 ${text}`);
  });

  // Detect page errors
  page.on("pageerror", (error) => {
    console.log(`💥 Page error: ${error.message}`);
  });

  // Inject Long Task monitoring
  await page.addInitScript(() => {
    // Track long tasks
    const longTasks: { duration: number; startTime: number; attribution: any[] }[] = [];
    (window as any).__longTasks = longTasks;
    (window as any).__freezeDetected = false;

    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            const taskInfo = {
              duration: entry.duration,
              startTime: entry.startTime,
              attribution: (entry as any).attribution || [],
            };
            longTasks.push(taskInfo);

            if (entry.duration > 100) {
              console.warn(`⚠️ Long task: ${entry.duration.toFixed(0)}ms`);
            }
            if (entry.duration > 1000) {
              console.error(`🔴 FREEZE: ${entry.duration.toFixed(0)}ms task blocked main thread!`);
              (window as any).__freezeDetected = true;
            }
          }
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    }

    // Monitor requestAnimationFrame for freeze detection
    let lastFrame = performance.now();
    let frameGaps: number[] = [];
    (window as any).__frameGaps = frameGaps;

    function checkFrameRate() {
      const now = performance.now();
      const gap = now - lastFrame;

      if (gap > 100) { // More than 100ms between frames = janky
        frameGaps.push(gap);
        console.warn(`⚠️ Frame gap: ${gap.toFixed(0)}ms`);
      }
      if (gap > 1000) {
        console.error(`🔴 SEVERE FRAME DROP: ${gap.toFixed(0)}ms - UI frozen!`);
        (window as any).__freezeDetected = true;
      }

      lastFrame = now;
      requestAnimationFrame(checkFrameRate);
    }
    requestAnimationFrame(checkFrameRate);

    // Monitor all event listeners for slow handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (typeof listener === "function") {
        const wrappedListener = function(this: any, event: Event) {
          const start = performance.now();
          const result = (listener as EventListener).call(this, event);
          const duration = performance.now() - start;

          if (duration > 50) {
            console.warn(`⚠️ Slow ${type} handler: ${duration.toFixed(0)}ms`);
          }
          if (duration > 500) {
            console.error(`🔴 VERY SLOW ${type} handler: ${duration.toFixed(0)}ms`);
          }

          return result;
        };
        return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  console.log("📄 Loading page...");

  try {
    // Navigate to timeline
    await page.goto(`${BASE_URL}/timeline`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log("✅ Page loaded, waiting for render...");

    // Wait for content to render
    await page.waitForTimeout(5000);

    // Check initial state
    const initialState = await page.evaluate(() => ({
      longTasks: (window as any).__longTasks?.length || 0,
      freezeDetected: (window as any).__freezeDetected || false,
      frameGaps: (window as any).__frameGaps?.length || 0,
    }));

    console.log(`\n📊 Initial state after load:`);
    console.log(`  - Long tasks (>50ms): ${initialState.longTasks}`);
    console.log(`  - Freeze detected: ${initialState.freezeDetected}`);
    console.log(`  - Frame gaps (>100ms): ${initialState.frameGaps}`);

    // Now test clicks
    console.log("\n🖱️ Testing click interactions...\n");

    // Wait a bit before clicking
    await page.waitForTimeout(2000);

    // Try clicking on different parts of the page
    const clickTests = [
      { x: 640, y: 400, name: "center of page" },
      { x: 640, y: 200, name: "upper center" },
      { x: 640, y: 600, name: "lower center" },
      { x: 300, y: 400, name: "left side" },
      { x: 900, y: 400, name: "right side" },
    ];

    for (const test of clickTests) {
      console.log(`\nClicking on ${test.name} (${test.x}, ${test.y})...`);

      // Record state before click
      const beforeClick = await page.evaluate(() => ({
        longTasks: (window as any).__longTasks?.length || 0,
        freezeDetected: (window as any).__freezeDetected || false,
      }));

      const startTime = Date.now();

      // Click and measure how long it takes to complete
      await page.mouse.click(test.x, test.y);

      // Wait a bit for any handlers to execute
      await page.waitForTimeout(100);

      // Check if page is responsive by evaluating JavaScript
      let pageResponsive = false;
      try {
        await page.evaluate(() => true, { timeout: 5000 });
        pageResponsive = true;
      } catch {
        pageResponsive = false;
      }

      const duration = Date.now() - startTime;

      // Check state after click
      const afterClick = await page.evaluate(() => ({
        longTasks: (window as any).__longTasks?.length || 0,
        freezeDetected: (window as any).__freezeDetected || false,
        lastLongTasks: (window as any).__longTasks?.slice(-3) || [],
      }));

      const newLongTasks = afterClick.longTasks - beforeClick.longTasks;

      if (!pageResponsive) {
        console.log(`  🔴 FREEZE! Page became unresponsive after click`);
      } else if (duration > 1000 || afterClick.freezeDetected) {
        console.log(`  🔴 FREEZE DETECTED! Click took ${duration}ms`);
        if (afterClick.lastLongTasks.length > 0) {
          console.log(`  Recent long tasks:`);
          for (const task of afterClick.lastLongTasks) {
            console.log(`    - ${task.duration.toFixed(0)}ms`);
          }
        }
      } else if (newLongTasks > 0) {
        console.log(`  ⚠️ ${newLongTasks} new long tasks after click`);
      } else {
        console.log(`  ✅ Click completed in ${duration}ms`);
      }

      await page.waitForTimeout(1000);
    }

    // Stop tracing and save
    const traceBuffer = await browser.stopTracing();
    const fs = await import("fs");
    fs.writeFileSync("./trace.json", traceBuffer);
    console.log("\n📁 Trace saved to ./trace.json");
    console.log("   Open in Chrome DevTools > Performance tab > Load profile");

    // Final metrics
    const finalMetrics = await page.evaluate(() => {
      const longTasks = (window as any).__longTasks || [];
      const frameGaps = (window as any).__frameGaps || [];

      return {
        totalLongTasks: longTasks.length,
        longestTask: longTasks.reduce((max: number, t: any) => Math.max(max, t.duration), 0),
        totalFrameGaps: frameGaps.length,
        longestFrameGap: frameGaps.reduce((max: number, g: number) => Math.max(max, g), 0),
        freezeDetected: (window as any).__freezeDetected,
      };
    });

    console.log("\n📊 Final Performance Report:");
    console.log(`  - Total long tasks: ${finalMetrics.totalLongTasks}`);
    console.log(`  - Longest task: ${finalMetrics.longestTask.toFixed(0)}ms`);
    console.log(`  - Frame gaps (>100ms): ${finalMetrics.totalFrameGaps}`);
    console.log(`  - Longest frame gap: ${finalMetrics.longestFrameGap.toFixed(0)}ms`);
    console.log(`  - Freeze detected: ${finalMetrics.freezeDetected}`);

    // Keep browser open for manual inspection
    console.log("\n🔍 Browser is open for manual inspection.");
    console.log("Try clicking around to reproduce the freeze.");
    console.log("Press Ctrl+C to close.\n");

    // Keep the script running
    await new Promise(() => {});

  } catch (error) {
    console.error("Error during debug:", error);

    // Try to stop tracing even on error
    try {
      const traceBuffer = await browser.stopTracing();
      const fs = await import("fs");
      fs.writeFileSync("./trace-error.json", traceBuffer);
      console.log("📁 Error trace saved to ./trace-error.json");
    } catch {}
  }
}

debugFreeze().catch(console.error);
