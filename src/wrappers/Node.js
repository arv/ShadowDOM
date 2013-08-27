// Copyright 2012 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var EventTarget = scope.wrappers.EventTarget;
  var NodeList = scope.wrappers.NodeList;
  var defineWrapGetter = scope.defineWrapGetter;
  var assert = scope.assert;
  var mixin = scope.mixin;
  var registerWrapper = scope.registerWrapper;
  var unwrap = scope.unwrap;
  var wrap = scope.wrap;
  var wrapIfNeeded = scope.wrapIfNeeded;

  function assertIsNodeWrapper(node) {
    assert(node instanceof Node);
  }

  /**
   * Collects nodes from a DocumentFragment or a Node for removal followed
   * by an insertion.
   *
   * This updates the internal pointers for node, previousNode and nextNode.
   */
  function collectNodes(node, parentNode, previousNode, nextNode) {
    if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      if (node.parentNode)
        node.parentNode.removeChild(node);
      // node.parentNode_ = parentNode;
      setParentNode(node, parentNode);
      // node.previousSibling_ = previousNode;
      setPreviousSibling(node, previousNode);
      // node.nextSibling_ = nextNode;
      setNextSibling(node, nextNode);

      if (previousNode)
        // previousNode.nextSibling_ = node;
        setNextSibling(previousNode, node);
      if (nextNode)
        // nextNode.previousSibling_ = node;
        setPreviousSibling(nextNode, node);
      return [node];
    }

    var nodes = [];
    var firstChild;
    while (firstChild = node.firstChild) {
      node.removeChild(firstChild);
      nodes.push(firstChild);
      // firstChild.parentNode_ = parentNode;
      setParentNode(firstChild, parentNode)
    }

    for (var i = 0; i < nodes.length; i++) {
      // nodes[i].previousSibling_ = nodes[i - 1] || previousNode;
      setPreviousSibling(nodes[i], nodes[i - 1] || previousNode);
      // nodes[i].nextSibling_ = nodes[i + 1] || nextNode;
      setNextSibling(nodes[i], nodes[i + 1] || nextNode);
    }

    if (previousNode)
      // previousNode.nextSibling_ = nodes[0];
      setNextSibling(previousNode, nodes[0]);
    if (nextNode)
      // nextNode.previousSibling_ = nodes[nodes.length - 1];
      setPreviousSibling(nextNode, nodes[nodes.length - 1]);

    return nodes;
  }

  function ensureSameOwnerDocument(parent, child) {
    var ownerDoc = parent.ownerDocument;
    if (ownerDoc !== child.ownerDocument)
      ownerDoc.adoptNode(child);
  }

  function adoptNodesIfNeeded(owner, nodes) {
    if (!nodes.length)
      return;

    var ownerDoc = owner.ownerDocument;

    // All nodes have the same ownerDocument when we get here.
    if (ownerDoc === nodes[0].ownerDocument)
      return;

    for (var i = 0; i < nodes.length; i++) {
      scope.adoptNodeNoRemove(nodes[i], ownerDoc);
    }
  }

  function unwrapNodesForInsertion(owner, nodes) {
    adoptNodesIfNeeded(owner, nodes);
    var length = nodes.length;

    if (length === 1)
      return unwrap(nodes[0]);

    var df = unwrap(owner.ownerDocument.createDocumentFragment());
    for (var i = 0; i < length; i++) {
      df.appendChild(unwrap(nodes[i]));
    }
    return df;
  }

  function removeAllChildNodes(wrapper) {
    if (wrapper.invalidateShadowRenderer()) {
      var childWrapper = wrapper.firstChild;
      while (childWrapper) {
        assert(childWrapper.parentNode === wrapper);
        var nextSibling = childWrapper.nextSibling;
        var childNode = unwrap(childWrapper);
        var parentNode = childNode.parentNode;
        if (parentNode)
          originalRemoveChild.call(parentNode, childNode);
        // childWrapper.previousSibling_ = childWrapper.nextSibling_ =
        //     childWrapper.parentNode_ = null;
        setPreviousSibling(childWrapper, null);
        setNextSibling(childWrapper, null);
        setParentNode(childWrapper, null);
        childWrapper = nextSibling;
      }
      // wrapper.firstChild_ = wrapper.lastChild_ = null;
      setFirstChild(wrapper, null);
      setLastChild(wrapper, null);
    } else {
      var node = unwrap(wrapper);
      var child = node.firstChild;
      var nextSibling;
      while (child) {
        nextSibling = child.nextSibling;
        originalRemoveChild.call(node, child);
        child = nextSibling;
      }
    }
  }

  var nativeRelatives = {
    getParentNode: function(wrapper) {
      return wrap(wrapper.impl.parentNode);
    },
    getFirstChild: function(wrapper) {
      return wrap(wrapper.impl.firstChild);
    },
    getLastChild: function(wrapper) {
      return wrap(wrapper.impl.lastChild);
    },
    getNextSibling: function(wrapper) {
      return wrap(wrapper.impl.nextSibling);
    },
    getPreviousSibling: function(wrapper) {
      return wrap(wrapper.impl.previousSibling);
    },

    setParentNode: function(wrapper, parentNodeWrapper) {
      var relatives = wrapper.relatives_ = new ShadowRelatives();
      relatives.setParentNode(wrapper, parentNodeWrapper);
    },
    setFirstChild: function(wrapper, firstChildWrapper) {
      var relatives = wrapper.relatives_ = new ShadowRelatives();
      relatives.setFirstChild(wrapper, firstChildWrapper);
    },
    setLastChild: function(wrapper, lastChildWrapper) {
      var relatives = wrapper.relatives_ = new ShadowRelatives();
      relatives.setLastChild(wrapper, lastChildWrapper);
    },
    setNextSibling: function(wrapper, nextSiblingWrapper) {
      var relatives = wrapper.relatives_ = new ShadowRelatives();
      relatives.setNextSibling(wrapper, nextSiblingWrapper);
    },
    setPreviousSibling: function(wrapper, previousSiblingWrapper) {
      var relatives = wrapper.relatives_ = new ShadowRelatives();
      relatives.setPreviousSibling(wrapper, previousSiblingWrapper);
    },

    clearParentNode: function(wrapper) {},
    clearFirstChild: function(wrapper) {},
    clearLastChild: function(wrapper) {},
    clearNextSibling: function(wrapper) {},
    clearPreviousSibling: function(wrapper) {},
  };

  function ShadowRelatives() {
    this.parentNode_ = undefined;
    this.firstChild_ = undefined;
    this.lastChild_ = undefined;
    this.nextSibling_ = undefined;
    this.previousSibling_ = undefined;
  }

  ShadowRelatives.prototype = {
    getParentNode: function(wrapper) {
      return this.parentNode_ !== undefined ? this.parentNode_ :
          nativeRelatives.getParentNode(wrapper);
    },
    getFirstChild: function(wrapper) {
      return this.firstChild_ !== undefined ? this.firstChild_ :
          nativeRelatives.getFirstChild(wrapper);
    },
    getLastChild: function(wrapper) {
      return this.lastChild_ !== undefined ? this.lastChild_ :
          nativeRelatives.getLastChild(wrapper);
    },
    getNextSibling: function(wrapper) {
      return this.nextSibling_ !== undefined ? this.nextSibling_ :
          nativeRelatives.getNextSibling(wrapper);
    },
    getPreviousSibling: function(wrapper) {
      return this.previousSibling_ !== undefined ? this.previousSibling_ :
          nativeRelatives.getPreviousSibling(wrapper);
    },

    setParentNode: function(wrapper, parentNodeWrapper) {
      this.parentNode_ = parentNodeWrapper;
    },
    setFirstChild: function(wrapper, firstChildWrapper) {
      this.firstChild_ = firstChildWrapper;
    },
    setLastChild: function(wrapper, lastChildWrapper) {
      this.lastChild_ = lastChildWrapper;
    },
    setNextSibling: function(wrapper, nextSiblingWrapper) {
      this.nextSibling_ = nextSiblingWrapper;
    },
    setPreviousSibling: function(wrapper, previousSiblingWrapper) {
      this.previousSibling_ = previousSiblingWrapper;
    },

    // TODO(arv): Clearing all should fall back to nativeRelatives.
    clearParentNode: function(wrapper) {
      this.parentNode_ = undefined;
    },
    clearFirstChild: function(wrapper) {
      this.firstChild_ = undefined;
    },
    clearLastChild: function(wrapper) {
      this.lastChild_ = undefined;
    },
    clearNextSibling: function(wrapper) {
      this.nextSibling_ = undefined;
    },
    clearPreviousSibling: function(wrapper) {
      this.previousSibling_ = undefined;
    },
  };

  function setParentNode(node, parentNode) {
    node.relatives_.setParentNode(node, parentNode);
  }

  function setFirstChild(node, firstChild) {
    node.relatives_.setFirstChild(node, firstChild);
  }

  function setLastChild(node, lastChild) {
    node.relatives_.setLastChild(node, lastChild);
  }

  function setNextSibling(node, nextSibling) {
    node.relatives_.setNextSibling(node, nextSibling);
  }

  function setPreviousSibling(node, previousSibling) {
    node.relatives_.setPreviousSibling(node, previousSibling);
  }


  function clearParentNode(wrapper) {
    wrapper.relatives_.clearParentNode(wrapper);
  }

  function clearFirstChild(wrapper) {
    wrapper.relatives_.clearFirstChild(wrapper);
  }

  function clearLastChild(wrapper) {
    wrapper.relatives_.clearLastChild(wrapper);
  }

  function clearNextSibling(wrapper) {
    wrapper.relatives_.clearNextSibling(wrapper);
  }

  function clearPreviousSibling(wrapper) {
    wrapper.relatives_.clearPreviousSibling(wrapper);
  }


  var OriginalNode = window.Node;

  /**
   * This represents a wrapper of a native DOM node.
   * @param {!Node} original The original DOM node, aka, the visual DOM node.
   * @constructor
   * @extends {EventTarget}
   */
  function Node(original) {
    assert(original instanceof OriginalNode);

    EventTarget.call(this, original);

    this.relatives_ = nativeRelatives;
  };

  var originalAppendChild = OriginalNode.prototype.appendChild;
  var originalInsertBefore = OriginalNode.prototype.insertBefore;
  var originalReplaceChild = OriginalNode.prototype.replaceChild;
  var originalRemoveChild = OriginalNode.prototype.removeChild;
  var originalCompareDocumentPosition =
      OriginalNode.prototype.compareDocumentPosition;

  Node.prototype = Object.create(EventTarget.prototype);
  mixin(Node.prototype, {
    appendChild: function(childWrapper) {
      assertIsNodeWrapper(childWrapper);

      // if (this.invalidateShadowRenderer() ||
      //     childWrapper/invalidateShadowRenderer()) {
      if (this.invalidateShadowRenderer()) {
        var previousNode = this.lastChild;
        var nextNode = null;
        var nodes = collectNodes(childWrapper, this, previousNode, nextNode);

        // this.lastChild_ = nodes[nodes.length - 1];
        setLastChild(this, nodes[nodes.length - 1])
        if (!previousNode)
          // this.firstChild_ = nodes[0];
          setFirstChild(this, nodes[0]);

        originalAppendChild.call(this.impl, unwrapNodesForInsertion(this, nodes));
      } else {
        ensureSameOwnerDocument(this, childWrapper);
        originalAppendChild.call(this.impl, unwrap(childWrapper));
      }

      return childWrapper;
    },

    insertBefore: function(childWrapper, refWrapper) {
      // TODO(arv): Unify with appendChild
      if (!refWrapper)
        return this.appendChild(childWrapper);

      assertIsNodeWrapper(childWrapper);
      assertIsNodeWrapper(refWrapper);
      assert(refWrapper.parentNode === this);

      var childParent = childWrapper.parentNode;
      if (this.invalidateShadowRenderer() ||
          childParent && childParent.invalidateShadowRenderer()) {
        var previousNode = refWrapper.previousSibling;
        var nextNode = refWrapper;
        var nodes = collectNodes(childWrapper, this, previousNode, nextNode);

        if (this.firstChild === refWrapper)
          // this.firstChild_ = nodes[0];
          setFirstChild(this, nodes[0]);

        // insertBefore refWrapper no matter what the parent is?
        var refNode = unwrap(refWrapper);
        var parentNode = refNode.parentNode;

        if (parentNode) {
          originalInsertBefore.call(
              parentNode,
              unwrapNodesForInsertion(this, nodes),
              refNode);
        } else {
          adoptNodesIfNeeded(this, nodes);
        }
      } else {
        ensureSameOwnerDocument(this, childWrapper);
        originalInsertBefore.call(this.impl, unwrap(childWrapper),
                                  unwrap(refWrapper));
      }

      return childWrapper;
    },

    removeChild: function(childWrapper) {
      assertIsNodeWrapper(childWrapper);
      if (childWrapper.parentNode !== this) {
        // TODO(arv): DOMException
        throw new Error('NotFoundError');
      }

      var childNode = unwrap(childWrapper);
      if (this.invalidateShadowRenderer()) {

        // We need to remove the real node from the DOM before updating the
        // pointers. This is so that that mutation event is dispatched before
        // the pointers have changed.
        var thisFirstChild = this.firstChild;
        var thisLastChild = this.lastChild;
        var childWrapperNextSibling = childWrapper.nextSibling;
        var childWrapperPreviousSibling = childWrapper.previousSibling;

        var parentNode = childNode.parentNode;
        if (parentNode)
          originalRemoveChild.call(parentNode, childNode);

        if (thisFirstChild === childWrapper)
          // this.firstChild_ = childWrapperNextSibling;
          setFirstChild(this, childWrapperNextSibling);
        if (thisLastChild === childWrapper)
          // this.lastChild_ = childWrapperPreviousSibling;
          setLastChild(this, childWrapperPreviousSibling);
        if (childWrapperPreviousSibling)
          // childWrapperPreviousSibling.nextSibling_ = childWrapperNextSibling;
          setNextSibling(childWrapperPreviousSibling, childWrapperNextSibling);
        if (childWrapperNextSibling) {
          // childWrapperNextSibling.previousSibling_ =
          //     childWrapperPreviousSibling;
          setPreviousSibling(childWrapperNextSibling,
                             childWrapperPreviousSibling);
        }

        // childWrapper.previousSibling_ = childWrapper.nextSibling_ =
        //     childWrapper.parentNode_ = undefined;
        clearPreviousSibling(childWrapper);
        clearNextSibling(childWrapper);
        clearParentNode(childWrapper);
      } else {
        ensureSameOwnerDocument(this, childWrapper);
        originalRemoveChild.call(this.impl, childNode);
      }

      return childWrapper;
    },

    replaceChild: function(newChildWrapper, oldChildWrapper) {
      assertIsNodeWrapper(newChildWrapper);
      assertIsNodeWrapper(oldChildWrapper);

      if (oldChildWrapper.parentNode !== this) {
        // TODO(arv): DOMException
        throw new Error('NotFoundError');
      }

      var oldChildNode = unwrap(oldChildWrapper);
      var newChildParent = newChildWrapper.parentNode;

      if (this.invalidateShadowRenderer() ||
          newChildParent && newChildParent.invalidateShadowRenderer()) {
        var previousNode = oldChildWrapper.previousSibling;
        var nextNode = oldChildWrapper.nextSibling;
        if (nextNode === newChildWrapper)
          nextNode = newChildWrapper.nextSibling;
        var nodes = collectNodes(newChildWrapper, this,
                                 previousNode, nextNode);

        if (this.firstChild === oldChildWrapper)
          // this.firstChild_ = nodes[0];
          setFirstChild(this, nodes[0]);
        if (this.lastChild === oldChildWrapper)
          // this.lastChild_ = nodes[nodes.length - 1];
          setLastChild(this, nodes[nodes.length - 1]);

        // oldChildWrapper.previousSibling_ = oldChildWrapper.nextSibling_ =
        //     oldChildWrapper.parentNode_ = undefined;
        clearPreviousSibling(oldChildWrapper);
        clearNextSibling(oldChildWrapper);
        clearParentNode(oldChildWrapper);

        // replaceChild no matter what the parent is?
        if (oldChildNode.parentNode) {
          originalReplaceChild.call(
              oldChildNode.parentNode,
              unwrapNodesForInsertion(this, nodes),
              oldChildNode);
        }
      } else {
        ensureSameOwnerDocument(this, newChildWrapper);
        originalReplaceChild.call(this.impl, unwrap(newChildWrapper),
                                  oldChildNode);
      }

      return oldChildWrapper;
    },

    hasChildNodes: function() {
      return this.firstChild === null;
    },

    /** @type {Node} */
    get parentNode() {
      return this.relatives_.getParentNode(this);
    },

    /** @type {Node} */
    get firstChild() {
      return this.relatives_.getFirstChild(this);
    },

    /** @type {Node} */
    get lastChild() {
      return this.relatives_.getLastChild(this);
    },

    /** @type {Node} */
    get nextSibling() {
      return this.relatives_.getNextSibling(this);
    },

    /** @type {Node} */
    get previousSibling() {
      return this.relatives_.getPreviousSibling(this);
    },

    get parentElement() {
      var p = this.parentNode;
      while (p && p.nodeType !== Node.ELEMENT_NODE) {
        p = p.parentNode;
      }
      return p;
    },

    get textContent() {
      // TODO(arv): This should fallback to this.impl.textContent if there
      // are no shadow trees below or above the context node.
      var s = '';
      for (var child = this.firstChild; child; child = child.nextSibling) {
        s += child.textContent;
      }
      return s;
    },
    set textContent(textContent) {
      if (this.invalidateShadowRenderer()) {
        removeAllChildNodes(this);
        if (textContent !== '') {
          var textNode = this.impl.ownerDocument.createTextNode(textContent);
          this.appendChild(textNode);
        }
      } else {
        this.impl.textContent = textContent;
      }
    },

    get childNodes() {
      var wrapperList = new NodeList();
      var i = 0;
      for (var child = this.firstChild; child; child = child.nextSibling) {
        wrapperList[i++] = child;
      }
      wrapperList.length = i;
      return wrapperList;
    },

    cloneNode: function(deep) {
      if (!this.invalidateShadowRenderer())
        return wrap(this.impl.cloneNode(deep));

      var clone = wrap(this.impl.cloneNode(false));
      if (deep) {
        for (var child = this.firstChild; child; child = child.nextSibling) {
          clone.appendChild(child.cloneNode(true));
        }
      }
      // TODO(arv): Some HTML elements also clone other data like value.
      return clone;
    },

    contains: function(child) {
      if (!child)
        return false;

      child = wrapIfNeeded(child);

      // TODO(arv): Optimize using ownerDocument etc.
      if (child === this)
        return true;
      var parentNode = child.parentNode;
      if (!parentNode)
        return false;
      return this.contains(parentNode);
    },

    compareDocumentPosition: function(otherNode) {
      // This only wraps, it therefore only operates on the composed DOM and not
      // the logical DOM.
      return originalCompareDocumentPosition.call(this.impl, unwrap(otherNode));
    }
  });

  defineWrapGetter(Node, 'ownerDocument');

  // We use a DocumentFragment as a base and then delete the properties of
  // DocumentFragment.prototype from the wrapper Node. Since delete makes
  // objects slow in some JS engines we recreate the prototype object.
  registerWrapper(OriginalNode, Node, document.createDocumentFragment());
  delete Node.prototype.querySelector;
  delete Node.prototype.querySelectorAll;
  Node.prototype = mixin(Object.create(EventTarget.prototype), Node.prototype);

  scope.wrappers.Node = Node;

})(this.ShadowDOMPolyfill);
