import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginFilters from "./content/_config/filters.js";


export default async function (eleventyConfig) {
  eleventyConfig.setInputDirectory("content");
  eleventyConfig.setLayoutsDirectory("_layouts");
  eleventyConfig.addWatchTarget('content/article');

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    widths: ["500", "1000"],
    htmlOptions: {
      imgAttributes: {
        loading: 'lazy'
      }
    }
  });

  eleventyConfig.addPassthroughCopy("content/article/**/fonts/*", {
    //mode: "html-relative"
  });
  eleventyConfig.addPassthroughCopy("content/js/**/*");
  eleventyConfig.addPassthroughCopy("content/css/**/*");
  eleventyConfig.addPassthroughCopy("content/favicon.png");

  eleventyConfig.addPlugin(pluginFilters);
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom", // or "rss", "json"
    outputPath: "/feed.xml",
    collection: {
      name: "posts", // iterate over `collections.posts`
      limit: 10,     // 0 means no limit
    },
    metadata: {
      language: "en",
      title: "Marius Gundersen",
      subtitle: "Articles from Marius Gundersen",
      base: "https://mariusgundersen.net/",
      author: {
        name: "Marius Gundersen",
        email: "me@mariusgundersen.net", // Optional
      }
    }
  });

  eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
      return false;
    }
  });
};


