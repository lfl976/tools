/**
 * Copy files from source to destination
 */

const fs = require("node:fs/promises");
const path = require("path");

// Source file path
const sourcePaths = [
  "/Users/xxx/Desktop/dirA/testA/a.txt",
  "/Users/xxx/Desktop/dirA/testB/b.txt",
];

sourcePaths.forEach(async (sourcePath) => {
  const dēstinationPath = sourcePath.replace(/dirA/, "dirB");
  await fs.mkdir(path.dirname(dēstinationPath), { recursive: true });
  await fs.copyFile(sourcePath, dēstinationPath);
});
