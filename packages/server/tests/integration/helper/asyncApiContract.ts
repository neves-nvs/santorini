import Ajv from "ajv";
import { parse } from "yaml";
import { readFileSync } from "node:fs";

type Json = { [key: string]: unknown };

const ajv = new Ajv({ unknownFormats: "ignore" });
const spec = parse(readFileSync(new URL(import.meta.resolve("@santorini/shared/asyncapi.yaml")), "utf8")) as Json;

function resolveRefs(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(resolveRefs);
  if (typeof node !== "object" || node === null) return node;
  const { $ref, ...rest } = node as Json;
  if (typeof $ref === "string") {
    const target = $ref
      .replace("#/", "")
      .split("/")
      .reduce<unknown>((at, key) => (at as Json)[key], spec);
    return resolveRefs(target);
  }
  return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, resolveRefs(value)]));
}

const messages = (spec.components as { messages: Record<string, { name: string; payload: unknown }> }).messages;
const validators = new Map(
  Object.values(messages).map((message) => [message.name, ajv.compile(resolveRefs(message.payload) as object)]),
);

// Returns what is wrong with a frame, or nothing when asyncapi.yaml describes it.
export function checkAgainstAsyncApi(frame: { type: string }): string | undefined {
  const validate = validators.get(frame.type);
  if (!validate) return `${frame.type} is not in asyncapi.yaml`;
  if (!validate(frame)) return `${frame.type}: ${ajv.errorsText(validate.errors)}`;
}
