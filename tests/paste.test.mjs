import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: 'export { default as ImageUploaderPlugin } from "./src/main"; export { ImageUploadProcessor } from "./src/processor"; export { DEFAULT_SETTINGS } from "./src/defaults";',
    resolveDir: process.cwd(), loader: "ts"
  },
  bundle: true, platform: "node", format: "cjs", external: ["obsidian"], write: false
});
class Plugin {
  registerEvent() {}
  registerDomEvent(_target, name) { assert.notEqual(name, "paste"); }
  addSettingTab() {}
  registerMarkdownPostProcessor() {}
  addCommand() {}
  async loadData() { return null; }
}
const host = {
  Plugin, PluginSettingTab: class {}, MarkdownView: class {}, TFile: class {},
  Notice: class {}, normalizePath: (path) => path
};
const context = {
  module: { exports: {} },
  require: (name) => { assert.equal(name, "obsidian"); return host; },
  structuredClone, console, URL, Buffer, document: {},
  window: { setTimeout, clearTimeout, navigator: { language: "en" } }
};
vm.runInNewContext(bundle.outputFiles[0].text, context);
const { ImageUploaderPlugin, ImageUploadProcessor, DEFAULT_SETTINGS } = context.module.exports;
const url = "https://images.example/image.png";
const image = { name: "image.png", type: "image/png" };
function clipboardEvent({ files = [], text = "", prevented = false } = {}) {
  return {
    defaultPrevented: prevented, clipboardData: { files, getData: () => text },
    preventDefault() { this.defaultPrevented = true; }
  };
}
function setup(upload = async () => ({ url }), open = false) {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const note = Object.assign(new host.TFile(), { path: "note.md", extension: "md" });
  const local = Object.assign(new host.TFile(), { path: "image.png", name: "image.png" });
  let markdown = "Before ![[image.png]] after";
  const deleted = [];
  const editor = {
    getValue: () => markdown,
    replaceSelection: (text) => { markdown += text; },
    offsetToPos: (ch) => ({ line: 0, ch }),
    transaction: ({ changes }) => {
      for (const change of [...changes].sort((a, b) => b.from.ch - a.from.ch)) {
        markdown = markdown.slice(0, change.from.ch) + change.text + markdown.slice(change.to.ch);
      }
    }
  };
  const view = Object.assign(new host.MarkdownView(), { file: note, editor });
  const app = {
    workspace: { getLeavesOfType: () => open ? [{ view }] : [] },
    vault: {
      read: async () => markdown,
      readBinary: async () => new Uint8Array([1, 2, 3]).buffer,
      getAbstractFileByPath: (path) => path === local.path ? local : null,
      process: async (_file, callback) => { markdown = callback(markdown); },
      delete: async (file) => { deleted.push(file.path); }
    }
  };
  const store = { id: "test", type: "github", upload, isOwnedUrl: (target) => target === url };
  const processor = new ImageUploadProcessor(app, settings, () => store, { debug() {} }, (key) => key);
  return { processor, note, editor, view, deleted, get text() { return markdown; }, set text(value) { markdown = value; } };
}
const tick = () => new Promise(setImmediate);

test("plugin uses editor-paste, never a late document paste handler", async () => {
  const handlers = new Map();
  const plugin = new ImageUploaderPlugin();
  plugin.app = { workspace: { on: (name, callback) => handlers.set(name, callback) }, vault: { on() {} } };
  await plugin.onload();
  assert.equal(typeof handlers.get("editor-paste"), "function");
});

test("clipboard images are left to native insertion, even when text is also provided", async () => {
  const fixture = setup(() => { throw new Error("Unexpected direct upload"); });
  const event = clipboardEvent({ files: [image], text: "![chart](https://example.com/chart.png)" });
  assert.equal(fixture.processor.canHandlePaste(event), false);
  const before = fixture.text;
  assert.equal(await fixture.processor.handlePaste(event, fixture.editor, fixture.view), false);
  assert.equal(event.defaultPrevented, false);
  assert.equal(fixture.text, before);
});

for (const open of [false, true]) {
  test(`local image stays visible during upload; latest ${open ? "editor" : "vault"} text is preserved`, async () => {
    let finish;
    const fixture = setup(() => new Promise((resolve) => { finish = resolve; }), open);
    const pending = fixture.processor.processFile(fixture.note);
    await tick();
    assert.match(fixture.text, /!\[\[image.png\]\]/);
    assert.deepEqual(fixture.deleted, []);
    fixture.text = "Typed while uploading. " + fixture.text;
    finish({ url });
    const result = await pending;
    assert.equal(result.uploaded, 1);
    assert.equal(fixture.text, `Typed while uploading. Before ![](${url}) after`);
    assert.deepEqual(fixture.deleted, ["image.png"]);
    assert.equal((await fixture.processor.processFile(fixture.note)).uploaded, 0);
  });
}

test("failed upload retains the visible local image and attachment", async () => {
  const fixture = setup(async () => { throw new Error("Upload failed"); });
  await assert.rejects(fixture.processor.processFile(fixture.note), /Upload failed/);
  assert.equal(fixture.text, "Before ![[image.png]] after");
  assert.deepEqual(fixture.deleted, []);
});

test("removing an image while uploading does not reinsert it or delete its attachment", async () => {
  let finish;
  const fixture = setup(() => new Promise((resolve) => { finish = resolve; }), true);
  const pending = fixture.processor.processFile(fixture.note);
  await tick();
  fixture.text = "Image removed";
  finish({ url });
  assert.equal((await pending).uploaded, 0);
  assert.equal(fixture.text, "Image removed");
  assert.deepEqual(fixture.deleted, []);
});

test("images added during upload trigger another processing pass", async () => {
  let finish;
  const fixture = setup(() => new Promise((resolve) => { finish = resolve; }));
  const scheduled = [];
  fixture.processor.scheduleFile = (file) => scheduled.push(file.path);
  const pending = fixture.processor.processFile(fixture.note);
  await tick();
  fixture.text += " ![[new.png]]";
  await fixture.processor.processFile(fixture.note);
  finish({ url });
  await pending;
  assert.deepEqual(scheduled, ["note.md"]);
  assert.match(fixture.text, /!\[\[new.png\]\]/);
});

test("markdown images are inserted immediately and queued for background upload", async () => {
  const fixture = setup(() => { throw new Error("Unexpected direct upload"); });
  fixture.text = "";
  const scheduled = [];
  fixture.processor.scheduleFile = (file) => scheduled.push(file.path);
  const text = "Before ![chart](data:image/png;base64,AQID) after";
  const event = clipboardEvent({ text });
  const pending = fixture.processor.handlePaste(event, fixture.editor, fixture.view);
  assert.equal(event.defaultPrevented, true);
  assert.equal(fixture.text, text);
  await pending;
  assert.deepEqual(scheduled, ["note.md"]);
});

test("already handled events and ordinary text pastes are left alone", async () => {
  const fixture = setup();
  const handled = clipboardEvent({ files: [image], prevented: true });
  assert.equal(fixture.processor.canHandlePaste(handled), false);
  assert.equal(await fixture.processor.handlePaste(handled, fixture.editor, fixture.view), false);
  const event = clipboardEvent({ text: "plain text" });
  assert.equal(await fixture.processor.handlePaste(event, fixture.editor, fixture.view), false);
  assert.equal(event.defaultPrevented, false);
});
