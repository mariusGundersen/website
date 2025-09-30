import * as fs from 'fs/promises';

const dirs = await fs.readdir('./', { withFileTypes: true });

for (const dir of dirs) {
  if (!dir.isDirectory()) continue;
  const date = dir.name;
  const year = /^(\d+)-(\d+)-(\d+)$/.exec(date)?.[1];
  console.log(date, year);
  const subdirs = await fs.readdir('./' + date);
  console.log(subdirs);
  for (const subdir of subdirs) {
    await fs.rename(`./${date}/${subdir}`, `./${year}-${subdir}`);
  }
}