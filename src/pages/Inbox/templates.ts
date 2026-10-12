import type { MessageTemplate } from "../../api/types";

const PLACEHOLDER = /\{\{(\d+)\}\}/g;

export function templatesKey(conversationId: string): string {
  return `/conversations/${conversationId}/templates`;
}

export function fillTemplate(body: string, values: string[]): string {
  return body.replace(PLACEHOLDER, (placeholder, index: string) => {
    const value = values[Number(index) - 1]?.trim();
    return value ? value : placeholder;
  });
}

export function emptyValues(template: MessageTemplate): string[] {
  return Array.from({ length: template.parameterCount }, () => "");
}

export function hasAllValues(template: MessageTemplate, values: string[]): boolean {
  return values.length === template.parameterCount && values.every((value) => value.trim().length > 0);
}
