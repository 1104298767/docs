/**
 * This file is used to build Handsontable Pro documentation.
 *
 * Installation:
 * 1. Install Grunt CLI (`npm install -g grunt-cli`)
 * 1. Install Grunt 0.4.0 and other dependencies (`npm install`)
 *
 * Build:
 * Execute `grunt` from root directory of this directory (where Gruntfile.js is)
 *
 * Result:
 * Building Handsontable docs will create files:
 *  - generated/*
 *
 * See http://gruntjs.com/getting-started for more information about Grunt
 */

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var gitHelper = require('./git-helper');
var path = require('path');


module.exports = function (grunt) {
  var
    DOCS_PATH = 'generated',
    HOT_SRC_PATH = 'src/handsontable',
    HOT_DEFAULT_BRANCH = 'master',
    HOT_REPO = 'https://github.com/handsontable/handsontable.git',
    querystring = require('querystring');


  function getHotBranch() {
    var hotVersion = argv['hot-version'];

    return hotVersion ? (hotVersion === 'latest' ? HOT_DEFAULT_BRANCH : hotVersion) : gitHelper.getLocalInfo().branch;
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: {
      dist: [DOCS_PATH],
      source: [HOT_SRC_PATH]
    },

    jsdoc: {
      docs: {
        src: [
          HOT_SRC_PATH + '/src/**/*.js',
          'tutorials/INDEX.md',
          '!' + HOT_SRC_PATH + '/src/**/*.spec.js',
          '!' + HOT_SRC_PATH + '/src/3rdparty/walkontable/src/**/*.js',
          '!' + HOT_SRC_PATH + '/src/3rdparty/walkontable/test/**/*.js',
          '!' + HOT_SRC_PATH + '/src/intro.js',
          '!' + HOT_SRC_PATH + '/src/outro.js',
          // temp fix for file using arrow function - waiting for jsdoc support
          '!' + HOT_SRC_PATH + '/src/plugins/contextMenuCopyPaste/contextMenuCopyPaste.js',
          '!' + HOT_SRC_PATH + '/src/plugins/columnSorting/columnSorting.js',
          '!' + HOT_SRC_PATH + '/src/plugins/multipleSelectionHandles/multipleSelectionHandles.js',
          '!' + HOT_SRC_PATH + '/src/plugins/touchScroll/touchScroll.js',
          '!' + HOT_SRC_PATH + '/src/renderers/checkboxRenderer.js',
          '!' + HOT_SRC_PATH + '/src/editors/dateEditor.js',
          '!' + HOT_SRC_PATH + '/src/eventManager.js'
        ],
        jsdoc: 'node_modules/.bin/' + (/^win/.test(process.platform) ? 'jsdoc.cmd' : 'jsdoc'),
        options: {
          verbose: true,
          destination: DOCS_PATH,
          configure: 'conf.json',
          template: './',
          tutorials: 'tutorials',
          'private': false,
          query: ''
        }
      }
    },

    less: {
      dist: {
        src: 'less/hot/**/docs.less',
        dest: 'static/styles/docs.css'
      }
    },

    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          dest: 'generated',
          src: [
            'static/**'
          ]
        }]
      }
    },

    bowercopy: {
      options: {
        srcPrefix: 'bower_components'
      },
      scripts: {
        options: {
          destPrefix: 'generated/bower_components'
        },
        files: {
          'jquery/jquery.min.js': 'jquery/dist/jquery.min.js',
          'fastclick': 'fastclick',
          'jquery.cookie': 'jquery.cookie',
          'jquery-placeholder': 'jquery-placeholder',
          'modernizr': 'modernizr',
          'handsontable': 'handsontable',
          'zeroclipboard': 'zeroclipboard',
          'pikaday': 'pikaday',
          "moment": "moment",
          "backbone": "backbone",
          "backbone.relational": "backbone.relational",
          "highlightjs": "highlightjs",
          "chroma-js": "chroma-js",
          "raphael": "raphael",
          "bootstrap": "bootstrap",
          "numeraljs": "numeraljs",
          "font-awesome": "font-awesome",
          "lodash": "lodash"
        }
      }
    },

    watch: {
      files: ['tutorials/**', 'less/**', 'static/**', 'tmpl/**'],
      tasks: [],
      options: {
        debounceDelay: 250
      },
      dist: {
        files: ['generated/**'],
        options: {
          livereload: true
        }
      }
    },

    connect: {
      dist: {
        options: {
          port: 5455,
          hostname: '0.0.0.0',
          base: 'generated',
          livereload: true
        }
      }
    },

    open: {
      dist: {
        path: 'http://localhost:5455'
      }
    },

    robotstxt: {
      dist: {
        dest: DOCS_PATH + '/',
        policy: [
          {
            ua: '*',
            allow: '/'
          },
          {
            host: 'docs.handsontable.com'
          }
        ]
      }
    },

    sitemap: {
      dist: {
        pattern: ['generated/*.html', '!generated/tutorial-40*.html'],
        siteRoot: 'generated/'
      }
    },

    gitclone: {
      handsontable: {
        options: {
          branch: HOT_DEFAULT_BRANCH,
          repository: HOT_REPO,
          directory: HOT_SRC_PATH,
          verbose: true
        }
      }
    }
  });

  grunt.registerTask('server', [
    'connect',
    'open',
    'watch'
  ]);


  grunt.registerTask('default', 'Create documentation for Handsontable', function () {
    var timer;

    grunt.task.run('update-hot');

    timer = setInterval(function() {
      if (!grunt.file.isFile(HOT_SRC_PATH + '/package.json')) {
        return;
      }
      clearInterval(timer);
      grunt.task.run('generate-doc-versions');
      grunt.task.run('build');
    }, 50);
  });

  grunt.registerTask('update-hot', 'Update Handsontable repository', function () {
    grunt.config.set('gitclone.handsontable.options.branch', getHotBranch());
    grunt.log.write('Cloning Handsontable v' + getHotBranch());

    grunt.task.run('clean:source');
    grunt.task.run('gitclone');
  });

  grunt.registerTask('generate-doc-versions', 'Generate documentation for Handsontable', function () {
    var done = this.async();

    gitHelper.getDocsVersions().then(function(branches) {
      var content = 'docVersions && docVersions(' + JSON.stringify(branches.reverse()) + ')';

      grunt.log.write('The following versions found: ' + branches.join(', '));
      fs.writeFile(path.join(DOCS_PATH, 'scripts', 'doc-versions.js'), content, done);
    });
  });

  grunt.registerTask('build', 'Generate documentation for Handsontable', function () {
    var done = this.async();
    var hotPackage;

    gitHelper.getHotLatestRelease().then(function(info) {
      grunt.task.run('less', 'copy', 'bowercopy', 'robotstxt');

      hotPackage = grunt.file.readJSON(HOT_SRC_PATH + '/package.json');
      grunt.config.set('jsdoc.docs.options.query', querystring.stringify({
        version: hotPackage.version,
        latestVersion: info.tag_name
      }));

      grunt.task.run('jsdoc');
      grunt.task.run('sitemap');
      done();
    });
  });

  grunt.loadNpmTasks('grunt-bowercopy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-git');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-robots-txt');
  grunt.loadNpmTasks('grunt-sitemap');
};
