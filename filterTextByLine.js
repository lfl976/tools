/**
 * 从zsh的history历史中过滤安装的软件
 * history命令导出历史：history > history.txt
 */
const fs = require("fs");

// 读取文件的路径
const filePath = "history.txt";

// 使用UTF-8编码读取文件内容
fs.readFile(filePath, "utf-8", (err, data) => {
  if (err) {
    console.error("Error reading the file:", err);
    return;
  }

  // 将文件内容按行分割成数组
  const lines = data.split("\n");

  // 遍历每一行并输出
  lines.forEach((line) => {
    line = line.replace(/^[0-9\s]+/, "");
    if (line.match(/^brew(?:\s)+install(?:\s)+--cask/)) {
      console.log(line);
    }
  });
});
