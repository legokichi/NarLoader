// Generated by CoffeeScript 1.10.0

/* (C) 2014 Narazaka : Licensed under The MIT License - http://narazaka.net/license/MIT?2014 */

(function() {
  var Encoding, JSZip, NanikaDirectory, NanikaFile, NarDescript, NarLoader, Promise;

  if ((typeof require !== "undefined" && require !== null) && (typeof module !== "undefined" && module !== null)) {
    JSZip = require('jszip');
    Encoding = require('encoding-japanese');
    if (typeof Promise === "undefined" || Promise === null) {
      Promise = require('bluebird');
    }
  } else {
    JSZip = this.JSZip;
    Encoding = this.Encoding;
    if (Promise == null) {
      Promise = this.Promise;
    }
  }

  NarLoader = (function() {
    function NarLoader() {}

    NarLoader.loadFromBuffer = function(buffer) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return resolve(new NanikaDirectory(NarLoader.unzip(buffer), {
            has_install: true
          }));
        };
      })(this));
    };

    NarLoader.loadFromURL = function(src) {
      return NarLoader.wget(src, "arraybuffer").then(this.loadFromBuffer);
    };

    NarLoader.loadFromBlob = function(blob) {
      return new Promise(function(resolve, reject) {
        var reader;
        reader = new FileReader();
        reader.onload = function() {
          return resolve(reader.result);
        };
        reader.onerror = function(event) {
          return reject(event.target.error);
        };
        return reader.readAsArrayBuffer(blob);
      }).then(this.loadFromBuffer);
    };

    NarLoader.unzip = function(buffer) {
      var dir, filePath, path, zip;
      zip = new JSZip();
      zip.load(buffer, {
        checkCRC32: true
      });
      dir = {};
      for (filePath in zip.files) {
        path = filePath.split("\\").join("/");
        dir[path] = new NanikaFile(zip.files[filePath]);
      }
      return dir;
    };

    NarLoader.wget = function(url, type) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var fs, xhr;
          if (typeof require !== "undefined" && require !== null) {
            fs = require('fs');
            return fs.readFile(url, function(error, buffer) {
              var abuffer, i, view;
              if (error) {
                return reject(error);
              } else {
                abuffer = new ArrayBuffer(buffer.length);
                view = new Uint8Array(abuffer);
                i = 0;
                while (i < buffer.length) {
                  view[i] = buffer.readUInt8(i);
                  i++;
                }
                return resolve(abuffer);
              }
            });
          } else {
            xhr = new XMLHttpRequest();
            xhr.addEventListener("load", function() {
              var ref;
              if ((200 <= (ref = xhr.status) && ref < 300)) {
                return resolve(xhr.response);
              } else {
                return reject(xhr.statusText);
              }
            });
            xhr.addEventListener("error", function(err) {
              console.error(err, err.stack, xhr);
              return reject(xhr.statusText);
            });
            xhr.open("GET", url);
            xhr.responseType = type;
            return xhr.send();
          }
        };
      })(this));
    };

    return NarLoader;

  })();

  NanikaFile = (function() {
    function NanikaFile(_buffer) {
      var ref;
      this._buffer = _buffer;
      if (this._buffer.dir || ((ref = this._buffer.options) != null ? ref.dir : void 0)) {
        this._isdir = true;
      }
    }

    NanikaFile.prototype.buffer = function() {
      if (this._buffer.asArrayBuffer != null) {
        return this._buffer = this._buffer.asArrayBuffer();
      } else {
        return this._buffer;
      }
    };

    NanikaFile.prototype.toString = function() {
      return Encoding.codeToString(Encoding.convert(new Uint8Array(this.buffer()), 'UNICODE', 'AUTO'));
    };

    NanikaFile.prototype.valueOf = function() {
      return this.buffer();
    };

    NanikaFile.prototype.isFile = function() {
      return !this._isdir;
    };

    NanikaFile.prototype.isDirectory = function() {
      return this._isdir;
    };

    return NanikaFile;

  })();

  NanikaDirectory = (function() {
    function NanikaDirectory(files, options) {
      var file, path;
      if (files == null) {
        files = {};
      }
      this.files = {};
      for (path in files) {
        file = files[path];
        if (file instanceof NanikaFile) {
          this.files[path] = file;
        } else {
          this.files[path] = new NanikaFile(file);
        }
      }
      this.parse(options);
    }

    NanikaDirectory.prototype.parse = function(arg) {
      var _files, do_throw_descript, has_descript, has_install, nowarp, ref, wraped;
      ref = arg != null ? arg : {}, has_install = ref.has_install, has_descript = ref.has_descript, do_throw_descript = ref.do_throw_descript;
      nowarp = Object.keys(this.files).filter(function(filePath) {
        return /^install\.txt/.exec(filePath);
      });
      wraped = Object.keys(this.files).filter(function(filePath) {
        return /^[^\/]+\/install\.txt/.exec(filePath);
      });
      if (nowarp.length === 0 && wraped.length === 1) {
        _files = {};
        Object.keys(this.files).forEach((function(_this) {
          return function(filePath) {
            return _files[filePath.split("/").slice(1).join("/")] = _this.files[filePath];
          };
        })(this));
        this.files = _files;
      }
      if (this.files["install.txt"] != null) {
        this.install = NarDescript.parse(this.files["install.txt"].toString(), do_throw_descript);
      } else if (has_install) {
        throw "install.txt not found";
      }
      if (this.files["descript.txt"] != null) {
        return this.descript = NarDescript.parse(this.files["descript.txt"].toString(), do_throw_descript);
      } else if (has_descript) {
        throw "descript.txt not found";
      }
    };

    NanikaDirectory.prototype.asArrayBuffer = function() {
      var directory, file, path, ref;
      directory = {};
      ref = this.files;
      for (path in ref) {
        file = ref[path];
        directory[path] = this.files[path].buffer();
      }
      return directory;
    };

    NanikaDirectory.prototype.listChildren = function() {
      var children, path, result;
      children = {};
      for (path in this.files) {
        if (result = path.match(/^([^\/]+)/)) {
          children[result[1]] = true;
        }
      }
      return Object.keys(children);
    };

    NanikaDirectory.prototype.addDirectory = function(dir, options) {
      var directory, file, files, path, ref;
      directory = {};
      ref = this.files;
      for (path in ref) {
        file = ref[path];
        directory[path] = file;
      }
      if (dir instanceof NanikaDirectory) {
        files = dir.files;
      } else {
        files = dir;
      }
      for (path in files) {
        file = files[path];
        directory[path] = file;
      }
      return new NanikaDirectory(directory, options);
    };

    NanikaDirectory.prototype.getDirectory = function(dirpath, options) {
      var directory, dirpathre;
      dirpathre = this.pathToRegExp(dirpath);
      directory = {};
      Object.keys(this.files).filter(function(path) {
        return dirpathre.test(path);
      }).forEach((function(_this) {
        return function(path) {
          return directory[path.replace(dirpathre, "")] = _this.files[path];
        };
      })(this));
      return new NanikaDirectory(directory, options);
    };

    NanikaDirectory.prototype.wrapDirectory = function(dirpath, options) {
      var directory, dirpathcanon;
      dirpathcanon = this.path.canonical(dirpath);
      directory = {};
      Object.keys(this.files).forEach((function(_this) {
        return function(path) {
          return directory[dirpathcanon + '/' + path] = _this.files[path];
        };
      })(this));
      return new NanikaDirectory(directory, options);
    };

    NanikaDirectory.prototype.getElements = function(elempaths, options) {
      var directory, elempath, elempathre, j, len;
      if (!(elempaths instanceof Array)) {
        elempaths = [elempaths];
      }
      directory = {};
      for (j = 0, len = elempaths.length; j < len; j++) {
        elempath = elempaths[j];
        elempathre = this.pathToRegExp(elempath);
        Object.keys(this.files).filter(function(path) {
          return elempathre.test(path);
        }).forEach((function(_this) {
          return function(path) {
            return directory[path] = _this.files[path];
          };
        })(this));
      }
      return new NanikaDirectory(directory, options);
    };

    NanikaDirectory.prototype.removeElements = function(elempaths, options) {
      var directory, elempath, elempathre, file, j, len, path, ref;
      if (!(elempaths instanceof Array)) {
        elempaths = [elempaths];
      }
      directory = {};
      ref = this.files;
      for (path in ref) {
        file = ref[path];
        directory[path] = file;
      }
      for (j = 0, len = elempaths.length; j < len; j++) {
        elempath = elempaths[j];
        elempathre = this.pathToRegExp(elempath);
        Object.keys(directory).filter(function(path) {
          return elempathre.test(path);
        }).forEach(function(path) {
          return delete directory[path];
        });
      }
      return new NanikaDirectory(directory, options);
    };

    NanikaDirectory.prototype.hasElement = function(elempath) {
      var elempathre, path;
      elempathre = this.pathToRegExp(elempath);
      for (path in this.files) {
        if (elempathre.test(path)) {
          return true;
        }
      }
      return false;
    };

    NanikaDirectory.prototype.pathToRegExp = function(path) {
      return new RegExp('^' + this.path.canonical(path).replace(/(\W)/g, '\\$1') + '(?:$|/)');
    };

    NanikaDirectory.prototype.path = {
      canonical: function(path) {
        return path.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/?$/, '');
      }
    };

    return NanikaDirectory;

  })();

  NarDescript = (function() {
    function NarDescript() {}

    NarDescript.parse = function(descript_str, do_throw) {
      var descript, descript_line, descript_lines, errors, j, len, result;
      descript_lines = descript_str.replace(/(?:\r\n|\r|\n)/g, "\n").replace(/^\s*\/\/.*$/mg, "").split(/\n/);
      errors = [];
      descript = {};
      for (j = 0, len = descript_lines.length; j < len; j++) {
        descript_line = descript_lines[j];
        if (descript_line.length === 0) {
          continue;
        }
        result = descript_line.match(/^\s*([^,]+?)\s*,\s*(.*?)\s*$/);
        if (!result) {
          errors.push("wrong descript definition : " + descript_line);
          continue;
        }
        descript[result[1]] = result[2];
      }
      if (do_throw) {
        throw new Error(errors.join('\n'));
      }
      descript._errors = errors;
      return descript;
    };

    return NarDescript;

  })();

  if ((typeof module !== "undefined" && module !== null ? module.exports : void 0) != null) {
    module.exports = {
      NarLoader: NarLoader,
      NanikaFile: NanikaFile,
      NanikaDirectory: NanikaDirectory,
      NarDescript: NarDescript
    };
  } else {
    this.NarLoader = NarLoader;
    this.NanikaFile = NanikaFile;
    this.NanikaDirectory = NanikaDirectory;
    this.NarDescript = NarDescript;
  }

}).call(this);
