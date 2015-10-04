const concat = require('gulp-concat');
const gulp = require('gulp');
const gutil = require('gulp-util');
const filter = require('gulp-filter');
const forEach = require('gulp-foreach');
const frontMatter = require('gulp-front-matter');
const markdown = require('gulp-markdown');
const marked = require('marked');
const merge = require('merge-stream');
const moment = require('moment');
const sort = require('gulp-sort');
const through = require('through2');
const wrap = require('gulp-wrap-layout');

gulp.task('build', function(){
  return gulp.src('article/*')
  .pipe(forEach(function(stream, file){
    const name = file.relative;
    console.log(name);
    const article = buildArticle(name);
    const images = gulp.src('article/'+name+'/@(thumbnail|fullsize)/*', {base: 'article'});
    const img = gulp.src('article/'+name+'/img.png', {base: 'article'});
    
    return merge(article, images, img);
  }))
  .pipe(gulp.dest('output'))
  .pipe(filter('**/index.html'))
  .pipe(sort((a, b) => a.frontMatter.date < b.frontMatter.date ? 1 : -1))
  .pipe(wrap({src: 'linkBlock.ejs'}, {
    date: (date, format) => moment(date).format(format)
  }))
  .pipe(concat('index.html'))
  .pipe(wrap({src: 'wrapper.ejs'}))
  .pipe(gulp.dest('output'));
});


gulp.task('css', function(){
  return gulp.src('style/*')
  .pipe(gulp.dest('output/style'));
});



function buildArticle(name){
  return gulp.src('article/'+name+'/index.md', {base: 'article'})
  .pipe(setSlug(name))
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
  .pipe(wrap({src: 'wrapper.ejs'}));
}

const setSlug = name => through.obj({objectMode: true}, function(file, _, done){
  file.slug = name;
  this.push(file);
  done();
});


function createRenderer(){
  const renderer = new marked.Renderer();

  renderer.image = function (href, title, text) {
    return '<a class="imageLink" href="fullsize/'+href+'"><img src="thumbnail/'+href+'" /></a>';
  };
  
  return renderer;
}
