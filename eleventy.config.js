import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import mdxPlugin from '@jamshop/eleventy-plugin-mdx';

import pluginFilters from "./content/_config/filters.js";


export default async function (eleventyConfig) {
  eleventyConfig.setInputDirectory("content");
  eleventyConfig.setLayoutsDirectory("_layouts");

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(mdxPlugin);
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    widths: ["500"]
  });

  /*
    eleventyConfig.addTemplateFormats("mdx");
    eleventyConfig.addExtension("mdx", {
      compile: async (str, inputPath) => {
        const { default: mdxContent } = await evaluate(str, {
          ...runtime,
          baseUrl: pathToFileURL(inputPath)
        });

        return async function (data) {
          let res = await mdxContent(data);
          return renderToStaticMarkup(res);
        }
      }
    });

    // We can add support for TypeScript too, at the same time:
    eleventyConfig.addExtension(["jsx"], {
      compile: async (str, inputPath) => {
        return str;
      }
    });*/


  eleventyConfig.addPlugin(pluginFilters);
};


