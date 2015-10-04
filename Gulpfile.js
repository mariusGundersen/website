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

gulp.task('build', ['content', 'talks', 'css', '404'], _ => _);

gulp.task('content', function(){
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
  .pipe(through.obj(function(file, _, done){
    file.frontMatter.type = 'wip';
    this.push(file);
    done();
  }))
  .pipe(wrap({src: 'wrapper.ejs'}))
  .pipe(gulp.dest('output'));
});

gulp.task('talks', function(){
  return gulp.src('talk/*')
  .pipe(forEach(function(stream, file){
    const name = file.relative;
    console.log(name);
    const talk = buildTalk(name);
    const img = gulp.src('talk/'+name+'/img.png', {base: 'talk'});
    
    return merge(talk, img);
  }))
  .pipe(gulp.dest('output'))
  .pipe(filter('**/index.html'))
  .pipe(sort((a, b) => a.frontMatter.date < b.frontMatter.date ? 1 : -1))
  .pipe(wrap({src: 'talkBlock.ejs'}, {
    date: (date, format) => moment(date).format(format)
  }))
  .pipe(concat('index.html'))
  .pipe(through.obj(function(file, _, done){
    file.frontMatter.type = 'talks';
    this.push(file);
    done();
  }))
  .pipe(wrap({src: 'wrapper.ejs'}))
  .pipe(gulp.dest('output/talks'));
});

gulp.task('css', function(){
  return gulp.src('style/*')
  .pipe(gulp.dest('output/style'));
});

gulp.task('404', function(){
  gulp.src('404.md')
  .pipe(markdown())
  .pipe(wrap({src: 'wrapper.ejs'}))
  .pipe(gulp.dest('output'));
});

function buildTalk(name){
  return gulp.src('talk/'+name+'/index.md', {base: 'talk'})
  .pipe(setSlug(name))
  .pipe(frontMatter({
    property: 'frontMatter',
    remove: true
  }))
  .pipe(markdown());
}

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
