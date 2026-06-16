import { PluginSettingTab, Setting, type App } from "obsidian";
import type ImageUploaderPlugin from "./main";
import type { Locale, LogLevel, RemoteStoreSettings } from "./types";

const LOCALES: Locale[] = ["auto", "zh-CN", "zh-TW", "en", "ko", "ja"];
const LOG_LEVELS: LogLevel[] = ["trace", "debug", "log", "info", "warn", "error", "off"];

export class ImageUploaderSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ImageUploaderPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(this.plugin.t("generalTab")).setHeading();
    this.renderGeneralSettings(containerEl);
    new Setting(containerEl).setName("GitHub").setHeading();
    this.renderStoreSettings(containerEl, this.activeStoreByType("github"));
  }

  private renderGeneralSettings(containerEl: HTMLElement): void {
    const t = this.plugin.t;

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
        for (const store of this.plugin.settings.stores) {
          dropdown.addOption(store.id, store.name);
        }
        dropdown.setValue(this.plugin.settings.activeStoreId).onChange(async (value) => {
          this.plugin.settings.activeStoreId = value;
          await this.plugin.saveSettings();
        });
      });

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

  private renderStoreSettings(containerEl: HTMLElement, store: RemoteStoreSettings): void {
    const t = this.plugin.t;

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
      .setDesc(this.privateImagesDesc())
      .addToggle((toggle) =>
        toggle.setValue(store.github.useTokenForPrivateImages).onChange(async (value) => {
          store.github.useTokenForPrivateImages = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );
  }

  private activeStoreByType(type: "github"): RemoteStoreSettings {
    const store = this.plugin.settings.stores.find((configuredStore) => configuredStore.type === type);
    if (!store) {
      throw new Error(`Missing ${type} store settings.`);
    }
    return store;
  }

  private privateImagesDesc(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    fragment.appendText(this.plugin.t("privateImagesDesc"));
    fragment.createDiv({ cls: "ok-image-uploader-warning", text: this.plugin.t("privateImagesWarning") });
    return fragment;
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
