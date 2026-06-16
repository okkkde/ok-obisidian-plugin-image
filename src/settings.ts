import { PluginSettingTab, Setting, type App } from "obsidian";
import { DEFAULT_SETTINGS } from "./defaults";
import type ImageUploaderPlugin from "./main";
import type { Locale, LogLevel } from "./types";

const LOCALES: Locale[] = ["auto", "zh-CN", "zh-TW", "en", "ko", "ja"];
const LOG_LEVELS: LogLevel[] = ["trace", "debug", "log", "info", "warn", "error", "off"];

export class ImageUploaderSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ImageUploaderPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const t = this.plugin.t;
    const store = this.activeStore();
    containerEl.empty();
    containerEl.createEl("h2", { text: t("settingsTitle") });

    new Setting(containerEl)
      .setName(t("locale"))
      .addDropdown((dropdown) => {
        for (const locale of LOCALES) {
          dropdown.addOption(locale, localeLabel(locale, t));
        }
        dropdown.setValue(this.plugin.settings.locale).onChange(async (value) => {
          this.plugin.settings.locale = value as Locale;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t("logLevel"))
      .addDropdown((dropdown) => {
        for (const level of LOG_LEVELS) dropdown.addOption(level, t(level));
        dropdown.setValue(this.plugin.settings.logLevel).onChange(async (value) => {
          this.plugin.settings.logLevel = value as LogLevel;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("activeStore"))
      .setDesc(t("activeStoreDesc"))
      .addDropdown((dropdown) => {
        for (const configuredStore of this.plugin.settings.stores) {
          dropdown.addOption(configuredStore.id, configuredStore.name);
        }
        dropdown.setValue(this.plugin.settings.activeStoreId).onChange(async (value) => {
          this.plugin.settings.activeStoreId = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t("storeName"))
      .addText((text) =>
        text.setValue(store.name).onChange(async (value) => {
          store.name = value.trim() || "GitHub";
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .addButton((button) =>
        button
          .setButtonText(t("addStore"))
          .onClick(async () => {
            const id = `github-${Date.now()}`;
            this.plugin.settings.stores.push({
              ...structuredClone(DEFAULT_SETTINGS.stores[0]),
              id,
              name: `GitHub ${this.plugin.settings.stores.length + 1}`
            });
            this.plugin.settings.activeStoreId = id;
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText(t("removeStore"))
          .setDisabled(this.plugin.settings.stores.length <= 1)
          .onClick(async () => {
            if (this.plugin.settings.stores.length <= 1) return;
            this.plugin.settings.stores = this.plugin.settings.stores.filter((configuredStore) => configuredStore.id !== store.id);
            this.plugin.settings.activeStoreId = this.plugin.settings.stores[0].id;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName(t("githubRepo"))
      .setDesc(t("githubRepoDesc"))
      .addText((text) =>
        text
          .setPlaceholder("owner/repo")
          .setValue(store.github.repo)
          .onChange(async (value) => {
            store.github.repo = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("branch"))
      .addText((text) =>
        text
          .setPlaceholder("main")
          .setValue(store.github.branch)
          .onChange(async (value) => {
            store.github.branch = value.trim() || "main";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("basePath"))
      .setDesc(t("basePathDesc"))
      .addText((text) =>
        text
          .setPlaceholder("images/{yyyy}/{MM}")
          .setValue(store.github.basePath)
          .onChange(async (value) => {
            store.github.basePath = value.trim() || "images/{yyyy}/{MM}";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("token"))
      .setDesc(t("tokenDesc"))
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("github_pat_...").setValue(store.github.token).onChange(async (value) => {
          store.github.token = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("customDomain"))
      .setDesc(t("customDomainDesc"))
      .addText((text) =>
        text
          .setPlaceholder("https://img.example.com")
          .setValue(store.github.customDomain)
          .onChange(async (value) => {
            store.github.customDomain = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("privateImages"))
      .setDesc(t("privateImagesDesc"))
      .addToggle((toggle) =>
        toggle.setValue(store.github.useTokenForPrivateImages).onChange(async (value) => {
          store.github.useTokenForPrivateImages = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );
    if (store.github.useTokenForPrivateImages || store.github.customDomain) {
      containerEl.createDiv({ cls: "ok-image-uploader-warning", text: t("privateImagesWarning") });
    }

    new Setting(containerEl)
      .setName(t("concurrency"))
      .addSlider((slider) =>
        slider
          .setLimits(1, 8, 1)
          .setValue(this.plugin.settings.concurrency)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.concurrency = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("deleteLocal"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.deleteLocalAfterUpload).onChange(async (value) => {
          this.plugin.settings.deleteLocalAfterUpload = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private activeStore() {
    return (
      this.plugin.settings.stores.find((store) => store.id === this.plugin.settings.activeStoreId) ??
      this.plugin.settings.stores[0]
    );
  }
}

function localeLabel(locale: Locale, t: (key: string) => string): string {
  if (locale === "auto") return t("auto");
  if (locale === "zh-CN") return t("zhCN");
  if (locale === "zh-TW") return t("zhTW");
  if (locale === "ko") return t("korean");
  if (locale === "ja") return t("japanese");
  return t("english");
}
