import path from "node:path";

export function resolveTemplatePath(baseDir: string, templatePath: string): string {
  const absoluteBaseDir = path.resolve(baseDir);
  const absolutePath = path.resolve(absoluteBaseDir, templatePath);

  const baseWithSep = absoluteBaseDir.endsWith(path.sep)
    ? absoluteBaseDir
    : `${absoluteBaseDir}${path.sep}`;

  if (absolutePath !== absoluteBaseDir && !absolutePath.startsWith(baseWithSep)) {
    throw new Error(`Template path escapes baseDir: ${templatePath}`);
  }

  return absolutePath;
}
