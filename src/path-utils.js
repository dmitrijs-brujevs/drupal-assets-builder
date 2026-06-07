import path from "node:path";
import { DrupalAssetsError } from "./errors.js";

export const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
  ".ico",
]);
export const FONT_EXTENSIONS = new Set([
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
]);

export function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function assertInside(parent, child, label = "path") {
  if (!isInside(parent, child)) {
    throw new DrupalAssetsError(
      "PATH_ESCAPE",
      `${label} escapes its allowed root: ${child}`,
    );
  }
}

export function classifyAsset(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".scss") return "scss";
  if (extension === ".js") return "js";
  if (IMAGE_EXTENSIONS.has(extension)) return "images";
  if (FONT_EXTENSIONS.has(extension)) return "fonts";
  return null;
}
