import * as fs from 'node:fs/promises';

const dirs = await fs.readdir('./article', { withFileTypes: true });

for (const { name, parentPath } of dirs.filter(d => d.isDirectory())) {
  const filePath = `${parentPath}/${name}/index.md`;
  const md = await fs.readFile(filePath, 'utf8');
  const lines = md.split('\r\n');
  const from = lines.indexOf('---') + 1;
  const to = lines.indexOf('---', from);
  console.log(name, from, to)

  if (lines[to + 2].startsWith('# ')) {
    console.log(lines[to + 2]);
    lines.splice(to + 2, 1);
  }

  lines.splice(to, 0, `redirect_from: /${name}`);
  const frontMatter = lines.slice(from, to + 1);
  const [, ...date] = frontMatter.map(l => l.split(':')).find(l => l[0] === 'date');
  const subdir = date.join(':').trim().replaceAll('"', '');
  console.log(subdir);


  await fs.writeFile(filePath, lines.join('\r\n'));
  await fs.mkdir(`${parentPath}/${subdir}`, { recursive: true });
  await fs.rename(`${parentPath}/${name}`, `${parentPath}/${subdir}/${name}`);
}