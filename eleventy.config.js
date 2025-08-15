import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";


export default async function (eleventyConfig) {
  eleventyConfig.setInputDirectory("posts");
  eleventyConfig.setLayoutsDirectory("_layouts");
  eleventyConfig.addPlugin(syntaxHighlight);
};


