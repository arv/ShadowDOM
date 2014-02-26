/**
 * Copyright 2014 The Polymer Authors. All right s reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(scope) {
  'use strict';

  function ExtData() {
    this.content = null;
    this.distributedNodes = null;
    this.eventHandlers = null;
    this.eventParents = null;
    this.host = null;
    this.insertionParent = null;
    this.olderShadowRoot = null;
    this.rendererForHost = null;
    this.templateContentsOwner = null;
  }

  function getExtDataRaw(impl) {
    return impl.polymerExtData_;
  }

  function getExtData(wrapper) {
    return getExtDataRaw(wrapper.impl);
  }

  function createExtData(impl) {
    impl.polymerExtData_ = new ExtData();
  }

  scope.createExtData = createExtData;
  scope.getExtData = getExtData;
  scope.getExtDataRaw = getExtDataRaw;

})(window.ShadowDOMPolyfill);
