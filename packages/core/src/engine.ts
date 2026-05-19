import type { Message, TemplateEngineOptions, TemplateVariables } from "./types";

export class TemplateEngine {
  public readonly options: TemplateEngineOptions;

  constructor(options: TemplateEngineOptions) {
    this.options = options;
  }

  async render(templatePath: string, _variables: TemplateVariables = {}): Promise<Message[]> {
    const placeholder: Message = {
      role: "system",
      content: `Template rendering for ${templatePath} is not implemented yet.`
    };

    return [placeholder];
  }
}
