// Copyright (C) 1998-2000 Greg J. Badros
// Use of this source code is governed by the LGPL, which can be found in the
// COPYING.LGPL file.
//
// Parts Copyright (C) 2011-2012, Alex Russell (slightlyoff@chromium.org)

(function(scope){
"use strict";

// For Safari 5.x. Go-go-gadget ridiculously long release cycle!
try {
  (function(){}).bind(scope);
} catch (e) {
  Object.defineProperty(Function.prototype, "bind", {
    value: function(scope) {
      var f = this;
      return function() { return f.apply(scope, arguments); }
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

var inBrowser = (typeof scope["HTMLBodyElement"] == "function");
var getTagname = function(ctor) {
  // FIXME(slightlyoff): need a lookup table!
  return "div";
};
var epsilon = 1.0e-8;

// Global
scope.c = {
  //
  // Configuration
  //
  debug: false,
  trace: false,
  verbose: false,
  traceAdded: false,
  GC: false,

  //
  // Constants
  //
  GEQ: 1,
  LEQ: 2,

  //
  // Utility methods
  //
  inherit: function(props) {
    var ctor = null;
    var parent = null

    if (props["extends"]) {
      parent = props["extends"];
      delete props["extends"];
    }

    if (props["initialize"]) {
      ctor = props["initialize"];
      delete props["initialize"];
    }

    var realCtor = ctor || function() { };

    /* 
    // NOTE: would happily do this except it's 2x slower. Boo!
    props.__proto__ = parent ? parent.prototype : Object.prototype;
    realCtor.prototype = props;
    */

    var rp = realCtor.prototype = Object.create(
      ((parent) ? parent.prototype : Object.prototype)
    );

    this.extend(rp, props);

    // If we're in a browser, we want to support "subclassing" HTML elements.
    // This needs some magic and we rely on a wrapped constructor hack to make
    // it happen.
    if (inBrowser) {
      if (parent && parent.prototype instanceof scope.HTMLElement) {
        // console.log("Creating HTMLElement subclass");
        var intermediateCtor = realCtor;
        var tn = getTagname(parent);
        var upgrade = function(el) {
          el.__proto__ = rp;
          intermediateCtor.apply(el, arguments);
          if (rp["created"]) { el.created(); }
          if (rp["decorate"]) { el.decorate(); }
          // We hack the constructor to always return an element with it's
          // prototype wired to ours. Boo.
          return el;
        };
        this.extend(rp, {
          upgrade: upgrade,
        });

        realCtor = function() {
          return this.upgrade(
            scope.document.createElement(tn)
          );
        }
        realCtor.prototype = rp;
        this.extend(realCtor, { ctor: intermediateCtor, }); // HACK!!!
      }
    }

    return realCtor;
  },

  extend: function(obj, props) {
    this.own(props, function(x) {
      var pd = Object.getOwnPropertyDescriptor(props, x);
      if ( (typeof pd["get"] == "function") ||
           (typeof pd["set"] == "function") ) {
        Object.defineProperty(obj, x, pd);
      } else if (typeof pd["value"] == "function" ||x.charAt(0) === "_") {
        pd.writable = true;
        pd.configurable = true;
        pd.enumerable = false;
        Object.defineProperty(obj, x, pd);
      } else {
        obj[x] = props[x];
      }
    });
    return obj;
  },

  own: function(obj, cb, context) {
    Object.getOwnPropertyNames(obj).forEach(cb, context||scope);
    return obj;
  },

  debugprint: function(s /*String*/) {
    if (c.verbose) console.log(s);
  },

  traceprint: function(s /*String*/) {
    if (c.verbose) console.log(s);
  },

  fnenterprint: function(s /*String*/) { console.log("* " + s); },

  fnexitprint: function(s /*String*/) { console.log("- " + s); },

  Assert: function(f /*boolean*/, description /*String*/) {
    if (!f) {
      throw new c.InternalError("Assertion failed: " + description);
    }
  },

  Plus: function(e1, e2) {
    if (!(e1 instanceof c.LinearExpression)) {
      e1 = new c.LinearExpression(e1);
    }
    if (!(e2 instanceof c.LinearExpression)) {
      e2 = new c.LinearExpression(e2);
    }
    return e1.plus(e2);
  },
  
  Minus: function(e1, e2) {
    if (!(e1 instanceof c.LinearExpression)) {
      e1 = new c.LinearExpression(e1);
    }
    if (!(e2 instanceof c.LinearExpression)) {
      e2 = new c.LinearExpression(e2);
    }

    return e1.minus(e2);
  },

  Times: function(e1, e2) {
    if (typeof e1 == "number" || e1 instanceof c.Variable) {
      e1 = new c.LinearExpression(e1);
    }
    if (typeof e2 == "number" || e2 instanceof c.Variable) {
      e2 = new c.LinearExpression(e2);
    }

    return e1.times(e2);
  },

  Divide: function(e1 /*c.LinearExpression*/, e2 /*c.LinearExpression*/) {
    return e1.divide(e2);
  },

  approx: function(a /*double*/, b /*double*/) {
    if (a instanceof c.Variable) { a = a.value(); }
    if (b instanceof c.Variable) { b = b.value(); }
    if (a == 0.0) {
      return (Math.abs(b) < epsilon);
    }
    if (b == 0.0) {
      return (Math.abs(a) < epsilon);
    }
    return (Math.abs(a - b) < Math.abs(a) * epsilon);
  },

  hashToString: function(h) {
    // FIXME: why isn't this implemented as a toString on c.HashTable?
    var answer = "";
    c.Assert(h instanceof c.HashTable);
    h.each( function(k,v) {
      answer += k + " => ";
      if (v instanceof c.HashTable) {
        answer += c.hashToString(v);
      } else if (v instanceof c.HashSet) {
        answer += c.setToString(v);
      } else {
        answer += v + "\n";
      }
    });
    return answer;
  },

  setToString: function(s) {
    // FIXME: why isn't this implemented as a toString on c.HashSet?
    if (!s) return;
    c.Assert(s instanceof c.HashSet);
    var answer = s.size() + " {";
    var first = true;
    s.each(function(e) {
      if (!first) {
        answer += ", ";
      } else {
        first = false;
      }
      answer += e;
    });
    answer += "}\n";
    return answer;
  }       
};

})(this);
