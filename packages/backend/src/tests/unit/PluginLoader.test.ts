/**
 * PluginLoader Unit Tests
 *
 * Tests the PluginLoader class for plugin discovery, loading, and lifecycle management.
 *
 * @module tests/unit/PluginLoader.test
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PluginLoader, InMemoryPluginConfigStorage } from "../../plugins/loader.js";
import { EventBus } from "../../lib/events.js";

const TEST_PLUGINS_DIR = "/tmp/rox-test-plugins";

describe("PluginLoader", () => {
  let loader: PluginLoader;
  let eventBus: EventBus;
  let configStorage: InMemoryPluginConfigStorage;

  beforeEach(async () => {
    eventBus = new EventBus();
    configStorage = new InMemoryPluginConfigStorage();

    // Create test plugins directory
    await mkdir(TEST_PLUGINS_DIR, { recursive: true });

    loader = new PluginLoader({
      pluginsDir: TEST_PLUGINS_DIR,
      eventBus,
      configStorage,
      baseUrl: "https://example.com",
      instanceName: "Test Instance",
      roxVersion: "2025.12.0",
    });
  });

  afterEach(async () => {
    // Clean up test plugins directory
    await rm(TEST_PLUGINS_DIR, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("should create loader with options", () => {
      expect(loader).toBeDefined();
      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });

  describe("loadAll()", () => {
    it("should return empty array when plugins directory is empty", async () => {
      const results = await loader.loadAll();
      expect(results).toHaveLength(0);
    });

    it("should return empty array when plugins directory does not exist", async () => {
      const loaderWithBadDir = new PluginLoader({
        pluginsDir: "/nonexistent/path",
        eventBus,
        configStorage,
        baseUrl: "https://example.com",
        instanceName: "Test Instance",
        roxVersion: "2025.12.0",
      });

      const results = await loaderWithBadDir.loadAll();
      expect(results).toHaveLength(0);
    });

    it("should load valid plugin", async () => {
      // Create a test plugin
      const pluginDir = join(TEST_PLUGINS_DIR, "test-plugin");
      await mkdir(pluginDir);

      // Write plugin manifest
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({
          id: "test-plugin",
          name: "Test Plugin",
          version: "1.0.0",
        }),
      );

      // Write plugin code
      await writeFile(
        join(pluginDir, "index.js"),
        `
        export default {
          id: "test-plugin",
          name: "Test Plugin",
          version: "1.0.0",
        };
        `,
      );

      const results = await loader.loadAll();

      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.pluginId).toBe("test-plugin");
    });

    it("should fail for plugin without manifest", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "bad-plugin");
      await mkdir(pluginDir);

      // Only write plugin code, no manifest
      await writeFile(
        join(pluginDir, "index.js"),
        `export default { id: "bad", name: "Bad", version: "1.0.0" };`,
      );

      const results = await loader.loadAll();

      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(false);
      expect(results[0]!.error).toContain("No valid manifest found");
    });
  });

  describe("getLoadedPlugins()", () => {
    it("should return all loaded plugins", async () => {
      // Create two test plugins
      for (const name of ["plugin-a", "plugin-b"]) {
        const pluginDir = join(TEST_PLUGINS_DIR, name);
        await mkdir(pluginDir);
        await writeFile(
          join(pluginDir, "plugin.json"),
          JSON.stringify({ id: name, name, version: "1.0.0" }),
        );
        await writeFile(
          join(pluginDir, "index.js"),
          `export default { id: "${name}", name: "${name}", version: "1.0.0" };`,
        );
      }

      await loader.loadAll();
      const plugins = loader.getLoadedPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins.map((p) => p.plugin.id).sort()).toEqual(["plugin-a", "plugin-b"]);
    });
  });

  describe("getPlugin()", () => {
    it("should return undefined for non-existent plugin", () => {
      expect(loader.getPlugin("nonexistent")).toBeUndefined();
    });

    it("should return plugin by id", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "my-plugin");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({ id: "my-plugin", name: "My Plugin", version: "1.0.0" }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `export default { id: "my-plugin", name: "My Plugin", version: "1.0.0" };`,
      );

      await loader.loadAll();
      const plugin = loader.getPlugin("my-plugin");

      expect(plugin).toBeDefined();
      expect(plugin?.plugin.id).toBe("my-plugin");
    });
  });

  describe("isLoaded()", () => {
    it("should return false for non-loaded plugin", () => {
      expect(loader.isLoaded("test")).toBe(false);
    });

    it("should return true for loaded plugin", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "test");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({ id: "test", name: "Test", version: "1.0.0" }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `export default { id: "test", name: "Test", version: "1.0.0" };`,
      );

      await loader.loadAll();

      expect(loader.isLoaded("test")).toBe(true);
    });
  });

  describe("unloadPlugin()", () => {
    it("should return false for non-existent plugin", async () => {
      const result = await loader.unloadPlugin("nonexistent");
      expect(result).toBe(false);
    });

    it("should unload plugin and call onUnload", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "unloadable");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({ id: "unloadable", name: "Unloadable", version: "1.0.0" }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `
        let unloaded = false;
        export default {
          id: "unloadable",
          name: "Unloadable",
          version: "1.0.0",
          onUnload() {
            unloaded = true;
          }
        };
        `,
      );

      await loader.loadAll();
      expect(loader.isLoaded("unloadable")).toBe(true);

      const result = await loader.unloadPlugin("unloadable");

      expect(result).toBe(true);
      expect(loader.isLoaded("unloadable")).toBe(false);
    });
  });

  describe("unloadAll()", () => {
    it("should unload all plugins", async () => {
      for (const name of ["p1", "p2", "p3"]) {
        const pluginDir = join(TEST_PLUGINS_DIR, name);
        await mkdir(pluginDir);
        await writeFile(
          join(pluginDir, "plugin.json"),
          JSON.stringify({ id: name, name, version: "1.0.0" }),
        );
        await writeFile(
          join(pluginDir, "index.js"),
          `export default { id: "${name}", name: "${name}", version: "1.0.0" };`,
        );
      }

      await loader.loadAll();
      expect(loader.getLoadedPlugins()).toHaveLength(3);

      await loader.unloadAll();

      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });

  describe("setEnabled()", () => {
    it("should return false for non-existent plugin", async () => {
      const result = await loader.setEnabled("nonexistent", false);
      expect(result).toBe(false);
    });

    it("should toggle plugin enabled state", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "toggleable");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({ id: "toggleable", name: "Toggleable", version: "1.0.0" }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `export default { id: "toggleable", name: "Toggleable", version: "1.0.0" };`,
      );

      await loader.loadAll();
      const plugin = loader.getPlugin("toggleable");
      expect(plugin?.enabled).toBe(true);

      await loader.setEnabled("toggleable", false);
      expect(loader.getPlugin("toggleable")?.enabled).toBe(false);

      await loader.setEnabled("toggleable", true);
      expect(loader.getPlugin("toggleable")?.enabled).toBe(true);
    });
  });

  describe("getPluginsWithRoutes()", () => {
    it("should return empty array when no plugins have routes", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "no-routes");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({ id: "no-routes", name: "No Routes", version: "1.0.0" }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `export default { id: "no-routes", name: "No Routes", version: "1.0.0" };`,
      );

      await loader.loadAll();
      const pluginsWithRoutes = loader.getPluginsWithRoutes();

      expect(pluginsWithRoutes).toHaveLength(0);
    });

    it("should return plugins with routes", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "with-routes");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({ id: "with-routes", name: "With Routes", version: "1.0.0" }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `
        export default {
          id: "with-routes",
          name: "With Routes",
          version: "1.0.0",
          routes(app) {
            app.get("/test", (c) => c.text("Hello"));
          }
        };
        `,
      );

      await loader.loadAll();
      const pluginsWithRoutes = loader.getPluginsWithRoutes();

      expect(pluginsWithRoutes).toHaveLength(1);
      expect(pluginsWithRoutes[0]!.pluginId).toBe("with-routes");
    });
  });

  describe("version compatibility", () => {
    it("should reject plugin requiring newer Rox version", async () => {
      const pluginDir = join(TEST_PLUGINS_DIR, "future-plugin");
      await mkdir(pluginDir);
      await writeFile(
        join(pluginDir, "plugin.json"),
        JSON.stringify({
          id: "future-plugin",
          name: "Future Plugin",
          version: "1.0.0",
          minRoxVersion: "2099.12.0", // Far future version
        }),
      );
      await writeFile(
        join(pluginDir, "index.js"),
        `export default { id: "future-plugin", name: "Future Plugin", version: "1.0.0" };`,
      );

      const results = await loader.loadAll();

      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(false);
      expect(results[0]!.error).toContain("Requires Rox version");
    });
  });
});

describe("InMemoryPluginConfigStorage", () => {
  let storage: InMemoryPluginConfigStorage;

  beforeEach(() => {
    storage = new InMemoryPluginConfigStorage();
  });

  describe("get() and set()", () => {
    it("should return undefined for non-existent key", async () => {
      const value = await storage.get("plugin", "key");
      expect(value).toBeUndefined();
    });

    it("should return default value for non-existent key", async () => {
      const value = await storage.get("plugin", "key", "default");
      expect(value).toBe("default");
    });

    it("should store and retrieve value", async () => {
      await storage.set("plugin", "key", { foo: "bar" });
      const value = await storage.get<{ foo: string }>("plugin", "key");
      expect(value).toEqual({ foo: "bar" });
    });

    it("should store values per plugin", async () => {
      await storage.set("plugin1", "key", "value1");
      await storage.set("plugin2", "key", "value2");

      expect(await storage.get<string>("plugin1", "key")).toBe("value1");
      expect(await storage.get<string>("plugin2", "key")).toBe("value2");
    });
  });

  describe("delete()", () => {
    it("should delete value", async () => {
      await storage.set("plugin", "key", "value");
      await storage.delete("plugin", "key");

      const value = await storage.get("plugin", "key");
      expect(value).toBeUndefined();
    });

    it("should not affect other keys", async () => {
      await storage.set("plugin", "key1", "value1");
      await storage.set("plugin", "key2", "value2");
      await storage.delete("plugin", "key1");

      expect(await storage.get<string>("plugin", "key1")).toBeUndefined();
      expect(await storage.get<string>("plugin", "key2")).toBe("value2");
    });
  });

  describe("deleteAll()", () => {
    it("should delete all plugin config", async () => {
      await storage.set("plugin", "key1", "value1");
      await storage.set("plugin", "key2", "value2");
      await storage.deleteAll("plugin");

      expect(await storage.get("plugin", "key1")).toBeUndefined();
      expect(await storage.get("plugin", "key2")).toBeUndefined();
    });

    it("should not affect other plugins", async () => {
      await storage.set("plugin1", "key", "value1");
      await storage.set("plugin2", "key", "value2");
      await storage.deleteAll("plugin1");

      expect(await storage.get<string>("plugin1", "key")).toBeUndefined();
      expect(await storage.get<string>("plugin2", "key")).toBe("value2");
    });
  });
});
