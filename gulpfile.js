var gulp = require('gulp');
var ts = require('gulp-typescript');
var webpack = require('webpack-stream');
var bower = require('gulp-bower');
var merge = require('merge2');
var watch = require('gulp-watch');
var rev = require('gulp-rev');
var revReplace = require("gulp-rev-replace");
var clean = require('gulp-clean');
var sourcemaps = require('gulp-sourcemaps');

var jsInfraPath = '../infra-front';

function compileTs(){
    var tsProject = ts.createProject('./src/main/resources/public/ts/tsconfig.json');
    var tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));
        
    return tsResult.js
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./src/main/resources/public/temp'));
}

function startWebpack(isLocal) {
    var app = gulp.src('./src/main/resources/public')
        .pipe(webpack(require('./webpack.config.js')))
        .pipe(gulp.dest('./src/main/resources/public/dist'))
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./src/main/resources/public/dist'))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./'));
        
    var entcore = gulp.src('./src/main/resources/public')
        .pipe(webpack(require('./webpack-entcore.config.js')))
        .pipe(gulp.dest('./src/main/resources/public/dist/entcore'))
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./src/main/resources/public/dist/entcore'))
        .pipe(rev.manifest({ merge: true }))
        .pipe(gulp.dest('./'));;
        
    return merge([entcore, app]);
}

function updateRefs() {
    return gulp.src("./src/main/resources/view-src/*.html")
        .pipe(revReplace({manifest: gulp.src("./rev-manifest.json") }))
        .pipe(gulp.dest("./src/main/resources/view"));
}

gulp.task('copy-local-libs', function(){
    var ts = gulp.src(jsInfraPath + '/src/ts/**/*.ts')
        .pipe(gulp.dest('./src/main/resources/public/ts/entcore'));

    var module = gulp.src(jsInfraPath + '/src/ts/**/*.ts')
        .pipe(gulp.dest('./node_modules/entcore'));

    var html = gulp.src(jsInfraPath + '/src/template/**/*.html')
        .pipe(gulp.dest('./src/main/resources/public/template/entcore'));
    return merge([html, ts, module]);
});

gulp.task('drop-cache', function(){
     return gulp.src(['./bower_components', './src/main/resources/public/dist'], { read: false })
		.pipe(clean());
});

gulp.task('bower', ['drop-cache'], function(){
    return bower({ directory: './bower_components', cwd: '.', force: true });
});

gulp.task('update-libs', ['bower'], function(){
    var html = gulp.src('./bower_components/entcore/template/**/*.html')
         .pipe(gulp.dest('./src/main/resources/public/template/entcore'));
        
    var ts = gulp.src('./bower_components/entcore/src/ts/**/*.ts' )
         .pipe(gulp.dest('./src/main/resources/public/ts/entcore'));

    var module = gulp.src('./bower_components/entcore/src/ts/**/*.ts')
        .pipe(gulp.dest('./node_modules/entcore'));
        
   return merge([html, ts, module]);
});

gulp.task('ts-local', ['copy-local-libs'], function () { return compileTs() });
gulp.task('webpack-local', ['ts-local'], function(){ return startWebpack() });

gulp.task('ts', ['update-libs'], function () { return compileTs() });
gulp.task('webpack', ['ts'], function(){ return startWebpack() });

gulp.task('drop-temp', ['webpack'], () => {
    return gulp.src([
        './src/main/resources/public/**/*.map.map',
        './src/main/resources/public/temp',
        './src/main/resources/public/dist/entcore/ng-app.js',
        './src/main/resources/public/dist/entcore/ng-app.js.map',
        './src/main/resources/public/dist/application.js',
        './src/main/resources/public/dist/application.js.map'
    ], { read: false })
		.pipe(clean());
})

gulp.task('build', ['drop-temp'], function () {
    var refs = updateRefs();
    var copyBehaviours = gulp.src('./src/main/resources/public/temp/behaviours.js')
        .pipe(gulp.dest('./src/main/resources/public/js'));
    return merge[refs, copyBehaviours];
});

gulp.task('build-local', ['webpack-local'], function () {
    var refs = updateRefs();
    var copyBehaviours = gulp.src('./src/main/resources/public/temp/behaviours.js')
        .pipe(gulp.dest('./src/main/resources/public/js'));
    return merge[refs, copyBehaviours];
});
