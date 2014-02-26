/**
 * Copyright 2014 The Polymer Authors. All right s reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(scope) {
  'use strict';

  var DocumentFragment = scope.wrappers.DocumentFragment;
  var elementFromPoint = scope.elementFromPoint;
  var getExtData = scope.getExtData;
  var getExtDataRaw = scope.getExtDataRaw;
  var getInnerHTML = scope.getInnerHTML;
  var mixin = scope.mixin;
  var rewrap = scope.rewrap;
  var setInnerHTML = scope.setInnerHTML;
  var unwrap = scope.unwrap;

  var spaceCharRe = /[ \t\n\r\f]/;

  function ShadowRoot(hostWrapper) {
    var node = unwrap(hostWrapper.impl.ownerDocument.createDocumentFragment());
    DocumentFragment.call(this, node);

    // createDocumentFragment associates the node with a wrapper
    // DocumentFragment instance. Override that.
    rewrap(node, this);

    var olderShadowRoot = hostWrapper.shadowRoot;
    var extData = getExtDataRaw(node);
    extData.host = hostWrapper;
    extData.olderShadowRoot = olderShadowRoot;
  }

  ShadowRoot.prototype = Object.create(DocumentFragment.prototype);

  mixin(ShadowRoot.prototype, {
    get innerHTML() {
      return getInnerHTML(this);
    },
    set innerHTML(value) {
      setInnerHTML(this, value);
      this.invalidateShadowRenderer();
    },

    get olderShadowRoot() {
      return getExtData(this).olderShadowRoot;
    },

    get host() {
      return getExtData(this).host;
    },

    invalidateShadowRenderer: function() {
      return getExtData(this).host.invalidateShadowRenderer();
    },

    elementFromPoint: function(x, y) {
      return elementFromPoint(this, this.ownerDocument, x, y);
    },

    getElementById: function(id) {
      if (spaceCharRe.test(id))
        return null;
      return this.querySelector('[id="' + id + '"]');
    }
  });

  scope.wrappers.ShadowRoot = ShadowRoot;

})(window.ShadowDOMPolyfill);
