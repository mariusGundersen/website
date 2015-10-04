const gulp = require('gulp');
const forEach = require('gulp-foreach');
const frontMatter = require('gulp-front-matter');
const markdown = require('gulp-markdown');
const marked = require('marked');
const merge = require('merge-stream');
const wrap = require('gulp-wrap-layout');

gulp.task('build', function(){
  return gulp.src('article/*')
  .pipe(forEach(function(stream, file){
    const name = file.relative;
    console.log(name);
    const article = buildArticle(name);
    const images = gulp.src('article/'+name+'/@(thumbnail|fullsize)/*', {base: 'article'});
    
    return merge(article, images);
  }))
  .pipe(gulp.dest('output'));
});


gulp.task('css', function(){
  return gulp.src('style/*')
  .pipe(gulp.dest('output/style'));
});



function buildArticle(name){
  return gulp.src('article/'+name+'/index.md', {base: 'article'})
  .pipe(frontMatter({
    property: 'frontMatter',
    remove: true
  }))
  .pipe(markdown({
    highlight: function (code) {
      return require('highlight.js').highlightAuto(code).value;
    },
    renderer: createRenderer(),
    gfm: true
  }))
  .pipe(wrap({src: 'template.ejs'}))
}


function createRenderer(){
  const renderer = new marked.Renderer();

  renderer.image = function (href, title, text) {
    return '<a class="imageLink" href="fullsize/'+href+'"><img src="thumbnail/'+href+'" /></a>';
  };
  
  return renderer;
}