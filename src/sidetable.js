/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

// SideTable is a weak map where possible. If WeakMap is not available the
// association is stored as an expando property.
var SideTable, InheritingSideTable;

(function() {
  var defineProperty = Object.defineProperty;
  var counter = Date.now() % 1e9;

  function getName() {
    return '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
  }

  // TODO(arv): WeakMap does not allow for Node etc to be keys in Firefox
  if (typeof WeakMap !== 'undefined' && navigator.userAgent.indexOf('Firefox/') < 0) {
    SideTable = WeakMap;
  } else {



    SideTable = function() {
      this.name = getName();
    };

    SideTable.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key)
          entry[1] = value;
        else
          defineProperty(key, this.name, {value: [key, value], writable: true});
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ?
            entry[1] : undefined;
      },
      delete: function(key) {
        this.set(key, undefined);
      }
    };
  }

  InheritingSideTable = function() {
    this.name = getName();
  };

  InheritingSideTable.prototype = {
    set: function(key, value) {
      key[this.name] = value;
    },
    get: function(key) {
      return key[this.name];
    },
    delete: function(key) {
      this.set(key, undefined);
    }
  };

})();