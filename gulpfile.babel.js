let path = require('path');

let _ = require('lodash');
let async = require('async');
let del = require('del');
let gulp = require('gulp');
let jsonlint = require('gulp-json-lint');
let theo = require('theo');

gulp.task('clean', () =>
  del(['dist', 'dist-npm', '*.tgz'])
);

gulp.task('lint', () =>
  gulp.src('./tokens/*.json')
    .pipe(jsonlint({ comments: true }))
    .pipe(jsonlint.report('verbose'))
);

gulp.task('tokens', ['clean', 'lint'], (done) => {
  let options = _({
    'web': [
      'styl',
      'less',
      'sass',
      'default.sass',
      'scss',
      'default.scss',
      'map.scss',
      'map.variables.scss',
      'html',
      'json',
      'common.js',
      'amd.js',
      'aura.theme',
      'aura.tokens'
    ],
    'ios': ['ios.json'],
    'android': ['android.xml']
  }).map((formats, transform) =>
    formats.map((format) => ({
      format: format,
      transform: transform
    }))
  ).flatten().value();
  let convert = (options, done) => {
    gulp.src([
      './tokens/*.json', '!./tokens/_*.json'
    ])
    .pipe(theo.plugins.transform(options.transform))
    .on('error', done)
    .pipe(theo.plugins.format(options.format))
    .on('error', done)
    .pipe(gulp.dest(path.resolve(__dirname, 'dist')))
    .on('error', done)
    .on('finish', done);
  }
  async.each(options, convert, done);
});

gulp.task('release', ['tokens'], (done) => {
  let { version } = require('./package.json');
  let exec = ([command, dir = '.'], callback) => {
    require('child_process').exec(command, {
      cwd: path.resolve(__dirname, dir),
      stdio: [0, 1, 2]
    }, callback);
  };
  async.eachSeries([
    ['npm pack'],
    ['mkdir dist-npm'],
    [`tar zxvf salesforce-ux-design-tokens-${version}.tgz -C dist-npm`],
    ['git init', 'dist-npm/package'],
    ['cp .git/config dist-npm/package/.git'],
    ['git add -A', 'dist-npm/package'],
    [`git commit -m "Release ${version}"`, 'dist-npm/package'],
    [`git tag v${version}`, 'dist-npm/package'],
    [`git push origin --tags v${version}`, 'dist-npm/package']
  ], exec, (err) => {
    if (err) throw err;
    done();
  });
});

////////////////////////////////////////////////////////////////////
// Tasks
////////////////////////////////////////////////////////////////////

gulp.task('dev', function() {
  gulp.watch('./tokens/**', ['tokens']);
});

gulp.task('default', ['tokens']);
