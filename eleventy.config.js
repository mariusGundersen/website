import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

import pluginFilters from "./content/_config/filters.js";


export default async function (eleventyConfig) {
  eleventyConfig.setInputDirectory("content");
  eleventyConfig.setLayoutsDirectory("_layouts");

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    widths: ["500", "1000"],
    htmlOptions: {
      imgAttributes: {
        loading: 'lazy'
      }
    }
  });

  eleventyConfig.addPassthroughCopy("content/js/**/*");
  eleventyConfig.addPassthroughCopy("content/css/**/*");

  eleventyConfig.addPlugin(pluginFilters);
};


