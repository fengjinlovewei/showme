import { version, ref, watchEffect, watch, getCurrentInstance, unref, inject, useSSRContext, createApp, effectScope, reactive, mergeProps, hasInjectionContext, defineAsyncComponent, provide, onErrorCaptured, onServerPrefetch, createVNode, resolveDynamicComponent, toRef, computed, defineComponent, h, isReadonly, isRef, isShallow, isReactive, toRaw } from 'vue';
import Et from 'node:http';
import vs from 'node:https';
import st from 'node:zlib';
import me, { PassThrough, pipeline } from 'node:stream';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promisify, deprecate, types } from 'node:util';
import { format } from 'node:url';
import { isIP } from 'node:net';
import { statSync, promises, createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { d as useRuntimeConfig$1, h as createError$1, l as sanitizeStatusCode, m as createHooks } from '../nitro/node-server.mjs';
import { getActiveHead } from 'unhead';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderSuspense, ssrRenderComponent, ssrRenderVNode } from 'vue/server-renderer';
import 'fs';
import 'path';

function createContext$1(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als && currentInstance === void 0) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers$1.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers$1.delete(onLeave);
      }
    }
  };
}
function createNamespace$1(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext$1({ ...defaultOpts, ...opts });
      }
      contexts[key];
      return contexts[key];
    }
  };
}
const _globalThis$1 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey$2 = "__unctx__";
const defaultNamespace = _globalThis$1[globalKey$2] || (_globalThis$1[globalKey$2] = createNamespace$1());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey$1 = "__unctx_async_handlers__";
const asyncHandlers$1 = _globalThis$1[asyncHandlersKey$1] || (_globalThis$1[asyncHandlersKey$1] = /* @__PURE__ */ new Set());

var _a, _b;
const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodeQueryKey(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function parseQuery(parametersString = "") {
  const object = {};
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s2 = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s2.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s2[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s2[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map((_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}
const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex >= 0) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s2] = path.split("?");
  return (s0.slice(0, -1) || "/") + (s2.length > 0 ? `?${s2.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex >= 0) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s2] = path.split("?");
  return s0 + "/" + (s2.length > 0 ? `?${s2.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function isEqual(a2, b, options = {}) {
  if (!options.trailingSlash) {
    a2 = withTrailingSlash(a2);
    b = withTrailingSlash(b);
  }
  if (!options.leadingSlash) {
    a2 = withLeadingSlash(a2);
    b = withLeadingSlash(b);
  }
  if (!options.encoding) {
    a2 = decode(a2);
    b = decode(b);
  }
  return a2 === b;
}
const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return defaultProto ? parseURL(defaultProto + input) : parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  const [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  const { pathname, search, hash } = parsePath(
    path.replace(/\/(?=[A-Za-z]:)/, "")
  );
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}
const appConfig = useRuntimeConfig$1().app;
const baseURL = () => appConfig.baseURL;
var t$1 = Object.defineProperty;
var o$1 = (e, l2) => t$1(e, "name", { value: l2, configurable: true });
var n$1 = typeof globalThis < "u" ? globalThis : typeof global < "u" ? global : typeof self < "u" ? self : {};
function f$1(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
o$1(f$1, "getDefaultExportFromCjs");
var Ps = Object.defineProperty;
var n = (i, o2) => Ps(i, "name", { value: o2, configurable: true });
var ui = (i, o2, a2) => {
  if (!o2.has(i))
    throw TypeError("Cannot " + a2);
};
var O = (i, o2, a2) => (ui(i, o2, "read from private field"), a2 ? a2.call(i) : o2.get(i)), be = (i, o2, a2) => {
  if (o2.has(i))
    throw TypeError("Cannot add the same private member more than once");
  o2 instanceof WeakSet ? o2.add(i) : o2.set(i, a2);
}, X = (i, o2, a2, u) => (ui(i, o2, "write to private field"), u ? u.call(i, a2) : o2.set(i, a2), a2);
var Pe, Wt, bt, Cr, Ve, qt, Ot, zt, ee, It, Ne, He, Ft;
function zs(i) {
  if (!/^data:/i.test(i))
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  i = i.replace(/\r?\n/g, "");
  const o2 = i.indexOf(",");
  if (o2 === -1 || o2 <= 4)
    throw new TypeError("malformed data: URI");
  const a2 = i.substring(5, o2).split(";");
  let u = "", f2 = false;
  const d2 = a2[0] || "text/plain";
  let b = d2;
  for (let D = 1; D < a2.length; D++)
    a2[D] === "base64" ? f2 = true : a2[D] && (b += `;${a2[D]}`, a2[D].indexOf("charset=") === 0 && (u = a2[D].substring(8)));
  !a2[0] && !u.length && (b += ";charset=US-ASCII", u = "US-ASCII");
  const p = f2 ? "base64" : "ascii", E = unescape(i.substring(o2 + 1)), w = Buffer.from(E, p);
  return w.type = d2, w.typeFull = b, w.charset = u, w;
}
n(zs, "dataUriToBuffer");
var pr = { exports: {} };
/**
* @license
* web-streams-polyfill v3.3.2
* Copyright 2024 Mattias Buelens, Diwank Singh Tomer and other contributors.
* This code is released under the MIT license.
* SPDX-License-Identifier: MIT
*/
var fi;
function Is() {
  return fi || (fi = 1, function(i, o2) {
    (function(a2, u) {
      u(o2);
    })(n$1, function(a2) {
      const u = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Symbol : (e) => `Symbol(${e})`;
      function f2() {
      }
      n(f2, "noop");
      function d2(e) {
        return typeof e == "object" && e !== null || typeof e == "function";
      }
      n(d2, "typeIsObject");
      const b = f2;
      function p(e, t2) {
        try {
          Object.defineProperty(e, "name", { value: t2, configurable: true });
        } catch {
        }
      }
      n(p, "setFunctionName");
      const E = Promise, w = Promise.prototype.then, D = Promise.reject.bind(E);
      function A2(e) {
        return new E(e);
      }
      n(A2, "newPromise");
      function S(e) {
        return A2((t2) => t2(e));
      }
      n(S, "promiseResolvedWith");
      function m(e) {
        return D(e);
      }
      n(m, "promiseRejectedWith");
      function R(e, t2, r) {
        return w.call(e, t2, r);
      }
      n(R, "PerformPromiseThen");
      function q(e, t2, r) {
        R(R(e, t2, r), void 0, b);
      }
      n(q, "uponPromise");
      function F(e, t2) {
        q(e, t2);
      }
      n(F, "uponFulfillment");
      function Q(e, t2) {
        q(e, void 0, t2);
      }
      n(Q, "uponRejection");
      function M(e, t2, r) {
        return R(e, t2, r);
      }
      n(M, "transformPromiseWith");
      function ve(e) {
        R(e, void 0, b);
      }
      n(ve, "setPromiseIsHandledToTrue");
      let z = n((e) => {
        if (typeof queueMicrotask == "function")
          z = queueMicrotask;
        else {
          const t2 = S(void 0);
          z = n((r) => R(t2, r), "_queueMicrotask");
        }
        return z(e);
      }, "_queueMicrotask");
      function j(e, t2, r) {
        if (typeof e != "function")
          throw new TypeError("Argument is not a function");
        return Function.prototype.apply.call(e, t2, r);
      }
      n(j, "reflectCall");
      function I(e, t2, r) {
        try {
          return S(j(e, t2, r));
        } catch (s2) {
          return m(s2);
        }
      }
      n(I, "promiseCall");
      const mt = 16384, cn = class cn {
        constructor() {
          this._cursor = 0, this._size = 0, this._front = { _elements: [], _next: void 0 }, this._back = this._front, this._cursor = 0, this._size = 0;
        }
        get length() {
          return this._size;
        }
        push(t2) {
          const r = this._back;
          let s2 = r;
          r._elements.length === mt - 1 && (s2 = { _elements: [], _next: void 0 }), r._elements.push(t2), s2 !== r && (this._back = s2, r._next = s2), ++this._size;
        }
        shift() {
          const t2 = this._front;
          let r = t2;
          const s2 = this._cursor;
          let l2 = s2 + 1;
          const c = t2._elements, h2 = c[s2];
          return l2 === mt && (r = t2._next, l2 = 0), --this._size, this._cursor = l2, t2 !== r && (this._front = r), c[s2] = void 0, h2;
        }
        forEach(t2) {
          let r = this._cursor, s2 = this._front, l2 = s2._elements;
          for (; (r !== l2.length || s2._next !== void 0) && !(r === l2.length && (s2 = s2._next, l2 = s2._elements, r = 0, l2.length === 0)); )
            t2(l2[r]), ++r;
        }
        peek() {
          const t2 = this._front, r = this._cursor;
          return t2._elements[r];
        }
      };
      n(cn, "SimpleQueue");
      let U = cn;
      const xn = u("[[AbortSteps]]"), Nn = u("[[ErrorSteps]]"), Ar = u("[[CancelSteps]]"), Br = u("[[PullSteps]]"), kr = u("[[ReleaseSteps]]");
      function Hn(e, t2) {
        e._ownerReadableStream = t2, t2._reader = e, t2._state === "readable" ? qr(e) : t2._state === "closed" ? Fi(e) : Vn(e, t2._storedError);
      }
      n(Hn, "ReadableStreamReaderGenericInitialize");
      function Wr(e, t2) {
        const r = e._ownerReadableStream;
        return ie(r, t2);
      }
      n(Wr, "ReadableStreamReaderGenericCancel");
      function ge(e) {
        const t2 = e._ownerReadableStream;
        t2._state === "readable" ? Or(e, new TypeError("Reader was released and can no longer be used to monitor the stream's closedness")) : ji(e, new TypeError("Reader was released and can no longer be used to monitor the stream's closedness")), t2._readableStreamController[kr](), t2._reader = void 0, e._ownerReadableStream = void 0;
      }
      n(ge, "ReadableStreamReaderGenericRelease");
      function jt(e) {
        return new TypeError("Cannot " + e + " a stream using a released reader");
      }
      n(jt, "readerLockException");
      function qr(e) {
        e._closedPromise = A2((t2, r) => {
          e._closedPromise_resolve = t2, e._closedPromise_reject = r;
        });
      }
      n(qr, "defaultReaderClosedPromiseInitialize");
      function Vn(e, t2) {
        qr(e), Or(e, t2);
      }
      n(Vn, "defaultReaderClosedPromiseInitializeAsRejected");
      function Fi(e) {
        qr(e), Qn(e);
      }
      n(Fi, "defaultReaderClosedPromiseInitializeAsResolved");
      function Or(e, t2) {
        e._closedPromise_reject !== void 0 && (ve(e._closedPromise), e._closedPromise_reject(t2), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0);
      }
      n(Or, "defaultReaderClosedPromiseReject");
      function ji(e, t2) {
        Vn(e, t2);
      }
      n(ji, "defaultReaderClosedPromiseResetToRejected");
      function Qn(e) {
        e._closedPromise_resolve !== void 0 && (e._closedPromise_resolve(void 0), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0);
      }
      n(Qn, "defaultReaderClosedPromiseResolve");
      const Yn = Number.isFinite || function(e) {
        return typeof e == "number" && isFinite(e);
      }, Li = Math.trunc || function(e) {
        return e < 0 ? Math.ceil(e) : Math.floor(e);
      };
      function $i(e) {
        return typeof e == "object" || typeof e == "function";
      }
      n($i, "isDictionary");
      function le(e, t2) {
        if (e !== void 0 && !$i(e))
          throw new TypeError(`${t2} is not an object.`);
      }
      n(le, "assertDictionary");
      function Z(e, t2) {
        if (typeof e != "function")
          throw new TypeError(`${t2} is not a function.`);
      }
      n(Z, "assertFunction");
      function Di(e) {
        return typeof e == "object" && e !== null || typeof e == "function";
      }
      n(Di, "isObject");
      function Gn(e, t2) {
        if (!Di(e))
          throw new TypeError(`${t2} is not an object.`);
      }
      n(Gn, "assertObject");
      function _e(e, t2, r) {
        if (e === void 0)
          throw new TypeError(`Parameter ${t2} is required in '${r}'.`);
      }
      n(_e, "assertRequiredArgument");
      function zr(e, t2, r) {
        if (e === void 0)
          throw new TypeError(`${t2} is required in '${r}'.`);
      }
      n(zr, "assertRequiredField");
      function Ir(e) {
        return Number(e);
      }
      n(Ir, "convertUnrestrictedDouble");
      function Zn(e) {
        return e === 0 ? 0 : e;
      }
      n(Zn, "censorNegativeZero");
      function Mi(e) {
        return Zn(Li(e));
      }
      n(Mi, "integerPart");
      function Fr(e, t2) {
        const s2 = Number.MAX_SAFE_INTEGER;
        let l2 = Number(e);
        if (l2 = Zn(l2), !Yn(l2))
          throw new TypeError(`${t2} is not a finite number`);
        if (l2 = Mi(l2), l2 < 0 || l2 > s2)
          throw new TypeError(`${t2} is outside the accepted range of 0 to ${s2}, inclusive`);
        return !Yn(l2) || l2 === 0 ? 0 : l2;
      }
      n(Fr, "convertUnsignedLongLongWithEnforceRange");
      function jr(e, t2) {
        if (!We(e))
          throw new TypeError(`${t2} is not a ReadableStream.`);
      }
      n(jr, "assertReadableStream");
      function Qe(e) {
        return new fe(e);
      }
      n(Qe, "AcquireReadableStreamDefaultReader");
      function Kn(e, t2) {
        e._reader._readRequests.push(t2);
      }
      n(Kn, "ReadableStreamAddReadRequest");
      function Lr(e, t2, r) {
        const l2 = e._reader._readRequests.shift();
        r ? l2._closeSteps() : l2._chunkSteps(t2);
      }
      n(Lr, "ReadableStreamFulfillReadRequest");
      function Lt(e) {
        return e._reader._readRequests.length;
      }
      n(Lt, "ReadableStreamGetNumReadRequests");
      function Jn(e) {
        const t2 = e._reader;
        return !(t2 === void 0 || !Ee(t2));
      }
      n(Jn, "ReadableStreamHasDefaultReader");
      const dn = class dn {
        constructor(t2) {
          if (_e(t2, 1, "ReadableStreamDefaultReader"), jr(t2, "First parameter"), qe(t2))
            throw new TypeError("This stream has already been locked for exclusive reading by another reader");
          Hn(this, t2), this._readRequests = new U();
        }
        get closed() {
          return Ee(this) ? this._closedPromise : m($t("closed"));
        }
        cancel(t2 = void 0) {
          return Ee(this) ? this._ownerReadableStream === void 0 ? m(jt("cancel")) : Wr(this, t2) : m($t("cancel"));
        }
        read() {
          if (!Ee(this))
            return m($t("read"));
          if (this._ownerReadableStream === void 0)
            return m(jt("read from"));
          let t2, r;
          const s2 = A2((c, h2) => {
            t2 = c, r = h2;
          });
          return yt(this, { _chunkSteps: (c) => t2({ value: c, done: false }), _closeSteps: () => t2({ value: void 0, done: true }), _errorSteps: (c) => r(c) }), s2;
        }
        releaseLock() {
          if (!Ee(this))
            throw $t("releaseLock");
          this._ownerReadableStream !== void 0 && Ui(this);
        }
      };
      n(dn, "ReadableStreamDefaultReader");
      let fe = dn;
      Object.defineProperties(fe.prototype, { cancel: { enumerable: true }, read: { enumerable: true }, releaseLock: { enumerable: true }, closed: { enumerable: true } }), p(fe.prototype.cancel, "cancel"), p(fe.prototype.read, "read"), p(fe.prototype.releaseLock, "releaseLock"), typeof u.toStringTag == "symbol" && Object.defineProperty(fe.prototype, u.toStringTag, { value: "ReadableStreamDefaultReader", configurable: true });
      function Ee(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_readRequests") ? false : e instanceof fe;
      }
      n(Ee, "IsReadableStreamDefaultReader");
      function yt(e, t2) {
        const r = e._ownerReadableStream;
        r._disturbed = true, r._state === "closed" ? t2._closeSteps() : r._state === "errored" ? t2._errorSteps(r._storedError) : r._readableStreamController[Br](t2);
      }
      n(yt, "ReadableStreamDefaultReaderRead");
      function Ui(e) {
        ge(e);
        const t2 = new TypeError("Reader was released");
        Xn(e, t2);
      }
      n(Ui, "ReadableStreamDefaultReaderRelease");
      function Xn(e, t2) {
        const r = e._readRequests;
        e._readRequests = new U(), r.forEach((s2) => {
          s2._errorSteps(t2);
        });
      }
      n(Xn, "ReadableStreamDefaultReaderErrorReadRequests");
      function $t(e) {
        return new TypeError(`ReadableStreamDefaultReader.prototype.${e} can only be used on a ReadableStreamDefaultReader`);
      }
      n($t, "defaultReaderBrandCheckException");
      const eo = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
      }).prototype), hn = class hn {
        constructor(t2, r) {
          this._ongoingPromise = void 0, this._isFinished = false, this._reader = t2, this._preventCancel = r;
        }
        next() {
          const t2 = n(() => this._nextSteps(), "nextSteps");
          return this._ongoingPromise = this._ongoingPromise ? M(this._ongoingPromise, t2, t2) : t2(), this._ongoingPromise;
        }
        return(t2) {
          const r = n(() => this._returnSteps(t2), "returnSteps");
          return this._ongoingPromise ? M(this._ongoingPromise, r, r) : r();
        }
        _nextSteps() {
          if (this._isFinished)
            return Promise.resolve({ value: void 0, done: true });
          const t2 = this._reader;
          let r, s2;
          const l2 = A2((h2, y) => {
            r = h2, s2 = y;
          });
          return yt(t2, { _chunkSteps: (h2) => {
            this._ongoingPromise = void 0, z(() => r({ value: h2, done: false }));
          }, _closeSteps: () => {
            this._ongoingPromise = void 0, this._isFinished = true, ge(t2), r({ value: void 0, done: true });
          }, _errorSteps: (h2) => {
            this._ongoingPromise = void 0, this._isFinished = true, ge(t2), s2(h2);
          } }), l2;
        }
        _returnSteps(t2) {
          if (this._isFinished)
            return Promise.resolve({ value: t2, done: true });
          this._isFinished = true;
          const r = this._reader;
          if (!this._preventCancel) {
            const s2 = Wr(r, t2);
            return ge(r), M(s2, () => ({ value: t2, done: true }));
          }
          return ge(r), S({ value: t2, done: true });
        }
      };
      n(hn, "ReadableStreamAsyncIteratorImpl");
      let Dt = hn;
      const to = { next() {
        return ro(this) ? this._asyncIteratorImpl.next() : m(no("next"));
      }, return(e) {
        return ro(this) ? this._asyncIteratorImpl.return(e) : m(no("return"));
      } };
      eo !== void 0 && Object.setPrototypeOf(to, eo);
      function xi(e, t2) {
        const r = Qe(e), s2 = new Dt(r, t2), l2 = Object.create(to);
        return l2._asyncIteratorImpl = s2, l2;
      }
      n(xi, "AcquireReadableStreamAsyncIterator");
      function ro(e) {
        if (!d2(e) || !Object.prototype.hasOwnProperty.call(e, "_asyncIteratorImpl"))
          return false;
        try {
          return e._asyncIteratorImpl instanceof Dt;
        } catch {
          return false;
        }
      }
      n(ro, "IsReadableStreamAsyncIterator");
      function no(e) {
        return new TypeError(`ReadableStreamAsyncIterator.${e} can only be used on a ReadableSteamAsyncIterator`);
      }
      n(no, "streamAsyncIteratorBrandCheckException");
      const oo = Number.isNaN || function(e) {
        return e !== e;
      };
      function gt(e) {
        return e.slice();
      }
      n(gt, "CreateArrayFromList");
      function io(e, t2, r, s2, l2) {
        new Uint8Array(e).set(new Uint8Array(r, s2, l2), t2);
      }
      n(io, "CopyDataBlockBytes");
      let Se = n((e) => (typeof e.transfer == "function" ? Se = n((t2) => t2.transfer(), "TransferArrayBuffer") : typeof structuredClone == "function" ? Se = n((t2) => structuredClone(t2, { transfer: [t2] }), "TransferArrayBuffer") : Se = n((t2) => t2, "TransferArrayBuffer"), Se(e)), "TransferArrayBuffer"), Ae = n((e) => (typeof e.detached == "boolean" ? Ae = n((t2) => t2.detached, "IsDetachedBuffer") : Ae = n((t2) => t2.byteLength === 0, "IsDetachedBuffer"), Ae(e)), "IsDetachedBuffer");
      function ao(e, t2, r) {
        if (e.slice)
          return e.slice(t2, r);
        const s2 = r - t2, l2 = new ArrayBuffer(s2);
        return io(l2, 0, e, t2, s2), l2;
      }
      n(ao, "ArrayBufferSlice");
      function Mt(e, t2) {
        const r = e[t2];
        if (r != null) {
          if (typeof r != "function")
            throw new TypeError(`${String(t2)} is not a function`);
          return r;
        }
      }
      n(Mt, "GetMethod");
      function Ni(e) {
        const t2 = { [u.iterator]: () => e.iterator }, r = async function* () {
          return yield* t2;
        }(), s2 = r.next;
        return { iterator: r, nextMethod: s2, done: false };
      }
      n(Ni, "CreateAsyncFromSyncIterator");
      function so(e, t2 = "sync", r) {
        if (r === void 0)
          if (t2 === "async") {
            if (r = Mt(e, u.asyncIterator), r === void 0) {
              const c = Mt(e, u.iterator), h2 = so(e, "sync", c);
              return Ni(h2);
            }
          } else
            r = Mt(e, u.iterator);
        if (r === void 0)
          throw new TypeError("The object is not iterable");
        const s2 = j(r, e, []);
        if (!d2(s2))
          throw new TypeError("The iterator method must return an object");
        const l2 = s2.next;
        return { iterator: s2, nextMethod: l2, done: false };
      }
      n(so, "GetIterator");
      function Hi(e) {
        const t2 = j(e.nextMethod, e.iterator, []);
        if (!d2(t2))
          throw new TypeError("The iterator.next() method must return an object");
        return t2;
      }
      n(Hi, "IteratorNext");
      function Vi(e) {
        return !!e.done;
      }
      n(Vi, "IteratorComplete");
      function Qi(e) {
        return e.value;
      }
      n(Qi, "IteratorValue");
      function Yi(e) {
        return !(typeof e != "number" || oo(e) || e < 0);
      }
      n(Yi, "IsNonNegativeNumber");
      function uo(e) {
        const t2 = ao(e.buffer, e.byteOffset, e.byteOffset + e.byteLength);
        return new Uint8Array(t2);
      }
      n(uo, "CloneAsUint8Array");
      function $r(e) {
        const t2 = e._queue.shift();
        return e._queueTotalSize -= t2.size, e._queueTotalSize < 0 && (e._queueTotalSize = 0), t2.value;
      }
      n($r, "DequeueValue");
      function Dr(e, t2, r) {
        if (!Yi(r) || r === 1 / 0)
          throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
        e._queue.push({ value: t2, size: r }), e._queueTotalSize += r;
      }
      n(Dr, "EnqueueValueWithSize");
      function Gi(e) {
        return e._queue.peek().value;
      }
      n(Gi, "PeekQueueValue");
      function Be(e) {
        e._queue = new U(), e._queueTotalSize = 0;
      }
      n(Be, "ResetQueue");
      function lo(e) {
        return e === DataView;
      }
      n(lo, "isDataViewConstructor");
      function Zi(e) {
        return lo(e.constructor);
      }
      n(Zi, "isDataView");
      function Ki(e) {
        return lo(e) ? 1 : e.BYTES_PER_ELEMENT;
      }
      n(Ki, "arrayBufferViewElementSize");
      const pn = class pn {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        get view() {
          if (!Mr(this))
            throw Vr("view");
          return this._view;
        }
        respond(t2) {
          if (!Mr(this))
            throw Vr("respond");
          if (_e(t2, 1, "respond"), t2 = Fr(t2, "First parameter"), this._associatedReadableByteStreamController === void 0)
            throw new TypeError("This BYOB request has been invalidated");
          if (Ae(this._view.buffer))
            throw new TypeError("The BYOB request's buffer has been detached and so cannot be used as a response");
          Ht(this._associatedReadableByteStreamController, t2);
        }
        respondWithNewView(t2) {
          if (!Mr(this))
            throw Vr("respondWithNewView");
          if (_e(t2, 1, "respondWithNewView"), !ArrayBuffer.isView(t2))
            throw new TypeError("You can only respond with array buffer views");
          if (this._associatedReadableByteStreamController === void 0)
            throw new TypeError("This BYOB request has been invalidated");
          if (Ae(t2.buffer))
            throw new TypeError("The given view's buffer has been detached and so cannot be used as a response");
          Vt(this._associatedReadableByteStreamController, t2);
        }
      };
      n(pn, "ReadableStreamBYOBRequest");
      let we = pn;
      Object.defineProperties(we.prototype, { respond: { enumerable: true }, respondWithNewView: { enumerable: true }, view: { enumerable: true } }), p(we.prototype.respond, "respond"), p(we.prototype.respondWithNewView, "respondWithNewView"), typeof u.toStringTag == "symbol" && Object.defineProperty(we.prototype, u.toStringTag, { value: "ReadableStreamBYOBRequest", configurable: true });
      const bn = class bn {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        get byobRequest() {
          if (!ze(this))
            throw St("byobRequest");
          return Hr(this);
        }
        get desiredSize() {
          if (!ze(this))
            throw St("desiredSize");
          return So(this);
        }
        close() {
          if (!ze(this))
            throw St("close");
          if (this._closeRequested)
            throw new TypeError("The stream has already been closed; do not close it again!");
          const t2 = this._controlledReadableByteStream._state;
          if (t2 !== "readable")
            throw new TypeError(`The stream (in ${t2} state) is not in the readable state and cannot be closed`);
          _t(this);
        }
        enqueue(t2) {
          if (!ze(this))
            throw St("enqueue");
          if (_e(t2, 1, "enqueue"), !ArrayBuffer.isView(t2))
            throw new TypeError("chunk must be an array buffer view");
          if (t2.byteLength === 0)
            throw new TypeError("chunk must have non-zero byteLength");
          if (t2.buffer.byteLength === 0)
            throw new TypeError("chunk's buffer must have non-zero byteLength");
          if (this._closeRequested)
            throw new TypeError("stream is closed or draining");
          const r = this._controlledReadableByteStream._state;
          if (r !== "readable")
            throw new TypeError(`The stream (in ${r} state) is not in the readable state and cannot be enqueued to`);
          Nt(this, t2);
        }
        error(t2 = void 0) {
          if (!ze(this))
            throw St("error");
          K(this, t2);
        }
        [Ar](t2) {
          fo(this), Be(this);
          const r = this._cancelAlgorithm(t2);
          return xt(this), r;
        }
        [Br](t2) {
          const r = this._controlledReadableByteStream;
          if (this._queueTotalSize > 0) {
            _o(this, t2);
            return;
          }
          const s2 = this._autoAllocateChunkSize;
          if (s2 !== void 0) {
            let l2;
            try {
              l2 = new ArrayBuffer(s2);
            } catch (h2) {
              t2._errorSteps(h2);
              return;
            }
            const c = { buffer: l2, bufferByteLength: s2, byteOffset: 0, byteLength: s2, bytesFilled: 0, minimumFill: 1, elementSize: 1, viewConstructor: Uint8Array, readerType: "default" };
            this._pendingPullIntos.push(c);
          }
          Kn(r, t2), Ie(this);
        }
        [kr]() {
          if (this._pendingPullIntos.length > 0) {
            const t2 = this._pendingPullIntos.peek();
            t2.readerType = "none", this._pendingPullIntos = new U(), this._pendingPullIntos.push(t2);
          }
        }
      };
      n(bn, "ReadableByteStreamController");
      let te = bn;
      Object.defineProperties(te.prototype, { close: { enumerable: true }, enqueue: { enumerable: true }, error: { enumerable: true }, byobRequest: { enumerable: true }, desiredSize: { enumerable: true } }), p(te.prototype.close, "close"), p(te.prototype.enqueue, "enqueue"), p(te.prototype.error, "error"), typeof u.toStringTag == "symbol" && Object.defineProperty(te.prototype, u.toStringTag, { value: "ReadableByteStreamController", configurable: true });
      function ze(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_controlledReadableByteStream") ? false : e instanceof te;
      }
      n(ze, "IsReadableByteStreamController");
      function Mr(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_associatedReadableByteStreamController") ? false : e instanceof we;
      }
      n(Mr, "IsReadableStreamBYOBRequest");
      function Ie(e) {
        if (!ra(e))
          return;
        if (e._pulling) {
          e._pullAgain = true;
          return;
        }
        e._pulling = true;
        const r = e._pullAlgorithm();
        q(r, () => (e._pulling = false, e._pullAgain && (e._pullAgain = false, Ie(e)), null), (s2) => (K(e, s2), null));
      }
      n(Ie, "ReadableByteStreamControllerCallPullIfNeeded");
      function fo(e) {
        xr(e), e._pendingPullIntos = new U();
      }
      n(fo, "ReadableByteStreamControllerClearPendingPullIntos");
      function Ur(e, t2) {
        let r = false;
        e._state === "closed" && (r = true);
        const s2 = co(t2);
        t2.readerType === "default" ? Lr(e, s2, r) : ua(e, s2, r);
      }
      n(Ur, "ReadableByteStreamControllerCommitPullIntoDescriptor");
      function co(e) {
        const t2 = e.bytesFilled, r = e.elementSize;
        return new e.viewConstructor(e.buffer, e.byteOffset, t2 / r);
      }
      n(co, "ReadableByteStreamControllerConvertPullIntoDescriptor");
      function Ut(e, t2, r, s2) {
        e._queue.push({ buffer: t2, byteOffset: r, byteLength: s2 }), e._queueTotalSize += s2;
      }
      n(Ut, "ReadableByteStreamControllerEnqueueChunkToQueue");
      function ho(e, t2, r, s2) {
        let l2;
        try {
          l2 = ao(t2, r, r + s2);
        } catch (c) {
          throw K(e, c), c;
        }
        Ut(e, l2, 0, s2);
      }
      n(ho, "ReadableByteStreamControllerEnqueueClonedChunkToQueue");
      function po(e, t2) {
        t2.bytesFilled > 0 && ho(e, t2.buffer, t2.byteOffset, t2.bytesFilled), Ye(e);
      }
      n(po, "ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue");
      function bo(e, t2) {
        const r = Math.min(e._queueTotalSize, t2.byteLength - t2.bytesFilled), s2 = t2.bytesFilled + r;
        let l2 = r, c = false;
        const h2 = s2 % t2.elementSize, y = s2 - h2;
        y >= t2.minimumFill && (l2 = y - t2.bytesFilled, c = true);
        const T = e._queue;
        for (; l2 > 0; ) {
          const g2 = T.peek(), C = Math.min(l2, g2.byteLength), P = t2.byteOffset + t2.bytesFilled;
          io(t2.buffer, P, g2.buffer, g2.byteOffset, C), g2.byteLength === C ? T.shift() : (g2.byteOffset += C, g2.byteLength -= C), e._queueTotalSize -= C, mo(e, C, t2), l2 -= C;
        }
        return c;
      }
      n(bo, "ReadableByteStreamControllerFillPullIntoDescriptorFromQueue");
      function mo(e, t2, r) {
        r.bytesFilled += t2;
      }
      n(mo, "ReadableByteStreamControllerFillHeadPullIntoDescriptor");
      function yo(e) {
        e._queueTotalSize === 0 && e._closeRequested ? (xt(e), vt(e._controlledReadableByteStream)) : Ie(e);
      }
      n(yo, "ReadableByteStreamControllerHandleQueueDrain");
      function xr(e) {
        e._byobRequest !== null && (e._byobRequest._associatedReadableByteStreamController = void 0, e._byobRequest._view = null, e._byobRequest = null);
      }
      n(xr, "ReadableByteStreamControllerInvalidateBYOBRequest");
      function Nr(e) {
        for (; e._pendingPullIntos.length > 0; ) {
          if (e._queueTotalSize === 0)
            return;
          const t2 = e._pendingPullIntos.peek();
          bo(e, t2) && (Ye(e), Ur(e._controlledReadableByteStream, t2));
        }
      }
      n(Nr, "ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue");
      function Ji(e) {
        const t2 = e._controlledReadableByteStream._reader;
        for (; t2._readRequests.length > 0; ) {
          if (e._queueTotalSize === 0)
            return;
          const r = t2._readRequests.shift();
          _o(e, r);
        }
      }
      n(Ji, "ReadableByteStreamControllerProcessReadRequestsUsingQueue");
      function Xi(e, t2, r, s2) {
        const l2 = e._controlledReadableByteStream, c = t2.constructor, h2 = Ki(c), { byteOffset: y, byteLength: T } = t2, g2 = r * h2;
        let C;
        try {
          C = Se(t2.buffer);
        } catch (B) {
          s2._errorSteps(B);
          return;
        }
        const P = { buffer: C, bufferByteLength: C.byteLength, byteOffset: y, byteLength: T, bytesFilled: 0, minimumFill: g2, elementSize: h2, viewConstructor: c, readerType: "byob" };
        if (e._pendingPullIntos.length > 0) {
          e._pendingPullIntos.push(P), To(l2, s2);
          return;
        }
        if (l2._state === "closed") {
          const B = new c(P.buffer, P.byteOffset, 0);
          s2._closeSteps(B);
          return;
        }
        if (e._queueTotalSize > 0) {
          if (bo(e, P)) {
            const B = co(P);
            yo(e), s2._chunkSteps(B);
            return;
          }
          if (e._closeRequested) {
            const B = new TypeError("Insufficient bytes to fill elements in the given buffer");
            K(e, B), s2._errorSteps(B);
            return;
          }
        }
        e._pendingPullIntos.push(P), To(l2, s2), Ie(e);
      }
      n(Xi, "ReadableByteStreamControllerPullInto");
      function ea(e, t2) {
        t2.readerType === "none" && Ye(e);
        const r = e._controlledReadableByteStream;
        if (Qr(r))
          for (; Co(r) > 0; ) {
            const s2 = Ye(e);
            Ur(r, s2);
          }
      }
      n(ea, "ReadableByteStreamControllerRespondInClosedState");
      function ta(e, t2, r) {
        if (mo(e, t2, r), r.readerType === "none") {
          po(e, r), Nr(e);
          return;
        }
        if (r.bytesFilled < r.minimumFill)
          return;
        Ye(e);
        const s2 = r.bytesFilled % r.elementSize;
        if (s2 > 0) {
          const l2 = r.byteOffset + r.bytesFilled;
          ho(e, r.buffer, l2 - s2, s2);
        }
        r.bytesFilled -= s2, Ur(e._controlledReadableByteStream, r), Nr(e);
      }
      n(ta, "ReadableByteStreamControllerRespondInReadableState");
      function go(e, t2) {
        const r = e._pendingPullIntos.peek();
        xr(e), e._controlledReadableByteStream._state === "closed" ? ea(e, r) : ta(e, t2, r), Ie(e);
      }
      n(go, "ReadableByteStreamControllerRespondInternal");
      function Ye(e) {
        return e._pendingPullIntos.shift();
      }
      n(Ye, "ReadableByteStreamControllerShiftPendingPullInto");
      function ra(e) {
        const t2 = e._controlledReadableByteStream;
        return t2._state !== "readable" || e._closeRequested || !e._started ? false : !!(Jn(t2) && Lt(t2) > 0 || Qr(t2) && Co(t2) > 0 || So(e) > 0);
      }
      n(ra, "ReadableByteStreamControllerShouldCallPull");
      function xt(e) {
        e._pullAlgorithm = void 0, e._cancelAlgorithm = void 0;
      }
      n(xt, "ReadableByteStreamControllerClearAlgorithms");
      function _t(e) {
        const t2 = e._controlledReadableByteStream;
        if (!(e._closeRequested || t2._state !== "readable")) {
          if (e._queueTotalSize > 0) {
            e._closeRequested = true;
            return;
          }
          if (e._pendingPullIntos.length > 0) {
            const r = e._pendingPullIntos.peek();
            if (r.bytesFilled % r.elementSize !== 0) {
              const s2 = new TypeError("Insufficient bytes to fill elements in the given buffer");
              throw K(e, s2), s2;
            }
          }
          xt(e), vt(t2);
        }
      }
      n(_t, "ReadableByteStreamControllerClose");
      function Nt(e, t2) {
        const r = e._controlledReadableByteStream;
        if (e._closeRequested || r._state !== "readable")
          return;
        const { buffer: s2, byteOffset: l2, byteLength: c } = t2;
        if (Ae(s2))
          throw new TypeError("chunk's buffer is detached and so cannot be enqueued");
        const h2 = Se(s2);
        if (e._pendingPullIntos.length > 0) {
          const y = e._pendingPullIntos.peek();
          if (Ae(y.buffer))
            throw new TypeError("The BYOB request's buffer has been detached and so cannot be filled with an enqueued chunk");
          xr(e), y.buffer = Se(y.buffer), y.readerType === "none" && po(e, y);
        }
        if (Jn(r))
          if (Ji(e), Lt(r) === 0)
            Ut(e, h2, l2, c);
          else {
            e._pendingPullIntos.length > 0 && Ye(e);
            const y = new Uint8Array(h2, l2, c);
            Lr(r, y, false);
          }
        else
          Qr(r) ? (Ut(e, h2, l2, c), Nr(e)) : Ut(e, h2, l2, c);
        Ie(e);
      }
      n(Nt, "ReadableByteStreamControllerEnqueue");
      function K(e, t2) {
        const r = e._controlledReadableByteStream;
        r._state === "readable" && (fo(e), Be(e), xt(e), Yo(r, t2));
      }
      n(K, "ReadableByteStreamControllerError");
      function _o(e, t2) {
        const r = e._queue.shift();
        e._queueTotalSize -= r.byteLength, yo(e);
        const s2 = new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
        t2._chunkSteps(s2);
      }
      n(_o, "ReadableByteStreamControllerFillReadRequestFromQueue");
      function Hr(e) {
        if (e._byobRequest === null && e._pendingPullIntos.length > 0) {
          const t2 = e._pendingPullIntos.peek(), r = new Uint8Array(t2.buffer, t2.byteOffset + t2.bytesFilled, t2.byteLength - t2.bytesFilled), s2 = Object.create(we.prototype);
          oa(s2, e, r), e._byobRequest = s2;
        }
        return e._byobRequest;
      }
      n(Hr, "ReadableByteStreamControllerGetBYOBRequest");
      function So(e) {
        const t2 = e._controlledReadableByteStream._state;
        return t2 === "errored" ? null : t2 === "closed" ? 0 : e._strategyHWM - e._queueTotalSize;
      }
      n(So, "ReadableByteStreamControllerGetDesiredSize");
      function Ht(e, t2) {
        const r = e._pendingPullIntos.peek();
        if (e._controlledReadableByteStream._state === "closed") {
          if (t2 !== 0)
            throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
        } else {
          if (t2 === 0)
            throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
          if (r.bytesFilled + t2 > r.byteLength)
            throw new RangeError("bytesWritten out of range");
        }
        r.buffer = Se(r.buffer), go(e, t2);
      }
      n(Ht, "ReadableByteStreamControllerRespond");
      function Vt(e, t2) {
        const r = e._pendingPullIntos.peek();
        if (e._controlledReadableByteStream._state === "closed") {
          if (t2.byteLength !== 0)
            throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
        } else if (t2.byteLength === 0)
          throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
        if (r.byteOffset + r.bytesFilled !== t2.byteOffset)
          throw new RangeError("The region specified by view does not match byobRequest");
        if (r.bufferByteLength !== t2.buffer.byteLength)
          throw new RangeError("The buffer of view has different capacity than byobRequest");
        if (r.bytesFilled + t2.byteLength > r.byteLength)
          throw new RangeError("The region specified by view is larger than byobRequest");
        const l2 = t2.byteLength;
        r.buffer = Se(t2.buffer), go(e, l2);
      }
      n(Vt, "ReadableByteStreamControllerRespondWithNewView");
      function wo(e, t2, r, s2, l2, c, h2) {
        t2._controlledReadableByteStream = e, t2._pullAgain = false, t2._pulling = false, t2._byobRequest = null, t2._queue = t2._queueTotalSize = void 0, Be(t2), t2._closeRequested = false, t2._started = false, t2._strategyHWM = c, t2._pullAlgorithm = s2, t2._cancelAlgorithm = l2, t2._autoAllocateChunkSize = h2, t2._pendingPullIntos = new U(), e._readableStreamController = t2;
        const y = r();
        q(S(y), () => (t2._started = true, Ie(t2), null), (T) => (K(t2, T), null));
      }
      n(wo, "SetUpReadableByteStreamController");
      function na(e, t2, r) {
        const s2 = Object.create(te.prototype);
        let l2, c, h2;
        t2.start !== void 0 ? l2 = n(() => t2.start(s2), "startAlgorithm") : l2 = n(() => {
        }, "startAlgorithm"), t2.pull !== void 0 ? c = n(() => t2.pull(s2), "pullAlgorithm") : c = n(() => S(void 0), "pullAlgorithm"), t2.cancel !== void 0 ? h2 = n((T) => t2.cancel(T), "cancelAlgorithm") : h2 = n(() => S(void 0), "cancelAlgorithm");
        const y = t2.autoAllocateChunkSize;
        if (y === 0)
          throw new TypeError("autoAllocateChunkSize must be greater than 0");
        wo(e, s2, l2, c, h2, r, y);
      }
      n(na, "SetUpReadableByteStreamControllerFromUnderlyingSource");
      function oa(e, t2, r) {
        e._associatedReadableByteStreamController = t2, e._view = r;
      }
      n(oa, "SetUpReadableStreamBYOBRequest");
      function Vr(e) {
        return new TypeError(`ReadableStreamBYOBRequest.prototype.${e} can only be used on a ReadableStreamBYOBRequest`);
      }
      n(Vr, "byobRequestBrandCheckException");
      function St(e) {
        return new TypeError(`ReadableByteStreamController.prototype.${e} can only be used on a ReadableByteStreamController`);
      }
      n(St, "byteStreamControllerBrandCheckException");
      function ia(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.mode;
        return { mode: r === void 0 ? void 0 : aa(r, `${t2} has member 'mode' that`) };
      }
      n(ia, "convertReaderOptions");
      function aa(e, t2) {
        if (e = `${e}`, e !== "byob")
          throw new TypeError(`${t2} '${e}' is not a valid enumeration value for ReadableStreamReaderMode`);
        return e;
      }
      n(aa, "convertReadableStreamReaderMode");
      function sa(e, t2) {
        var r;
        le(e, t2);
        const s2 = (r = e == null ? void 0 : e.min) !== null && r !== void 0 ? r : 1;
        return { min: Fr(s2, `${t2} has member 'min' that`) };
      }
      n(sa, "convertByobReadOptions");
      function Ro(e) {
        return new ce(e);
      }
      n(Ro, "AcquireReadableStreamBYOBReader");
      function To(e, t2) {
        e._reader._readIntoRequests.push(t2);
      }
      n(To, "ReadableStreamAddReadIntoRequest");
      function ua(e, t2, r) {
        const l2 = e._reader._readIntoRequests.shift();
        r ? l2._closeSteps(t2) : l2._chunkSteps(t2);
      }
      n(ua, "ReadableStreamFulfillReadIntoRequest");
      function Co(e) {
        return e._reader._readIntoRequests.length;
      }
      n(Co, "ReadableStreamGetNumReadIntoRequests");
      function Qr(e) {
        const t2 = e._reader;
        return !(t2 === void 0 || !Fe(t2));
      }
      n(Qr, "ReadableStreamHasBYOBReader");
      const mn = class mn {
        constructor(t2) {
          if (_e(t2, 1, "ReadableStreamBYOBReader"), jr(t2, "First parameter"), qe(t2))
            throw new TypeError("This stream has already been locked for exclusive reading by another reader");
          if (!ze(t2._readableStreamController))
            throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
          Hn(this, t2), this._readIntoRequests = new U();
        }
        get closed() {
          return Fe(this) ? this._closedPromise : m(Qt("closed"));
        }
        cancel(t2 = void 0) {
          return Fe(this) ? this._ownerReadableStream === void 0 ? m(jt("cancel")) : Wr(this, t2) : m(Qt("cancel"));
        }
        read(t2, r = {}) {
          if (!Fe(this))
            return m(Qt("read"));
          if (!ArrayBuffer.isView(t2))
            return m(new TypeError("view must be an array buffer view"));
          if (t2.byteLength === 0)
            return m(new TypeError("view must have non-zero byteLength"));
          if (t2.buffer.byteLength === 0)
            return m(new TypeError("view's buffer must have non-zero byteLength"));
          if (Ae(t2.buffer))
            return m(new TypeError("view's buffer has been detached"));
          let s2;
          try {
            s2 = sa(r, "options");
          } catch (g2) {
            return m(g2);
          }
          const l2 = s2.min;
          if (l2 === 0)
            return m(new TypeError("options.min must be greater than 0"));
          if (Zi(t2)) {
            if (l2 > t2.byteLength)
              return m(new RangeError("options.min must be less than or equal to view's byteLength"));
          } else if (l2 > t2.length)
            return m(new RangeError("options.min must be less than or equal to view's length"));
          if (this._ownerReadableStream === void 0)
            return m(jt("read from"));
          let c, h2;
          const y = A2((g2, C) => {
            c = g2, h2 = C;
          });
          return Po(this, t2, l2, { _chunkSteps: (g2) => c({ value: g2, done: false }), _closeSteps: (g2) => c({ value: g2, done: true }), _errorSteps: (g2) => h2(g2) }), y;
        }
        releaseLock() {
          if (!Fe(this))
            throw Qt("releaseLock");
          this._ownerReadableStream !== void 0 && la(this);
        }
      };
      n(mn, "ReadableStreamBYOBReader");
      let ce = mn;
      Object.defineProperties(ce.prototype, { cancel: { enumerable: true }, read: { enumerable: true }, releaseLock: { enumerable: true }, closed: { enumerable: true } }), p(ce.prototype.cancel, "cancel"), p(ce.prototype.read, "read"), p(ce.prototype.releaseLock, "releaseLock"), typeof u.toStringTag == "symbol" && Object.defineProperty(ce.prototype, u.toStringTag, { value: "ReadableStreamBYOBReader", configurable: true });
      function Fe(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_readIntoRequests") ? false : e instanceof ce;
      }
      n(Fe, "IsReadableStreamBYOBReader");
      function Po(e, t2, r, s2) {
        const l2 = e._ownerReadableStream;
        l2._disturbed = true, l2._state === "errored" ? s2._errorSteps(l2._storedError) : Xi(l2._readableStreamController, t2, r, s2);
      }
      n(Po, "ReadableStreamBYOBReaderRead");
      function la(e) {
        ge(e);
        const t2 = new TypeError("Reader was released");
        vo(e, t2);
      }
      n(la, "ReadableStreamBYOBReaderRelease");
      function vo(e, t2) {
        const r = e._readIntoRequests;
        e._readIntoRequests = new U(), r.forEach((s2) => {
          s2._errorSteps(t2);
        });
      }
      n(vo, "ReadableStreamBYOBReaderErrorReadIntoRequests");
      function Qt(e) {
        return new TypeError(`ReadableStreamBYOBReader.prototype.${e} can only be used on a ReadableStreamBYOBReader`);
      }
      n(Qt, "byobReaderBrandCheckException");
      function wt(e, t2) {
        const { highWaterMark: r } = e;
        if (r === void 0)
          return t2;
        if (oo(r) || r < 0)
          throw new RangeError("Invalid highWaterMark");
        return r;
      }
      n(wt, "ExtractHighWaterMark");
      function Yt(e) {
        const { size: t2 } = e;
        return t2 || (() => 1);
      }
      n(Yt, "ExtractSizeAlgorithm");
      function Gt(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.highWaterMark, s2 = e == null ? void 0 : e.size;
        return { highWaterMark: r === void 0 ? void 0 : Ir(r), size: s2 === void 0 ? void 0 : fa(s2, `${t2} has member 'size' that`) };
      }
      n(Gt, "convertQueuingStrategy");
      function fa(e, t2) {
        return Z(e, t2), (r) => Ir(e(r));
      }
      n(fa, "convertQueuingStrategySize");
      function ca(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.abort, s2 = e == null ? void 0 : e.close, l2 = e == null ? void 0 : e.start, c = e == null ? void 0 : e.type, h2 = e == null ? void 0 : e.write;
        return { abort: r === void 0 ? void 0 : da(r, e, `${t2} has member 'abort' that`), close: s2 === void 0 ? void 0 : ha(s2, e, `${t2} has member 'close' that`), start: l2 === void 0 ? void 0 : pa(l2, e, `${t2} has member 'start' that`), write: h2 === void 0 ? void 0 : ba(h2, e, `${t2} has member 'write' that`), type: c };
      }
      n(ca, "convertUnderlyingSink");
      function da(e, t2, r) {
        return Z(e, r), (s2) => I(e, t2, [s2]);
      }
      n(da, "convertUnderlyingSinkAbortCallback");
      function ha(e, t2, r) {
        return Z(e, r), () => I(e, t2, []);
      }
      n(ha, "convertUnderlyingSinkCloseCallback");
      function pa(e, t2, r) {
        return Z(e, r), (s2) => j(e, t2, [s2]);
      }
      n(pa, "convertUnderlyingSinkStartCallback");
      function ba(e, t2, r) {
        return Z(e, r), (s2, l2) => I(e, t2, [s2, l2]);
      }
      n(ba, "convertUnderlyingSinkWriteCallback");
      function Eo(e, t2) {
        if (!Ge(e))
          throw new TypeError(`${t2} is not a WritableStream.`);
      }
      n(Eo, "assertWritableStream");
      function ma(e) {
        if (typeof e != "object" || e === null)
          return false;
        try {
          return typeof e.aborted == "boolean";
        } catch {
          return false;
        }
      }
      n(ma, "isAbortSignal");
      const ya = typeof AbortController == "function";
      function ga() {
        if (ya)
          return new AbortController();
      }
      n(ga, "createAbortController");
      const yn = class yn {
        constructor(t2 = {}, r = {}) {
          t2 === void 0 ? t2 = null : Gn(t2, "First parameter");
          const s2 = Gt(r, "Second parameter"), l2 = ca(t2, "First parameter");
          if (Bo(this), l2.type !== void 0)
            throw new RangeError("Invalid type is specified");
          const h2 = Yt(s2), y = wt(s2, 1);
          qa(this, l2, y, h2);
        }
        get locked() {
          if (!Ge(this))
            throw er("locked");
          return Ze(this);
        }
        abort(t2 = void 0) {
          return Ge(this) ? Ze(this) ? m(new TypeError("Cannot abort a stream that already has a writer")) : Zt(this, t2) : m(er("abort"));
        }
        close() {
          return Ge(this) ? Ze(this) ? m(new TypeError("Cannot close a stream that already has a writer")) : he(this) ? m(new TypeError("Cannot close an already-closing stream")) : ko(this) : m(er("close"));
        }
        getWriter() {
          if (!Ge(this))
            throw er("getWriter");
          return Ao(this);
        }
      };
      n(yn, "WritableStream");
      let de = yn;
      Object.defineProperties(de.prototype, { abort: { enumerable: true }, close: { enumerable: true }, getWriter: { enumerable: true }, locked: { enumerable: true } }), p(de.prototype.abort, "abort"), p(de.prototype.close, "close"), p(de.prototype.getWriter, "getWriter"), typeof u.toStringTag == "symbol" && Object.defineProperty(de.prototype, u.toStringTag, { value: "WritableStream", configurable: true });
      function Ao(e) {
        return new re(e);
      }
      n(Ao, "AcquireWritableStreamDefaultWriter");
      function _a2(e, t2, r, s2, l2 = 1, c = () => 1) {
        const h2 = Object.create(de.prototype);
        Bo(h2);
        const y = Object.create(ke.prototype);
        return Fo(h2, y, e, t2, r, s2, l2, c), h2;
      }
      n(_a2, "CreateWritableStream");
      function Bo(e) {
        e._state = "writable", e._storedError = void 0, e._writer = void 0, e._writableStreamController = void 0, e._writeRequests = new U(), e._inFlightWriteRequest = void 0, e._closeRequest = void 0, e._inFlightCloseRequest = void 0, e._pendingAbortRequest = void 0, e._backpressure = false;
      }
      n(Bo, "InitializeWritableStream");
      function Ge(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_writableStreamController") ? false : e instanceof de;
      }
      n(Ge, "IsWritableStream");
      function Ze(e) {
        return e._writer !== void 0;
      }
      n(Ze, "IsWritableStreamLocked");
      function Zt(e, t2) {
        var r;
        if (e._state === "closed" || e._state === "errored")
          return S(void 0);
        e._writableStreamController._abortReason = t2, (r = e._writableStreamController._abortController) === null || r === void 0 || r.abort(t2);
        const s2 = e._state;
        if (s2 === "closed" || s2 === "errored")
          return S(void 0);
        if (e._pendingAbortRequest !== void 0)
          return e._pendingAbortRequest._promise;
        let l2 = false;
        s2 === "erroring" && (l2 = true, t2 = void 0);
        const c = A2((h2, y) => {
          e._pendingAbortRequest = { _promise: void 0, _resolve: h2, _reject: y, _reason: t2, _wasAlreadyErroring: l2 };
        });
        return e._pendingAbortRequest._promise = c, l2 || Gr(e, t2), c;
      }
      n(Zt, "WritableStreamAbort");
      function ko(e) {
        const t2 = e._state;
        if (t2 === "closed" || t2 === "errored")
          return m(new TypeError(`The stream (in ${t2} state) is not in the writable state and cannot be closed`));
        const r = A2((l2, c) => {
          const h2 = { _resolve: l2, _reject: c };
          e._closeRequest = h2;
        }), s2 = e._writer;
        return s2 !== void 0 && e._backpressure && t2 === "writable" && nn(s2), Oa(e._writableStreamController), r;
      }
      n(ko, "WritableStreamClose");
      function Sa(e) {
        return A2((r, s2) => {
          const l2 = { _resolve: r, _reject: s2 };
          e._writeRequests.push(l2);
        });
      }
      n(Sa, "WritableStreamAddWriteRequest");
      function Yr(e, t2) {
        if (e._state === "writable") {
          Gr(e, t2);
          return;
        }
        Zr(e);
      }
      n(Yr, "WritableStreamDealWithRejection");
      function Gr(e, t2) {
        const r = e._writableStreamController;
        e._state = "erroring", e._storedError = t2;
        const s2 = e._writer;
        s2 !== void 0 && qo(s2, t2), !Pa(e) && r._started && Zr(e);
      }
      n(Gr, "WritableStreamStartErroring");
      function Zr(e) {
        e._state = "errored", e._writableStreamController[Nn]();
        const t2 = e._storedError;
        if (e._writeRequests.forEach((l2) => {
          l2._reject(t2);
        }), e._writeRequests = new U(), e._pendingAbortRequest === void 0) {
          Kt(e);
          return;
        }
        const r = e._pendingAbortRequest;
        if (e._pendingAbortRequest = void 0, r._wasAlreadyErroring) {
          r._reject(t2), Kt(e);
          return;
        }
        const s2 = e._writableStreamController[xn](r._reason);
        q(s2, () => (r._resolve(), Kt(e), null), (l2) => (r._reject(l2), Kt(e), null));
      }
      n(Zr, "WritableStreamFinishErroring");
      function wa(e) {
        e._inFlightWriteRequest._resolve(void 0), e._inFlightWriteRequest = void 0;
      }
      n(wa, "WritableStreamFinishInFlightWrite");
      function Ra(e, t2) {
        e._inFlightWriteRequest._reject(t2), e._inFlightWriteRequest = void 0, Yr(e, t2);
      }
      n(Ra, "WritableStreamFinishInFlightWriteWithError");
      function Ta(e) {
        e._inFlightCloseRequest._resolve(void 0), e._inFlightCloseRequest = void 0, e._state === "erroring" && (e._storedError = void 0, e._pendingAbortRequest !== void 0 && (e._pendingAbortRequest._resolve(), e._pendingAbortRequest = void 0)), e._state = "closed";
        const r = e._writer;
        r !== void 0 && Do(r);
      }
      n(Ta, "WritableStreamFinishInFlightClose");
      function Ca(e, t2) {
        e._inFlightCloseRequest._reject(t2), e._inFlightCloseRequest = void 0, e._pendingAbortRequest !== void 0 && (e._pendingAbortRequest._reject(t2), e._pendingAbortRequest = void 0), Yr(e, t2);
      }
      n(Ca, "WritableStreamFinishInFlightCloseWithError");
      function he(e) {
        return !(e._closeRequest === void 0 && e._inFlightCloseRequest === void 0);
      }
      n(he, "WritableStreamCloseQueuedOrInFlight");
      function Pa(e) {
        return !(e._inFlightWriteRequest === void 0 && e._inFlightCloseRequest === void 0);
      }
      n(Pa, "WritableStreamHasOperationMarkedInFlight");
      function va(e) {
        e._inFlightCloseRequest = e._closeRequest, e._closeRequest = void 0;
      }
      n(va, "WritableStreamMarkCloseRequestInFlight");
      function Ea(e) {
        e._inFlightWriteRequest = e._writeRequests.shift();
      }
      n(Ea, "WritableStreamMarkFirstWriteRequestInFlight");
      function Kt(e) {
        e._closeRequest !== void 0 && (e._closeRequest._reject(e._storedError), e._closeRequest = void 0);
        const t2 = e._writer;
        t2 !== void 0 && tn(t2, e._storedError);
      }
      n(Kt, "WritableStreamRejectCloseAndClosedPromiseIfNeeded");
      function Kr(e, t2) {
        const r = e._writer;
        r !== void 0 && t2 !== e._backpressure && (t2 ? Da(r) : nn(r)), e._backpressure = t2;
      }
      n(Kr, "WritableStreamUpdateBackpressure");
      const gn = class gn {
        constructor(t2) {
          if (_e(t2, 1, "WritableStreamDefaultWriter"), Eo(t2, "First parameter"), Ze(t2))
            throw new TypeError("This stream has already been locked for exclusive writing by another writer");
          this._ownerWritableStream = t2, t2._writer = this;
          const r = t2._state;
          if (r === "writable")
            !he(t2) && t2._backpressure ? rr(this) : Mo(this), tr(this);
          else if (r === "erroring")
            rn(this, t2._storedError), tr(this);
          else if (r === "closed")
            Mo(this), La(this);
          else {
            const s2 = t2._storedError;
            rn(this, s2), $o(this, s2);
          }
        }
        get closed() {
          return je(this) ? this._closedPromise : m(Le("closed"));
        }
        get desiredSize() {
          if (!je(this))
            throw Le("desiredSize");
          if (this._ownerWritableStream === void 0)
            throw Tt("desiredSize");
          return Wa(this);
        }
        get ready() {
          return je(this) ? this._readyPromise : m(Le("ready"));
        }
        abort(t2 = void 0) {
          return je(this) ? this._ownerWritableStream === void 0 ? m(Tt("abort")) : Aa(this, t2) : m(Le("abort"));
        }
        close() {
          if (!je(this))
            return m(Le("close"));
          const t2 = this._ownerWritableStream;
          return t2 === void 0 ? m(Tt("close")) : he(t2) ? m(new TypeError("Cannot close an already-closing stream")) : Wo(this);
        }
        releaseLock() {
          if (!je(this))
            throw Le("releaseLock");
          this._ownerWritableStream !== void 0 && Oo(this);
        }
        write(t2 = void 0) {
          return je(this) ? this._ownerWritableStream === void 0 ? m(Tt("write to")) : zo(this, t2) : m(Le("write"));
        }
      };
      n(gn, "WritableStreamDefaultWriter");
      let re = gn;
      Object.defineProperties(re.prototype, { abort: { enumerable: true }, close: { enumerable: true }, releaseLock: { enumerable: true }, write: { enumerable: true }, closed: { enumerable: true }, desiredSize: { enumerable: true }, ready: { enumerable: true } }), p(re.prototype.abort, "abort"), p(re.prototype.close, "close"), p(re.prototype.releaseLock, "releaseLock"), p(re.prototype.write, "write"), typeof u.toStringTag == "symbol" && Object.defineProperty(re.prototype, u.toStringTag, { value: "WritableStreamDefaultWriter", configurable: true });
      function je(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_ownerWritableStream") ? false : e instanceof re;
      }
      n(je, "IsWritableStreamDefaultWriter");
      function Aa(e, t2) {
        const r = e._ownerWritableStream;
        return Zt(r, t2);
      }
      n(Aa, "WritableStreamDefaultWriterAbort");
      function Wo(e) {
        const t2 = e._ownerWritableStream;
        return ko(t2);
      }
      n(Wo, "WritableStreamDefaultWriterClose");
      function Ba(e) {
        const t2 = e._ownerWritableStream, r = t2._state;
        return he(t2) || r === "closed" ? S(void 0) : r === "errored" ? m(t2._storedError) : Wo(e);
      }
      n(Ba, "WritableStreamDefaultWriterCloseWithErrorPropagation");
      function ka(e, t2) {
        e._closedPromiseState === "pending" ? tn(e, t2) : $a(e, t2);
      }
      n(ka, "WritableStreamDefaultWriterEnsureClosedPromiseRejected");
      function qo(e, t2) {
        e._readyPromiseState === "pending" ? Uo(e, t2) : Ma(e, t2);
      }
      n(qo, "WritableStreamDefaultWriterEnsureReadyPromiseRejected");
      function Wa(e) {
        const t2 = e._ownerWritableStream, r = t2._state;
        return r === "errored" || r === "erroring" ? null : r === "closed" ? 0 : jo(t2._writableStreamController);
      }
      n(Wa, "WritableStreamDefaultWriterGetDesiredSize");
      function Oo(e) {
        const t2 = e._ownerWritableStream, r = new TypeError("Writer was released and can no longer be used to monitor the stream's closedness");
        qo(e, r), ka(e, r), t2._writer = void 0, e._ownerWritableStream = void 0;
      }
      n(Oo, "WritableStreamDefaultWriterRelease");
      function zo(e, t2) {
        const r = e._ownerWritableStream, s2 = r._writableStreamController, l2 = za(s2, t2);
        if (r !== e._ownerWritableStream)
          return m(Tt("write to"));
        const c = r._state;
        if (c === "errored")
          return m(r._storedError);
        if (he(r) || c === "closed")
          return m(new TypeError("The stream is closing or closed and cannot be written to"));
        if (c === "erroring")
          return m(r._storedError);
        const h2 = Sa(r);
        return Ia(s2, t2, l2), h2;
      }
      n(zo, "WritableStreamDefaultWriterWrite");
      const Io = {}, _n = class _n {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        get abortReason() {
          if (!Jr(this))
            throw en("abortReason");
          return this._abortReason;
        }
        get signal() {
          if (!Jr(this))
            throw en("signal");
          if (this._abortController === void 0)
            throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
          return this._abortController.signal;
        }
        error(t2 = void 0) {
          if (!Jr(this))
            throw en("error");
          this._controlledWritableStream._state === "writable" && Lo(this, t2);
        }
        [xn](t2) {
          const r = this._abortAlgorithm(t2);
          return Jt(this), r;
        }
        [Nn]() {
          Be(this);
        }
      };
      n(_n, "WritableStreamDefaultController");
      let ke = _n;
      Object.defineProperties(ke.prototype, { abortReason: { enumerable: true }, signal: { enumerable: true }, error: { enumerable: true } }), typeof u.toStringTag == "symbol" && Object.defineProperty(ke.prototype, u.toStringTag, { value: "WritableStreamDefaultController", configurable: true });
      function Jr(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_controlledWritableStream") ? false : e instanceof ke;
      }
      n(Jr, "IsWritableStreamDefaultController");
      function Fo(e, t2, r, s2, l2, c, h2, y) {
        t2._controlledWritableStream = e, e._writableStreamController = t2, t2._queue = void 0, t2._queueTotalSize = void 0, Be(t2), t2._abortReason = void 0, t2._abortController = ga(), t2._started = false, t2._strategySizeAlgorithm = y, t2._strategyHWM = h2, t2._writeAlgorithm = s2, t2._closeAlgorithm = l2, t2._abortAlgorithm = c;
        const T = Xr(t2);
        Kr(e, T);
        const g2 = r(), C = S(g2);
        q(C, () => (t2._started = true, Xt(t2), null), (P) => (t2._started = true, Yr(e, P), null));
      }
      n(Fo, "SetUpWritableStreamDefaultController");
      function qa(e, t2, r, s2) {
        const l2 = Object.create(ke.prototype);
        let c, h2, y, T;
        t2.start !== void 0 ? c = n(() => t2.start(l2), "startAlgorithm") : c = n(() => {
        }, "startAlgorithm"), t2.write !== void 0 ? h2 = n((g2) => t2.write(g2, l2), "writeAlgorithm") : h2 = n(() => S(void 0), "writeAlgorithm"), t2.close !== void 0 ? y = n(() => t2.close(), "closeAlgorithm") : y = n(() => S(void 0), "closeAlgorithm"), t2.abort !== void 0 ? T = n((g2) => t2.abort(g2), "abortAlgorithm") : T = n(() => S(void 0), "abortAlgorithm"), Fo(e, l2, c, h2, y, T, r, s2);
      }
      n(qa, "SetUpWritableStreamDefaultControllerFromUnderlyingSink");
      function Jt(e) {
        e._writeAlgorithm = void 0, e._closeAlgorithm = void 0, e._abortAlgorithm = void 0, e._strategySizeAlgorithm = void 0;
      }
      n(Jt, "WritableStreamDefaultControllerClearAlgorithms");
      function Oa(e) {
        Dr(e, Io, 0), Xt(e);
      }
      n(Oa, "WritableStreamDefaultControllerClose");
      function za(e, t2) {
        try {
          return e._strategySizeAlgorithm(t2);
        } catch (r) {
          return Rt(e, r), 1;
        }
      }
      n(za, "WritableStreamDefaultControllerGetChunkSize");
      function jo(e) {
        return e._strategyHWM - e._queueTotalSize;
      }
      n(jo, "WritableStreamDefaultControllerGetDesiredSize");
      function Ia(e, t2, r) {
        try {
          Dr(e, t2, r);
        } catch (l2) {
          Rt(e, l2);
          return;
        }
        const s2 = e._controlledWritableStream;
        if (!he(s2) && s2._state === "writable") {
          const l2 = Xr(e);
          Kr(s2, l2);
        }
        Xt(e);
      }
      n(Ia, "WritableStreamDefaultControllerWrite");
      function Xt(e) {
        const t2 = e._controlledWritableStream;
        if (!e._started || t2._inFlightWriteRequest !== void 0)
          return;
        if (t2._state === "erroring") {
          Zr(t2);
          return;
        }
        if (e._queue.length === 0)
          return;
        const s2 = Gi(e);
        s2 === Io ? Fa(e) : ja(e, s2);
      }
      n(Xt, "WritableStreamDefaultControllerAdvanceQueueIfNeeded");
      function Rt(e, t2) {
        e._controlledWritableStream._state === "writable" && Lo(e, t2);
      }
      n(Rt, "WritableStreamDefaultControllerErrorIfNeeded");
      function Fa(e) {
        const t2 = e._controlledWritableStream;
        va(t2), $r(e);
        const r = e._closeAlgorithm();
        Jt(e), q(r, () => (Ta(t2), null), (s2) => (Ca(t2, s2), null));
      }
      n(Fa, "WritableStreamDefaultControllerProcessClose");
      function ja(e, t2) {
        const r = e._controlledWritableStream;
        Ea(r);
        const s2 = e._writeAlgorithm(t2);
        q(s2, () => {
          wa(r);
          const l2 = r._state;
          if ($r(e), !he(r) && l2 === "writable") {
            const c = Xr(e);
            Kr(r, c);
          }
          return Xt(e), null;
        }, (l2) => (r._state === "writable" && Jt(e), Ra(r, l2), null));
      }
      n(ja, "WritableStreamDefaultControllerProcessWrite");
      function Xr(e) {
        return jo(e) <= 0;
      }
      n(Xr, "WritableStreamDefaultControllerGetBackpressure");
      function Lo(e, t2) {
        const r = e._controlledWritableStream;
        Jt(e), Gr(r, t2);
      }
      n(Lo, "WritableStreamDefaultControllerError");
      function er(e) {
        return new TypeError(`WritableStream.prototype.${e} can only be used on a WritableStream`);
      }
      n(er, "streamBrandCheckException$2");
      function en(e) {
        return new TypeError(`WritableStreamDefaultController.prototype.${e} can only be used on a WritableStreamDefaultController`);
      }
      n(en, "defaultControllerBrandCheckException$2");
      function Le(e) {
        return new TypeError(`WritableStreamDefaultWriter.prototype.${e} can only be used on a WritableStreamDefaultWriter`);
      }
      n(Le, "defaultWriterBrandCheckException");
      function Tt(e) {
        return new TypeError("Cannot " + e + " a stream using a released writer");
      }
      n(Tt, "defaultWriterLockException");
      function tr(e) {
        e._closedPromise = A2((t2, r) => {
          e._closedPromise_resolve = t2, e._closedPromise_reject = r, e._closedPromiseState = "pending";
        });
      }
      n(tr, "defaultWriterClosedPromiseInitialize");
      function $o(e, t2) {
        tr(e), tn(e, t2);
      }
      n($o, "defaultWriterClosedPromiseInitializeAsRejected");
      function La(e) {
        tr(e), Do(e);
      }
      n(La, "defaultWriterClosedPromiseInitializeAsResolved");
      function tn(e, t2) {
        e._closedPromise_reject !== void 0 && (ve(e._closedPromise), e._closedPromise_reject(t2), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0, e._closedPromiseState = "rejected");
      }
      n(tn, "defaultWriterClosedPromiseReject");
      function $a(e, t2) {
        $o(e, t2);
      }
      n($a, "defaultWriterClosedPromiseResetToRejected");
      function Do(e) {
        e._closedPromise_resolve !== void 0 && (e._closedPromise_resolve(void 0), e._closedPromise_resolve = void 0, e._closedPromise_reject = void 0, e._closedPromiseState = "resolved");
      }
      n(Do, "defaultWriterClosedPromiseResolve");
      function rr(e) {
        e._readyPromise = A2((t2, r) => {
          e._readyPromise_resolve = t2, e._readyPromise_reject = r;
        }), e._readyPromiseState = "pending";
      }
      n(rr, "defaultWriterReadyPromiseInitialize");
      function rn(e, t2) {
        rr(e), Uo(e, t2);
      }
      n(rn, "defaultWriterReadyPromiseInitializeAsRejected");
      function Mo(e) {
        rr(e), nn(e);
      }
      n(Mo, "defaultWriterReadyPromiseInitializeAsResolved");
      function Uo(e, t2) {
        e._readyPromise_reject !== void 0 && (ve(e._readyPromise), e._readyPromise_reject(t2), e._readyPromise_resolve = void 0, e._readyPromise_reject = void 0, e._readyPromiseState = "rejected");
      }
      n(Uo, "defaultWriterReadyPromiseReject");
      function Da(e) {
        rr(e);
      }
      n(Da, "defaultWriterReadyPromiseReset");
      function Ma(e, t2) {
        rn(e, t2);
      }
      n(Ma, "defaultWriterReadyPromiseResetToRejected");
      function nn(e) {
        e._readyPromise_resolve !== void 0 && (e._readyPromise_resolve(void 0), e._readyPromise_resolve = void 0, e._readyPromise_reject = void 0, e._readyPromiseState = "fulfilled");
      }
      n(nn, "defaultWriterReadyPromiseResolve");
      function Ua() {
        if (typeof globalThis < "u")
          return globalThis;
        if (typeof self < "u")
          return self;
        if (typeof n$1 < "u")
          return n$1;
      }
      n(Ua, "getGlobals");
      const on = Ua();
      function xa(e) {
        if (!(typeof e == "function" || typeof e == "object") || e.name !== "DOMException")
          return false;
        try {
          return new e(), true;
        } catch {
          return false;
        }
      }
      n(xa, "isDOMExceptionConstructor");
      function Na() {
        const e = on == null ? void 0 : on.DOMException;
        return xa(e) ? e : void 0;
      }
      n(Na, "getFromGlobal");
      function Ha() {
        const e = n(function(r, s2) {
          this.message = r || "", this.name = s2 || "Error", Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
        }, "DOMException");
        return p(e, "DOMException"), e.prototype = Object.create(Error.prototype), Object.defineProperty(e.prototype, "constructor", { value: e, writable: true, configurable: true }), e;
      }
      n(Ha, "createPolyfill");
      const Va = Na() || Ha();
      function xo(e, t2, r, s2, l2, c) {
        const h2 = Qe(e), y = Ao(t2);
        e._disturbed = true;
        let T = false, g2 = S(void 0);
        return A2((C, P) => {
          let B;
          if (c !== void 0) {
            if (B = n(() => {
              const _ = c.reason !== void 0 ? c.reason : new Va("Aborted", "AbortError"), v = [];
              s2 || v.push(() => t2._state === "writable" ? Zt(t2, _) : S(void 0)), l2 || v.push(() => e._state === "readable" ? ie(e, _) : S(void 0)), H(() => Promise.all(v.map((k) => k())), true, _);
            }, "abortAlgorithm"), c.aborted) {
              B();
              return;
            }
            c.addEventListener("abort", B);
          }
          function ae() {
            return A2((_, v) => {
              function k(Y) {
                Y ? _() : R(nt(), k, v);
              }
              n(k, "next"), k(false);
            });
          }
          n(ae, "pipeLoop");
          function nt() {
            return T ? S(true) : R(y._readyPromise, () => A2((_, v) => {
              yt(h2, { _chunkSteps: (k) => {
                g2 = R(zo(y, k), void 0, f2), _(false);
              }, _closeSteps: () => _(true), _errorSteps: v });
            }));
          }
          if (n(nt, "pipeStep"), Re(e, h2._closedPromise, (_) => (s2 ? J(true, _) : H(() => Zt(t2, _), true, _), null)), Re(t2, y._closedPromise, (_) => (l2 ? J(true, _) : H(() => ie(e, _), true, _), null)), N(e, h2._closedPromise, () => (r ? J() : H(() => Ba(y)), null)), he(t2) || t2._state === "closed") {
            const _ = new TypeError("the destination writable stream closed before all data could be piped to it");
            l2 ? J(true, _) : H(() => ie(e, _), true, _);
          }
          ve(ae());
          function Oe() {
            const _ = g2;
            return R(g2, () => _ !== g2 ? Oe() : void 0);
          }
          n(Oe, "waitForWritesToFinish");
          function Re(_, v, k) {
            _._state === "errored" ? k(_._storedError) : Q(v, k);
          }
          n(Re, "isOrBecomesErrored");
          function N(_, v, k) {
            _._state === "closed" ? k() : F(v, k);
          }
          n(N, "isOrBecomesClosed");
          function H(_, v, k) {
            if (T)
              return;
            T = true, t2._state === "writable" && !he(t2) ? F(Oe(), Y) : Y();
            function Y() {
              return q(_(), () => Te(v, k), (ot) => Te(true, ot)), null;
            }
            n(Y, "doTheRest");
          }
          n(H, "shutdownWithAction");
          function J(_, v) {
            T || (T = true, t2._state === "writable" && !he(t2) ? F(Oe(), () => Te(_, v)) : Te(_, v));
          }
          n(J, "shutdown");
          function Te(_, v) {
            return Oo(y), ge(h2), c !== void 0 && c.removeEventListener("abort", B), _ ? P(v) : C(void 0), null;
          }
          n(Te, "finalize");
        });
      }
      n(xo, "ReadableStreamPipeTo");
      const Sn = class Sn {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        get desiredSize() {
          if (!nr(this))
            throw ir("desiredSize");
          return an(this);
        }
        close() {
          if (!nr(this))
            throw ir("close");
          if (!Je(this))
            throw new TypeError("The stream is not in a state that permits close");
          $e(this);
        }
        enqueue(t2 = void 0) {
          if (!nr(this))
            throw ir("enqueue");
          if (!Je(this))
            throw new TypeError("The stream is not in a state that permits enqueue");
          return Ke(this, t2);
        }
        error(t2 = void 0) {
          if (!nr(this))
            throw ir("error");
          oe(this, t2);
        }
        [Ar](t2) {
          Be(this);
          const r = this._cancelAlgorithm(t2);
          return or(this), r;
        }
        [Br](t2) {
          const r = this._controlledReadableStream;
          if (this._queue.length > 0) {
            const s2 = $r(this);
            this._closeRequested && this._queue.length === 0 ? (or(this), vt(r)) : Ct(this), t2._chunkSteps(s2);
          } else
            Kn(r, t2), Ct(this);
        }
        [kr]() {
        }
      };
      n(Sn, "ReadableStreamDefaultController");
      let ne = Sn;
      Object.defineProperties(ne.prototype, { close: { enumerable: true }, enqueue: { enumerable: true }, error: { enumerable: true }, desiredSize: { enumerable: true } }), p(ne.prototype.close, "close"), p(ne.prototype.enqueue, "enqueue"), p(ne.prototype.error, "error"), typeof u.toStringTag == "symbol" && Object.defineProperty(ne.prototype, u.toStringTag, { value: "ReadableStreamDefaultController", configurable: true });
      function nr(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_controlledReadableStream") ? false : e instanceof ne;
      }
      n(nr, "IsReadableStreamDefaultController");
      function Ct(e) {
        if (!No(e))
          return;
        if (e._pulling) {
          e._pullAgain = true;
          return;
        }
        e._pulling = true;
        const r = e._pullAlgorithm();
        q(r, () => (e._pulling = false, e._pullAgain && (e._pullAgain = false, Ct(e)), null), (s2) => (oe(e, s2), null));
      }
      n(Ct, "ReadableStreamDefaultControllerCallPullIfNeeded");
      function No(e) {
        const t2 = e._controlledReadableStream;
        return !Je(e) || !e._started ? false : !!(qe(t2) && Lt(t2) > 0 || an(e) > 0);
      }
      n(No, "ReadableStreamDefaultControllerShouldCallPull");
      function or(e) {
        e._pullAlgorithm = void 0, e._cancelAlgorithm = void 0, e._strategySizeAlgorithm = void 0;
      }
      n(or, "ReadableStreamDefaultControllerClearAlgorithms");
      function $e(e) {
        if (!Je(e))
          return;
        const t2 = e._controlledReadableStream;
        e._closeRequested = true, e._queue.length === 0 && (or(e), vt(t2));
      }
      n($e, "ReadableStreamDefaultControllerClose");
      function Ke(e, t2) {
        if (!Je(e))
          return;
        const r = e._controlledReadableStream;
        if (qe(r) && Lt(r) > 0)
          Lr(r, t2, false);
        else {
          let s2;
          try {
            s2 = e._strategySizeAlgorithm(t2);
          } catch (l2) {
            throw oe(e, l2), l2;
          }
          try {
            Dr(e, t2, s2);
          } catch (l2) {
            throw oe(e, l2), l2;
          }
        }
        Ct(e);
      }
      n(Ke, "ReadableStreamDefaultControllerEnqueue");
      function oe(e, t2) {
        const r = e._controlledReadableStream;
        r._state === "readable" && (Be(e), or(e), Yo(r, t2));
      }
      n(oe, "ReadableStreamDefaultControllerError");
      function an(e) {
        const t2 = e._controlledReadableStream._state;
        return t2 === "errored" ? null : t2 === "closed" ? 0 : e._strategyHWM - e._queueTotalSize;
      }
      n(an, "ReadableStreamDefaultControllerGetDesiredSize");
      function Qa(e) {
        return !No(e);
      }
      n(Qa, "ReadableStreamDefaultControllerHasBackpressure");
      function Je(e) {
        const t2 = e._controlledReadableStream._state;
        return !e._closeRequested && t2 === "readable";
      }
      n(Je, "ReadableStreamDefaultControllerCanCloseOrEnqueue");
      function Ho(e, t2, r, s2, l2, c, h2) {
        t2._controlledReadableStream = e, t2._queue = void 0, t2._queueTotalSize = void 0, Be(t2), t2._started = false, t2._closeRequested = false, t2._pullAgain = false, t2._pulling = false, t2._strategySizeAlgorithm = h2, t2._strategyHWM = c, t2._pullAlgorithm = s2, t2._cancelAlgorithm = l2, e._readableStreamController = t2;
        const y = r();
        q(S(y), () => (t2._started = true, Ct(t2), null), (T) => (oe(t2, T), null));
      }
      n(Ho, "SetUpReadableStreamDefaultController");
      function Ya(e, t2, r, s2) {
        const l2 = Object.create(ne.prototype);
        let c, h2, y;
        t2.start !== void 0 ? c = n(() => t2.start(l2), "startAlgorithm") : c = n(() => {
        }, "startAlgorithm"), t2.pull !== void 0 ? h2 = n(() => t2.pull(l2), "pullAlgorithm") : h2 = n(() => S(void 0), "pullAlgorithm"), t2.cancel !== void 0 ? y = n((T) => t2.cancel(T), "cancelAlgorithm") : y = n(() => S(void 0), "cancelAlgorithm"), Ho(e, l2, c, h2, y, r, s2);
      }
      n(Ya, "SetUpReadableStreamDefaultControllerFromUnderlyingSource");
      function ir(e) {
        return new TypeError(`ReadableStreamDefaultController.prototype.${e} can only be used on a ReadableStreamDefaultController`);
      }
      n(ir, "defaultControllerBrandCheckException$1");
      function Ga(e, t2) {
        return ze(e._readableStreamController) ? Ka(e) : Za(e);
      }
      n(Ga, "ReadableStreamTee");
      function Za(e, t2) {
        const r = Qe(e);
        let s2 = false, l2 = false, c = false, h2 = false, y, T, g2, C, P;
        const B = A2((N) => {
          P = N;
        });
        function ae() {
          return s2 ? (l2 = true, S(void 0)) : (s2 = true, yt(r, { _chunkSteps: (H) => {
            z(() => {
              l2 = false;
              const J = H, Te = H;
              c || Ke(g2._readableStreamController, J), h2 || Ke(C._readableStreamController, Te), s2 = false, l2 && ae();
            });
          }, _closeSteps: () => {
            s2 = false, c || $e(g2._readableStreamController), h2 || $e(C._readableStreamController), (!c || !h2) && P(void 0);
          }, _errorSteps: () => {
            s2 = false;
          } }), S(void 0));
        }
        n(ae, "pullAlgorithm");
        function nt(N) {
          if (c = true, y = N, h2) {
            const H = gt([y, T]), J = ie(e, H);
            P(J);
          }
          return B;
        }
        n(nt, "cancel1Algorithm");
        function Oe(N) {
          if (h2 = true, T = N, c) {
            const H = gt([y, T]), J = ie(e, H);
            P(J);
          }
          return B;
        }
        n(Oe, "cancel2Algorithm");
        function Re() {
        }
        return n(Re, "startAlgorithm"), g2 = Pt(Re, ae, nt), C = Pt(Re, ae, Oe), Q(r._closedPromise, (N) => (oe(g2._readableStreamController, N), oe(C._readableStreamController, N), (!c || !h2) && P(void 0), null)), [g2, C];
      }
      n(Za, "ReadableStreamDefaultTee");
      function Ka(e) {
        let t2 = Qe(e), r = false, s2 = false, l2 = false, c = false, h2 = false, y, T, g2, C, P;
        const B = A2((_) => {
          P = _;
        });
        function ae(_) {
          Q(_._closedPromise, (v) => (_ !== t2 || (K(g2._readableStreamController, v), K(C._readableStreamController, v), (!c || !h2) && P(void 0)), null));
        }
        n(ae, "forwardReaderError");
        function nt() {
          Fe(t2) && (ge(t2), t2 = Qe(e), ae(t2)), yt(t2, { _chunkSteps: (v) => {
            z(() => {
              s2 = false, l2 = false;
              const k = v;
              let Y = v;
              if (!c && !h2)
                try {
                  Y = uo(v);
                } catch (ot) {
                  K(g2._readableStreamController, ot), K(C._readableStreamController, ot), P(ie(e, ot));
                  return;
                }
              c || Nt(g2._readableStreamController, k), h2 || Nt(C._readableStreamController, Y), r = false, s2 ? Re() : l2 && N();
            });
          }, _closeSteps: () => {
            r = false, c || _t(g2._readableStreamController), h2 || _t(C._readableStreamController), g2._readableStreamController._pendingPullIntos.length > 0 && Ht(g2._readableStreamController, 0), C._readableStreamController._pendingPullIntos.length > 0 && Ht(C._readableStreamController, 0), (!c || !h2) && P(void 0);
          }, _errorSteps: () => {
            r = false;
          } });
        }
        n(nt, "pullWithDefaultReader");
        function Oe(_, v) {
          Ee(t2) && (ge(t2), t2 = Ro(e), ae(t2));
          const k = v ? C : g2, Y = v ? g2 : C;
          Po(t2, _, 1, { _chunkSteps: (it) => {
            z(() => {
              s2 = false, l2 = false;
              const at = v ? h2 : c;
              if (v ? c : h2)
                at || Vt(k._readableStreamController, it);
              else {
                let si;
                try {
                  si = uo(it);
                } catch (vn) {
                  K(k._readableStreamController, vn), K(Y._readableStreamController, vn), P(ie(e, vn));
                  return;
                }
                at || Vt(k._readableStreamController, it), Nt(Y._readableStreamController, si);
              }
              r = false, s2 ? Re() : l2 && N();
            });
          }, _closeSteps: (it) => {
            r = false;
            const at = v ? h2 : c, fr = v ? c : h2;
            at || _t(k._readableStreamController), fr || _t(Y._readableStreamController), it !== void 0 && (at || Vt(k._readableStreamController, it), !fr && Y._readableStreamController._pendingPullIntos.length > 0 && Ht(Y._readableStreamController, 0)), (!at || !fr) && P(void 0);
          }, _errorSteps: () => {
            r = false;
          } });
        }
        n(Oe, "pullWithBYOBReader");
        function Re() {
          if (r)
            return s2 = true, S(void 0);
          r = true;
          const _ = Hr(g2._readableStreamController);
          return _ === null ? nt() : Oe(_._view, false), S(void 0);
        }
        n(Re, "pull1Algorithm");
        function N() {
          if (r)
            return l2 = true, S(void 0);
          r = true;
          const _ = Hr(C._readableStreamController);
          return _ === null ? nt() : Oe(_._view, true), S(void 0);
        }
        n(N, "pull2Algorithm");
        function H(_) {
          if (c = true, y = _, h2) {
            const v = gt([y, T]), k = ie(e, v);
            P(k);
          }
          return B;
        }
        n(H, "cancel1Algorithm");
        function J(_) {
          if (h2 = true, T = _, c) {
            const v = gt([y, T]), k = ie(e, v);
            P(k);
          }
          return B;
        }
        n(J, "cancel2Algorithm");
        function Te() {
        }
        return n(Te, "startAlgorithm"), g2 = Qo(Te, Re, H), C = Qo(Te, N, J), ae(t2), [g2, C];
      }
      n(Ka, "ReadableByteStreamTee");
      function Ja(e) {
        return d2(e) && typeof e.getReader < "u";
      }
      n(Ja, "isReadableStreamLike");
      function Xa(e) {
        return Ja(e) ? ts(e.getReader()) : es(e);
      }
      n(Xa, "ReadableStreamFrom");
      function es(e) {
        let t2;
        const r = so(e, "async"), s2 = f2;
        function l2() {
          let h2;
          try {
            h2 = Hi(r);
          } catch (T) {
            return m(T);
          }
          const y = S(h2);
          return M(y, (T) => {
            if (!d2(T))
              throw new TypeError("The promise returned by the iterator.next() method must fulfill with an object");
            if (Vi(T))
              $e(t2._readableStreamController);
            else {
              const C = Qi(T);
              Ke(t2._readableStreamController, C);
            }
          });
        }
        n(l2, "pullAlgorithm");
        function c(h2) {
          const y = r.iterator;
          let T;
          try {
            T = Mt(y, "return");
          } catch (P) {
            return m(P);
          }
          if (T === void 0)
            return S(void 0);
          let g2;
          try {
            g2 = j(T, y, [h2]);
          } catch (P) {
            return m(P);
          }
          const C = S(g2);
          return M(C, (P) => {
            if (!d2(P))
              throw new TypeError("The promise returned by the iterator.return() method must fulfill with an object");
          });
        }
        return n(c, "cancelAlgorithm"), t2 = Pt(s2, l2, c, 0), t2;
      }
      n(es, "ReadableStreamFromIterable");
      function ts(e) {
        let t2;
        const r = f2;
        function s2() {
          let c;
          try {
            c = e.read();
          } catch (h2) {
            return m(h2);
          }
          return M(c, (h2) => {
            if (!d2(h2))
              throw new TypeError("The promise returned by the reader.read() method must fulfill with an object");
            if (h2.done)
              $e(t2._readableStreamController);
            else {
              const y = h2.value;
              Ke(t2._readableStreamController, y);
            }
          });
        }
        n(s2, "pullAlgorithm");
        function l2(c) {
          try {
            return S(e.cancel(c));
          } catch (h2) {
            return m(h2);
          }
        }
        return n(l2, "cancelAlgorithm"), t2 = Pt(r, s2, l2, 0), t2;
      }
      n(ts, "ReadableStreamFromDefaultReader");
      function rs(e, t2) {
        le(e, t2);
        const r = e, s2 = r == null ? void 0 : r.autoAllocateChunkSize, l2 = r == null ? void 0 : r.cancel, c = r == null ? void 0 : r.pull, h2 = r == null ? void 0 : r.start, y = r == null ? void 0 : r.type;
        return { autoAllocateChunkSize: s2 === void 0 ? void 0 : Fr(s2, `${t2} has member 'autoAllocateChunkSize' that`), cancel: l2 === void 0 ? void 0 : ns(l2, r, `${t2} has member 'cancel' that`), pull: c === void 0 ? void 0 : os(c, r, `${t2} has member 'pull' that`), start: h2 === void 0 ? void 0 : is(h2, r, `${t2} has member 'start' that`), type: y === void 0 ? void 0 : as(y, `${t2} has member 'type' that`) };
      }
      n(rs, "convertUnderlyingDefaultOrByteSource");
      function ns(e, t2, r) {
        return Z(e, r), (s2) => I(e, t2, [s2]);
      }
      n(ns, "convertUnderlyingSourceCancelCallback");
      function os(e, t2, r) {
        return Z(e, r), (s2) => I(e, t2, [s2]);
      }
      n(os, "convertUnderlyingSourcePullCallback");
      function is(e, t2, r) {
        return Z(e, r), (s2) => j(e, t2, [s2]);
      }
      n(is, "convertUnderlyingSourceStartCallback");
      function as(e, t2) {
        if (e = `${e}`, e !== "bytes")
          throw new TypeError(`${t2} '${e}' is not a valid enumeration value for ReadableStreamType`);
        return e;
      }
      n(as, "convertReadableStreamType");
      function ss(e, t2) {
        return le(e, t2), { preventCancel: !!(e == null ? void 0 : e.preventCancel) };
      }
      n(ss, "convertIteratorOptions");
      function Vo(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.preventAbort, s2 = e == null ? void 0 : e.preventCancel, l2 = e == null ? void 0 : e.preventClose, c = e == null ? void 0 : e.signal;
        return c !== void 0 && us(c, `${t2} has member 'signal' that`), { preventAbort: !!r, preventCancel: !!s2, preventClose: !!l2, signal: c };
      }
      n(Vo, "convertPipeOptions");
      function us(e, t2) {
        if (!ma(e))
          throw new TypeError(`${t2} is not an AbortSignal.`);
      }
      n(us, "assertAbortSignal");
      function ls(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.readable;
        zr(r, "readable", "ReadableWritablePair"), jr(r, `${t2} has member 'readable' that`);
        const s2 = e == null ? void 0 : e.writable;
        return zr(s2, "writable", "ReadableWritablePair"), Eo(s2, `${t2} has member 'writable' that`), { readable: r, writable: s2 };
      }
      n(ls, "convertReadableWritablePair");
      const wn = class wn {
        constructor(t2 = {}, r = {}) {
          t2 === void 0 ? t2 = null : Gn(t2, "First parameter");
          const s2 = Gt(r, "Second parameter"), l2 = rs(t2, "First parameter");
          if (sn(this), l2.type === "bytes") {
            if (s2.size !== void 0)
              throw new RangeError("The strategy for a byte stream cannot have a size function");
            const c = wt(s2, 0);
            na(this, l2, c);
          } else {
            const c = Yt(s2), h2 = wt(s2, 1);
            Ya(this, l2, h2, c);
          }
        }
        get locked() {
          if (!We(this))
            throw De("locked");
          return qe(this);
        }
        cancel(t2 = void 0) {
          return We(this) ? qe(this) ? m(new TypeError("Cannot cancel a stream that already has a reader")) : ie(this, t2) : m(De("cancel"));
        }
        getReader(t2 = void 0) {
          if (!We(this))
            throw De("getReader");
          return ia(t2, "First parameter").mode === void 0 ? Qe(this) : Ro(this);
        }
        pipeThrough(t2, r = {}) {
          if (!We(this))
            throw De("pipeThrough");
          _e(t2, 1, "pipeThrough");
          const s2 = ls(t2, "First parameter"), l2 = Vo(r, "Second parameter");
          if (qe(this))
            throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
          if (Ze(s2.writable))
            throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
          const c = xo(this, s2.writable, l2.preventClose, l2.preventAbort, l2.preventCancel, l2.signal);
          return ve(c), s2.readable;
        }
        pipeTo(t2, r = {}) {
          if (!We(this))
            return m(De("pipeTo"));
          if (t2 === void 0)
            return m("Parameter 1 is required in 'pipeTo'.");
          if (!Ge(t2))
            return m(new TypeError("ReadableStream.prototype.pipeTo's first argument must be a WritableStream"));
          let s2;
          try {
            s2 = Vo(r, "Second parameter");
          } catch (l2) {
            return m(l2);
          }
          return qe(this) ? m(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream")) : Ze(t2) ? m(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream")) : xo(this, t2, s2.preventClose, s2.preventAbort, s2.preventCancel, s2.signal);
        }
        tee() {
          if (!We(this))
            throw De("tee");
          const t2 = Ga(this);
          return gt(t2);
        }
        values(t2 = void 0) {
          if (!We(this))
            throw De("values");
          const r = ss(t2, "First parameter");
          return xi(this, r.preventCancel);
        }
        static from(t2) {
          return Xa(t2);
        }
      };
      n(wn, "ReadableStream");
      let L = wn;
      Object.defineProperties(L, { from: { enumerable: true } }), Object.defineProperties(L.prototype, { cancel: { enumerable: true }, getReader: { enumerable: true }, pipeThrough: { enumerable: true }, pipeTo: { enumerable: true }, tee: { enumerable: true }, values: { enumerable: true }, locked: { enumerable: true } }), p(L.from, "from"), p(L.prototype.cancel, "cancel"), p(L.prototype.getReader, "getReader"), p(L.prototype.pipeThrough, "pipeThrough"), p(L.prototype.pipeTo, "pipeTo"), p(L.prototype.tee, "tee"), p(L.prototype.values, "values"), typeof u.toStringTag == "symbol" && Object.defineProperty(L.prototype, u.toStringTag, { value: "ReadableStream", configurable: true }), typeof u.asyncIterator == "symbol" && Object.defineProperty(L.prototype, u.asyncIterator, { value: L.prototype.values, writable: true, configurable: true });
      function Pt(e, t2, r, s2 = 1, l2 = () => 1) {
        const c = Object.create(L.prototype);
        sn(c);
        const h2 = Object.create(ne.prototype);
        return Ho(c, h2, e, t2, r, s2, l2), c;
      }
      n(Pt, "CreateReadableStream");
      function Qo(e, t2, r) {
        const s2 = Object.create(L.prototype);
        sn(s2);
        const l2 = Object.create(te.prototype);
        return wo(s2, l2, e, t2, r, 0, void 0), s2;
      }
      n(Qo, "CreateReadableByteStream");
      function sn(e) {
        e._state = "readable", e._reader = void 0, e._storedError = void 0, e._disturbed = false;
      }
      n(sn, "InitializeReadableStream");
      function We(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_readableStreamController") ? false : e instanceof L;
      }
      n(We, "IsReadableStream");
      function qe(e) {
        return e._reader !== void 0;
      }
      n(qe, "IsReadableStreamLocked");
      function ie(e, t2) {
        if (e._disturbed = true, e._state === "closed")
          return S(void 0);
        if (e._state === "errored")
          return m(e._storedError);
        vt(e);
        const r = e._reader;
        if (r !== void 0 && Fe(r)) {
          const l2 = r._readIntoRequests;
          r._readIntoRequests = new U(), l2.forEach((c) => {
            c._closeSteps(void 0);
          });
        }
        const s2 = e._readableStreamController[Ar](t2);
        return M(s2, f2);
      }
      n(ie, "ReadableStreamCancel");
      function vt(e) {
        e._state = "closed";
        const t2 = e._reader;
        if (t2 !== void 0 && (Qn(t2), Ee(t2))) {
          const r = t2._readRequests;
          t2._readRequests = new U(), r.forEach((s2) => {
            s2._closeSteps();
          });
        }
      }
      n(vt, "ReadableStreamClose");
      function Yo(e, t2) {
        e._state = "errored", e._storedError = t2;
        const r = e._reader;
        r !== void 0 && (Or(r, t2), Ee(r) ? Xn(r, t2) : vo(r, t2));
      }
      n(Yo, "ReadableStreamError");
      function De(e) {
        return new TypeError(`ReadableStream.prototype.${e} can only be used on a ReadableStream`);
      }
      n(De, "streamBrandCheckException$1");
      function Go(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.highWaterMark;
        return zr(r, "highWaterMark", "QueuingStrategyInit"), { highWaterMark: Ir(r) };
      }
      n(Go, "convertQueuingStrategyInit");
      const Zo = n((e) => e.byteLength, "byteLengthSizeFunction");
      p(Zo, "size");
      const Rn = class Rn {
        constructor(t2) {
          _e(t2, 1, "ByteLengthQueuingStrategy"), t2 = Go(t2, "First parameter"), this._byteLengthQueuingStrategyHighWaterMark = t2.highWaterMark;
        }
        get highWaterMark() {
          if (!Jo(this))
            throw Ko("highWaterMark");
          return this._byteLengthQueuingStrategyHighWaterMark;
        }
        get size() {
          if (!Jo(this))
            throw Ko("size");
          return Zo;
        }
      };
      n(Rn, "ByteLengthQueuingStrategy");
      let Xe = Rn;
      Object.defineProperties(Xe.prototype, { highWaterMark: { enumerable: true }, size: { enumerable: true } }), typeof u.toStringTag == "symbol" && Object.defineProperty(Xe.prototype, u.toStringTag, { value: "ByteLengthQueuingStrategy", configurable: true });
      function Ko(e) {
        return new TypeError(`ByteLengthQueuingStrategy.prototype.${e} can only be used on a ByteLengthQueuingStrategy`);
      }
      n(Ko, "byteLengthBrandCheckException");
      function Jo(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_byteLengthQueuingStrategyHighWaterMark") ? false : e instanceof Xe;
      }
      n(Jo, "IsByteLengthQueuingStrategy");
      const Xo = n(() => 1, "countSizeFunction");
      p(Xo, "size");
      const Tn = class Tn {
        constructor(t2) {
          _e(t2, 1, "CountQueuingStrategy"), t2 = Go(t2, "First parameter"), this._countQueuingStrategyHighWaterMark = t2.highWaterMark;
        }
        get highWaterMark() {
          if (!ti(this))
            throw ei("highWaterMark");
          return this._countQueuingStrategyHighWaterMark;
        }
        get size() {
          if (!ti(this))
            throw ei("size");
          return Xo;
        }
      };
      n(Tn, "CountQueuingStrategy");
      let et = Tn;
      Object.defineProperties(et.prototype, { highWaterMark: { enumerable: true }, size: { enumerable: true } }), typeof u.toStringTag == "symbol" && Object.defineProperty(et.prototype, u.toStringTag, { value: "CountQueuingStrategy", configurable: true });
      function ei(e) {
        return new TypeError(`CountQueuingStrategy.prototype.${e} can only be used on a CountQueuingStrategy`);
      }
      n(ei, "countBrandCheckException");
      function ti(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_countQueuingStrategyHighWaterMark") ? false : e instanceof et;
      }
      n(ti, "IsCountQueuingStrategy");
      function fs(e, t2) {
        le(e, t2);
        const r = e == null ? void 0 : e.cancel, s2 = e == null ? void 0 : e.flush, l2 = e == null ? void 0 : e.readableType, c = e == null ? void 0 : e.start, h2 = e == null ? void 0 : e.transform, y = e == null ? void 0 : e.writableType;
        return { cancel: r === void 0 ? void 0 : ps(r, e, `${t2} has member 'cancel' that`), flush: s2 === void 0 ? void 0 : cs(s2, e, `${t2} has member 'flush' that`), readableType: l2, start: c === void 0 ? void 0 : ds(c, e, `${t2} has member 'start' that`), transform: h2 === void 0 ? void 0 : hs(h2, e, `${t2} has member 'transform' that`), writableType: y };
      }
      n(fs, "convertTransformer");
      function cs(e, t2, r) {
        return Z(e, r), (s2) => I(e, t2, [s2]);
      }
      n(cs, "convertTransformerFlushCallback");
      function ds(e, t2, r) {
        return Z(e, r), (s2) => j(e, t2, [s2]);
      }
      n(ds, "convertTransformerStartCallback");
      function hs(e, t2, r) {
        return Z(e, r), (s2, l2) => I(e, t2, [s2, l2]);
      }
      n(hs, "convertTransformerTransformCallback");
      function ps(e, t2, r) {
        return Z(e, r), (s2) => I(e, t2, [s2]);
      }
      n(ps, "convertTransformerCancelCallback");
      const Cn = class Cn {
        constructor(t2 = {}, r = {}, s2 = {}) {
          t2 === void 0 && (t2 = null);
          const l2 = Gt(r, "Second parameter"), c = Gt(s2, "Third parameter"), h2 = fs(t2, "First parameter");
          if (h2.readableType !== void 0)
            throw new RangeError("Invalid readableType specified");
          if (h2.writableType !== void 0)
            throw new RangeError("Invalid writableType specified");
          const y = wt(c, 0), T = Yt(c), g2 = wt(l2, 1), C = Yt(l2);
          let P;
          const B = A2((ae) => {
            P = ae;
          });
          bs(this, B, g2, C, y, T), ys(this, h2), h2.start !== void 0 ? P(h2.start(this._transformStreamController)) : P(void 0);
        }
        get readable() {
          if (!ri(this))
            throw ai("readable");
          return this._readable;
        }
        get writable() {
          if (!ri(this))
            throw ai("writable");
          return this._writable;
        }
      };
      n(Cn, "TransformStream");
      let tt = Cn;
      Object.defineProperties(tt.prototype, { readable: { enumerable: true }, writable: { enumerable: true } }), typeof u.toStringTag == "symbol" && Object.defineProperty(tt.prototype, u.toStringTag, { value: "TransformStream", configurable: true });
      function bs(e, t2, r, s2, l2, c) {
        function h2() {
          return t2;
        }
        n(h2, "startAlgorithm");
        function y(B) {
          return Ss(e, B);
        }
        n(y, "writeAlgorithm");
        function T(B) {
          return ws(e, B);
        }
        n(T, "abortAlgorithm");
        function g2() {
          return Rs(e);
        }
        n(g2, "closeAlgorithm"), e._writable = _a2(h2, y, g2, T, r, s2);
        function C() {
          return Ts(e);
        }
        n(C, "pullAlgorithm");
        function P(B) {
          return Cs(e, B);
        }
        n(P, "cancelAlgorithm"), e._readable = Pt(h2, C, P, l2, c), e._backpressure = void 0, e._backpressureChangePromise = void 0, e._backpressureChangePromise_resolve = void 0, ar(e, true), e._transformStreamController = void 0;
      }
      n(bs, "InitializeTransformStream");
      function ri(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_transformStreamController") ? false : e instanceof tt;
      }
      n(ri, "IsTransformStream");
      function ni(e, t2) {
        oe(e._readable._readableStreamController, t2), un(e, t2);
      }
      n(ni, "TransformStreamError");
      function un(e, t2) {
        ur(e._transformStreamController), Rt(e._writable._writableStreamController, t2), ln(e);
      }
      n(un, "TransformStreamErrorWritableAndUnblockWrite");
      function ln(e) {
        e._backpressure && ar(e, false);
      }
      n(ln, "TransformStreamUnblockWrite");
      function ar(e, t2) {
        e._backpressureChangePromise !== void 0 && e._backpressureChangePromise_resolve(), e._backpressureChangePromise = A2((r) => {
          e._backpressureChangePromise_resolve = r;
        }), e._backpressure = t2;
      }
      n(ar, "TransformStreamSetBackpressure");
      const Pn = class Pn {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        get desiredSize() {
          if (!sr(this))
            throw lr("desiredSize");
          const t2 = this._controlledTransformStream._readable._readableStreamController;
          return an(t2);
        }
        enqueue(t2 = void 0) {
          if (!sr(this))
            throw lr("enqueue");
          oi(this, t2);
        }
        error(t2 = void 0) {
          if (!sr(this))
            throw lr("error");
          gs(this, t2);
        }
        terminate() {
          if (!sr(this))
            throw lr("terminate");
          _s(this);
        }
      };
      n(Pn, "TransformStreamDefaultController");
      let pe = Pn;
      Object.defineProperties(pe.prototype, { enqueue: { enumerable: true }, error: { enumerable: true }, terminate: { enumerable: true }, desiredSize: { enumerable: true } }), p(pe.prototype.enqueue, "enqueue"), p(pe.prototype.error, "error"), p(pe.prototype.terminate, "terminate"), typeof u.toStringTag == "symbol" && Object.defineProperty(pe.prototype, u.toStringTag, { value: "TransformStreamDefaultController", configurable: true });
      function sr(e) {
        return !d2(e) || !Object.prototype.hasOwnProperty.call(e, "_controlledTransformStream") ? false : e instanceof pe;
      }
      n(sr, "IsTransformStreamDefaultController");
      function ms(e, t2, r, s2, l2) {
        t2._controlledTransformStream = e, e._transformStreamController = t2, t2._transformAlgorithm = r, t2._flushAlgorithm = s2, t2._cancelAlgorithm = l2, t2._finishPromise = void 0, t2._finishPromise_resolve = void 0, t2._finishPromise_reject = void 0;
      }
      n(ms, "SetUpTransformStreamDefaultController");
      function ys(e, t2) {
        const r = Object.create(pe.prototype);
        let s2, l2, c;
        t2.transform !== void 0 ? s2 = n((h2) => t2.transform(h2, r), "transformAlgorithm") : s2 = n((h2) => {
          try {
            return oi(r, h2), S(void 0);
          } catch (y) {
            return m(y);
          }
        }, "transformAlgorithm"), t2.flush !== void 0 ? l2 = n(() => t2.flush(r), "flushAlgorithm") : l2 = n(() => S(void 0), "flushAlgorithm"), t2.cancel !== void 0 ? c = n((h2) => t2.cancel(h2), "cancelAlgorithm") : c = n(() => S(void 0), "cancelAlgorithm"), ms(e, r, s2, l2, c);
      }
      n(ys, "SetUpTransformStreamDefaultControllerFromTransformer");
      function ur(e) {
        e._transformAlgorithm = void 0, e._flushAlgorithm = void 0, e._cancelAlgorithm = void 0;
      }
      n(ur, "TransformStreamDefaultControllerClearAlgorithms");
      function oi(e, t2) {
        const r = e._controlledTransformStream, s2 = r._readable._readableStreamController;
        if (!Je(s2))
          throw new TypeError("Readable side is not in a state that permits enqueue");
        try {
          Ke(s2, t2);
        } catch (c) {
          throw un(r, c), r._readable._storedError;
        }
        Qa(s2) !== r._backpressure && ar(r, true);
      }
      n(oi, "TransformStreamDefaultControllerEnqueue");
      function gs(e, t2) {
        ni(e._controlledTransformStream, t2);
      }
      n(gs, "TransformStreamDefaultControllerError");
      function ii(e, t2) {
        const r = e._transformAlgorithm(t2);
        return M(r, void 0, (s2) => {
          throw ni(e._controlledTransformStream, s2), s2;
        });
      }
      n(ii, "TransformStreamDefaultControllerPerformTransform");
      function _s(e) {
        const t2 = e._controlledTransformStream, r = t2._readable._readableStreamController;
        $e(r);
        const s2 = new TypeError("TransformStream terminated");
        un(t2, s2);
      }
      n(_s, "TransformStreamDefaultControllerTerminate");
      function Ss(e, t2) {
        const r = e._transformStreamController;
        if (e._backpressure) {
          const s2 = e._backpressureChangePromise;
          return M(s2, () => {
            const l2 = e._writable;
            if (l2._state === "erroring")
              throw l2._storedError;
            return ii(r, t2);
          });
        }
        return ii(r, t2);
      }
      n(Ss, "TransformStreamDefaultSinkWriteAlgorithm");
      function ws(e, t2) {
        const r = e._transformStreamController;
        if (r._finishPromise !== void 0)
          return r._finishPromise;
        const s2 = e._readable;
        r._finishPromise = A2((c, h2) => {
          r._finishPromise_resolve = c, r._finishPromise_reject = h2;
        });
        const l2 = r._cancelAlgorithm(t2);
        return ur(r), q(l2, () => (s2._state === "errored" ? rt(r, s2._storedError) : (oe(s2._readableStreamController, t2), fn(r)), null), (c) => (oe(s2._readableStreamController, c), rt(r, c), null)), r._finishPromise;
      }
      n(ws, "TransformStreamDefaultSinkAbortAlgorithm");
      function Rs(e) {
        const t2 = e._transformStreamController;
        if (t2._finishPromise !== void 0)
          return t2._finishPromise;
        const r = e._readable;
        t2._finishPromise = A2((l2, c) => {
          t2._finishPromise_resolve = l2, t2._finishPromise_reject = c;
        });
        const s2 = t2._flushAlgorithm();
        return ur(t2), q(s2, () => (r._state === "errored" ? rt(t2, r._storedError) : ($e(r._readableStreamController), fn(t2)), null), (l2) => (oe(r._readableStreamController, l2), rt(t2, l2), null)), t2._finishPromise;
      }
      n(Rs, "TransformStreamDefaultSinkCloseAlgorithm");
      function Ts(e) {
        return ar(e, false), e._backpressureChangePromise;
      }
      n(Ts, "TransformStreamDefaultSourcePullAlgorithm");
      function Cs(e, t2) {
        const r = e._transformStreamController;
        if (r._finishPromise !== void 0)
          return r._finishPromise;
        const s2 = e._writable;
        r._finishPromise = A2((c, h2) => {
          r._finishPromise_resolve = c, r._finishPromise_reject = h2;
        });
        const l2 = r._cancelAlgorithm(t2);
        return ur(r), q(l2, () => (s2._state === "errored" ? rt(r, s2._storedError) : (Rt(s2._writableStreamController, t2), ln(e), fn(r)), null), (c) => (Rt(s2._writableStreamController, c), ln(e), rt(r, c), null)), r._finishPromise;
      }
      n(Cs, "TransformStreamDefaultSourceCancelAlgorithm");
      function lr(e) {
        return new TypeError(`TransformStreamDefaultController.prototype.${e} can only be used on a TransformStreamDefaultController`);
      }
      n(lr, "defaultControllerBrandCheckException");
      function fn(e) {
        e._finishPromise_resolve !== void 0 && (e._finishPromise_resolve(), e._finishPromise_resolve = void 0, e._finishPromise_reject = void 0);
      }
      n(fn, "defaultControllerFinishPromiseResolve");
      function rt(e, t2) {
        e._finishPromise_reject !== void 0 && (ve(e._finishPromise), e._finishPromise_reject(t2), e._finishPromise_resolve = void 0, e._finishPromise_reject = void 0);
      }
      n(rt, "defaultControllerFinishPromiseReject");
      function ai(e) {
        return new TypeError(`TransformStream.prototype.${e} can only be used on a TransformStream`);
      }
      n(ai, "streamBrandCheckException"), a2.ByteLengthQueuingStrategy = Xe, a2.CountQueuingStrategy = et, a2.ReadableByteStreamController = te, a2.ReadableStream = L, a2.ReadableStreamBYOBReader = ce, a2.ReadableStreamBYOBRequest = we, a2.ReadableStreamDefaultController = ne, a2.ReadableStreamDefaultReader = fe, a2.TransformStream = tt, a2.TransformStreamDefaultController = pe, a2.WritableStream = de, a2.WritableStreamDefaultController = ke, a2.WritableStreamDefaultWriter = re;
    });
  }(pr, pr.exports)), pr.exports;
}
n(Is, "requirePonyfill_es2018");
const Fs = 65536;
if (!globalThis.ReadableStream)
  try {
    const i = require("node:process"), { emitWarning: o2 } = i;
    try {
      i.emitWarning = () => {
      }, Object.assign(globalThis, require("node:stream/web")), i.emitWarning = o2;
    } catch (a2) {
      throw i.emitWarning = o2, a2;
    }
  } catch {
    Object.assign(globalThis, Is());
  }
try {
  const { Blob: i } = require("buffer");
  i && !i.prototype.stream && (i.prototype.stream = n(function(a2) {
    let u = 0;
    const f2 = this;
    return new ReadableStream({ type: "bytes", async pull(d2) {
      const p = await f2.slice(u, Math.min(f2.size, u + Fs)).arrayBuffer();
      u += p.byteLength, d2.enqueue(new Uint8Array(p)), u === f2.size && d2.close();
    } });
  }, "name"));
} catch {
}
/*! fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
const ci = 65536;
async function* An(i, o2 = true) {
  for (const a2 of i)
    if ("stream" in a2)
      yield* a2.stream();
    else if (ArrayBuffer.isView(a2))
      if (o2) {
        let u = a2.byteOffset;
        const f2 = a2.byteOffset + a2.byteLength;
        for (; u !== f2; ) {
          const d2 = Math.min(f2 - u, ci), b = a2.buffer.slice(u, u + d2);
          u += b.byteLength, yield new Uint8Array(b);
        }
      } else
        yield a2;
    else {
      let u = 0, f2 = a2;
      for (; u !== f2.size; ) {
        const b = await f2.slice(u, Math.min(f2.size, u + ci)).arrayBuffer();
        u += b.byteLength, yield new Uint8Array(b);
      }
    }
}
n(An, "toIterator");
const di = (Ve = class {
  constructor(o2 = [], a2 = {}) {
    be(this, Pe, []);
    be(this, Wt, "");
    be(this, bt, 0);
    be(this, Cr, "transparent");
    if (typeof o2 != "object" || o2 === null)
      throw new TypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence.");
    if (typeof o2[Symbol.iterator] != "function")
      throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
    if (typeof a2 != "object" && typeof a2 != "function")
      throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
    a2 === null && (a2 = {});
    const u = new TextEncoder();
    for (const d2 of o2) {
      let b;
      ArrayBuffer.isView(d2) ? b = new Uint8Array(d2.buffer.slice(d2.byteOffset, d2.byteOffset + d2.byteLength)) : d2 instanceof ArrayBuffer ? b = new Uint8Array(d2.slice(0)) : d2 instanceof Ve ? b = d2 : b = u.encode(`${d2}`), X(this, bt, O(this, bt) + (ArrayBuffer.isView(b) ? b.byteLength : b.size)), O(this, Pe).push(b);
    }
    X(this, Cr, `${a2.endings === void 0 ? "transparent" : a2.endings}`);
    const f2 = a2.type === void 0 ? "" : String(a2.type);
    X(this, Wt, /^[\x20-\x7E]*$/.test(f2) ? f2 : "");
  }
  get size() {
    return O(this, bt);
  }
  get type() {
    return O(this, Wt);
  }
  async text() {
    const o2 = new TextDecoder();
    let a2 = "";
    for await (const u of An(O(this, Pe), false))
      a2 += o2.decode(u, { stream: true });
    return a2 += o2.decode(), a2;
  }
  async arrayBuffer() {
    const o2 = new Uint8Array(this.size);
    let a2 = 0;
    for await (const u of An(O(this, Pe), false))
      o2.set(u, a2), a2 += u.length;
    return o2.buffer;
  }
  stream() {
    const o2 = An(O(this, Pe), true);
    return new globalThis.ReadableStream({ type: "bytes", async pull(a2) {
      const u = await o2.next();
      u.done ? a2.close() : a2.enqueue(u.value);
    }, async cancel() {
      await o2.return();
    } });
  }
  slice(o2 = 0, a2 = this.size, u = "") {
    const { size: f2 } = this;
    let d2 = o2 < 0 ? Math.max(f2 + o2, 0) : Math.min(o2, f2), b = a2 < 0 ? Math.max(f2 + a2, 0) : Math.min(a2, f2);
    const p = Math.max(b - d2, 0), E = O(this, Pe), w = [];
    let D = 0;
    for (const S of E) {
      if (D >= p)
        break;
      const m = ArrayBuffer.isView(S) ? S.byteLength : S.size;
      if (d2 && m <= d2)
        d2 -= m, b -= m;
      else {
        let R;
        ArrayBuffer.isView(S) ? (R = S.subarray(d2, Math.min(m, b)), D += R.byteLength) : (R = S.slice(d2, Math.min(m, b)), D += R.size), b -= m, w.push(R), d2 = 0;
      }
    }
    const A2 = new Ve([], { type: String(u).toLowerCase() });
    return X(A2, bt, p), X(A2, Pe, w), A2;
  }
  get [Symbol.toStringTag]() {
    return "Blob";
  }
  static [Symbol.hasInstance](o2) {
    return o2 && typeof o2 == "object" && typeof o2.constructor == "function" && (typeof o2.stream == "function" || typeof o2.arrayBuffer == "function") && /^(Blob|File)$/.test(o2[Symbol.toStringTag]);
  }
}, Pe = /* @__PURE__ */ new WeakMap(), Wt = /* @__PURE__ */ new WeakMap(), bt = /* @__PURE__ */ new WeakMap(), Cr = /* @__PURE__ */ new WeakMap(), n(Ve, "Blob"), Ve);
Object.defineProperties(di.prototype, { size: { enumerable: true }, type: { enumerable: true }, slice: { enumerable: true } });
const js = di, lt = js, Ls = (zt = class extends lt {
  constructor(a2, u, f2 = {}) {
    if (arguments.length < 2)
      throw new TypeError(`Failed to construct 'File': 2 arguments required, but only ${arguments.length} present.`);
    super(a2, f2);
    be(this, qt, 0);
    be(this, Ot, "");
    f2 === null && (f2 = {});
    const d2 = f2.lastModified === void 0 ? Date.now() : Number(f2.lastModified);
    Number.isNaN(d2) || X(this, qt, d2), X(this, Ot, String(u));
  }
  get name() {
    return O(this, Ot);
  }
  get lastModified() {
    return O(this, qt);
  }
  get [Symbol.toStringTag]() {
    return "File";
  }
  static [Symbol.hasInstance](a2) {
    return !!a2 && a2 instanceof lt && /^(File)$/.test(a2[Symbol.toStringTag]);
  }
}, qt = /* @__PURE__ */ new WeakMap(), Ot = /* @__PURE__ */ new WeakMap(), n(zt, "File"), zt), $s = Ls, Bn = $s;
/*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
var { toStringTag: At, iterator: Ds, hasInstance: Ms } = Symbol, hi = Math.random, Us = "append,set,get,getAll,delete,keys,values,entries,forEach,constructor".split(","), pi = n((i, o2, a2) => (i += "", /^(Blob|File)$/.test(o2 && o2[At]) ? [(a2 = a2 !== void 0 ? a2 + "" : o2[At] == "File" ? o2.name : "blob", i), o2.name !== a2 || o2[At] == "blob" ? new Bn([o2], a2, o2) : o2] : [i, o2 + ""]), "f"), kn = n((i, o2) => (o2 ? i : i.replace(/\r?\n|\r/g, `\r
`)).replace(/\n/g, "%0A").replace(/\r/g, "%0D").replace(/"/g, "%22"), "e$1"), Me = n((i, o2, a2) => {
  if (o2.length < a2)
    throw new TypeError(`Failed to execute '${i}' on 'FormData': ${a2} arguments required, but only ${o2.length} present.`);
}, "x");
const br = (It = class {
  constructor(...o2) {
    be(this, ee, []);
    if (o2.length)
      throw new TypeError("Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'.");
  }
  get [At]() {
    return "FormData";
  }
  [Ds]() {
    return this.entries();
  }
  static [Ms](o2) {
    return o2 && typeof o2 == "object" && o2[At] === "FormData" && !Us.some((a2) => typeof o2[a2] != "function");
  }
  append(...o2) {
    Me("append", arguments, 2), O(this, ee).push(pi(...o2));
  }
  delete(o2) {
    Me("delete", arguments, 1), o2 += "", X(this, ee, O(this, ee).filter(([a2]) => a2 !== o2));
  }
  get(o2) {
    Me("get", arguments, 1), o2 += "";
    for (var a2 = O(this, ee), u = a2.length, f2 = 0; f2 < u; f2++)
      if (a2[f2][0] === o2)
        return a2[f2][1];
    return null;
  }
  getAll(o2, a2) {
    return Me("getAll", arguments, 1), a2 = [], o2 += "", O(this, ee).forEach((u) => u[0] === o2 && a2.push(u[1])), a2;
  }
  has(o2) {
    return Me("has", arguments, 1), o2 += "", O(this, ee).some((a2) => a2[0] === o2);
  }
  forEach(o2, a2) {
    Me("forEach", arguments, 1);
    for (var [u, f2] of this)
      o2.call(a2, f2, u, this);
  }
  set(...o2) {
    Me("set", arguments, 2);
    var a2 = [], u = true;
    o2 = pi(...o2), O(this, ee).forEach((f2) => {
      f2[0] === o2[0] ? u && (u = !a2.push(o2)) : a2.push(f2);
    }), u && a2.push(o2), X(this, ee, a2);
  }
  *entries() {
    yield* O(this, ee);
  }
  *keys() {
    for (var [o2] of this)
      yield o2;
  }
  *values() {
    for (var [, o2] of this)
      yield o2;
  }
}, ee = /* @__PURE__ */ new WeakMap(), n(It, "FormData"), It);
function xs(i, o2 = lt) {
  var a2 = `${hi()}${hi()}`.replace(/\./g, "").slice(-28).padStart(32, "-"), u = [], f2 = `--${a2}\r
Content-Disposition: form-data; name="`;
  return i.forEach((d2, b) => typeof d2 == "string" ? u.push(f2 + kn(b) + `"\r
\r
${d2.replace(new RegExp("\\r(?!\\n)|(?<!\\r)\\n", "g"), `\r
`)}\r
`) : u.push(f2 + kn(b) + `"; filename="${kn(d2.name, 1)}"\r
Content-Type: ${d2.type || "application/octet-stream"}\r
\r
`, d2, `\r
`)), u.push(`--${a2}--`), new o2(u, { type: "multipart/form-data; boundary=" + a2 });
}
n(xs, "formDataToBlob");
const Ln = class Ln2 extends Error {
  constructor(o2, a2) {
    super(o2), Error.captureStackTrace(this, this.constructor), this.type = a2;
  }
  get name() {
    return this.constructor.name;
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
};
n(Ln, "FetchBaseError");
let ft = Ln;
const $n = class $n2 extends ft {
  constructor(o2, a2, u) {
    super(o2, a2), u && (this.code = this.errno = u.code, this.erroredSysCall = u.syscall);
  }
};
n($n, "FetchError");
let G = $n;
const mr = Symbol.toStringTag, bi = n((i) => typeof i == "object" && typeof i.append == "function" && typeof i.delete == "function" && typeof i.get == "function" && typeof i.getAll == "function" && typeof i.has == "function" && typeof i.set == "function" && typeof i.sort == "function" && i[mr] === "URLSearchParams", "isURLSearchParameters"), yr = n((i) => i && typeof i == "object" && typeof i.arrayBuffer == "function" && typeof i.type == "string" && typeof i.stream == "function" && typeof i.constructor == "function" && /^(Blob|File)$/.test(i[mr]), "isBlob"), Ns = n((i) => typeof i == "object" && (i[mr] === "AbortSignal" || i[mr] === "EventTarget"), "isAbortSignal"), Hs = n((i, o2) => {
  const a2 = new URL(o2).hostname, u = new URL(i).hostname;
  return a2 === u || a2.endsWith(`.${u}`);
}, "isDomainOrSubdomain"), Vs = n((i, o2) => {
  const a2 = new URL(o2).protocol, u = new URL(i).protocol;
  return a2 === u;
}, "isSameProtocol"), Qs = promisify(me.pipeline), V = Symbol("Body internals"), Dn = class Dn2 {
  constructor(o2, { size: a2 = 0 } = {}) {
    let u = null;
    o2 === null ? o2 = null : bi(o2) ? o2 = Buffer$1.from(o2.toString()) : yr(o2) || Buffer$1.isBuffer(o2) || (types.isAnyArrayBuffer(o2) ? o2 = Buffer$1.from(o2) : ArrayBuffer.isView(o2) ? o2 = Buffer$1.from(o2.buffer, o2.byteOffset, o2.byteLength) : o2 instanceof me || (o2 instanceof br ? (o2 = xs(o2), u = o2.type.split("=")[1]) : o2 = Buffer$1.from(String(o2))));
    let f2 = o2;
    Buffer$1.isBuffer(o2) ? f2 = me.Readable.from(o2) : yr(o2) && (f2 = me.Readable.from(o2.stream())), this[V] = { body: o2, stream: f2, boundary: u, disturbed: false, error: null }, this.size = a2, o2 instanceof me && o2.on("error", (d2) => {
      const b = d2 instanceof ft ? d2 : new G(`Invalid response body while trying to fetch ${this.url}: ${d2.message}`, "system", d2);
      this[V].error = b;
    });
  }
  get body() {
    return this[V].stream;
  }
  get bodyUsed() {
    return this[V].disturbed;
  }
  async arrayBuffer() {
    const { buffer: o2, byteOffset: a2, byteLength: u } = await Wn(this);
    return o2.slice(a2, a2 + u);
  }
  async formData() {
    const o2 = this.headers.get("content-type");
    if (o2.startsWith("application/x-www-form-urlencoded")) {
      const u = new br(), f2 = new URLSearchParams(await this.text());
      for (const [d2, b] of f2)
        u.append(d2, b);
      return u;
    }
    const { toFormData: a2 } = await import('./_nuxt/multipart-parser-qexor4Vs.mjs');
    return a2(this.body, o2);
  }
  async blob() {
    const o2 = this.headers && this.headers.get("content-type") || this[V].body && this[V].body.type || "", a2 = await this.arrayBuffer();
    return new lt([a2], { type: o2 });
  }
  async json() {
    const o2 = await this.text();
    return JSON.parse(o2);
  }
  async text() {
    const o2 = await Wn(this);
    return new TextDecoder().decode(o2);
  }
  buffer() {
    return Wn(this);
  }
};
n(Dn, "Body");
let Ue = Dn;
Ue.prototype.buffer = deprecate(Ue.prototype.buffer, "Please use 'response.arrayBuffer()' instead of 'response.buffer()'", "node-fetch#buffer"), Object.defineProperties(Ue.prototype, { body: { enumerable: true }, bodyUsed: { enumerable: true }, arrayBuffer: { enumerable: true }, blob: { enumerable: true }, json: { enumerable: true }, text: { enumerable: true }, data: { get: deprecate(() => {
}, "data doesn't exist, use json(), text(), arrayBuffer(), or body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (response)") } });
async function Wn(i) {
  if (i[V].disturbed)
    throw new TypeError(`body used already for: ${i.url}`);
  if (i[V].disturbed = true, i[V].error)
    throw i[V].error;
  const { body: o2 } = i;
  if (o2 === null)
    return Buffer$1.alloc(0);
  if (!(o2 instanceof me))
    return Buffer$1.alloc(0);
  const a2 = [];
  let u = 0;
  try {
    for await (const f2 of o2) {
      if (i.size > 0 && u + f2.length > i.size) {
        const d2 = new G(`content size at ${i.url} over limit: ${i.size}`, "max-size");
        throw o2.destroy(d2), d2;
      }
      u += f2.length, a2.push(f2);
    }
  } catch (f2) {
    throw f2 instanceof ft ? f2 : new G(`Invalid response body while trying to fetch ${i.url}: ${f2.message}`, "system", f2);
  }
  if (o2.readableEnded === true || o2._readableState.ended === true)
    try {
      return a2.every((f2) => typeof f2 == "string") ? Buffer$1.from(a2.join("")) : Buffer$1.concat(a2, u);
    } catch (f2) {
      throw new G(`Could not create Buffer from response body for ${i.url}: ${f2.message}`, "system", f2);
    }
  else
    throw new G(`Premature close of server response while trying to fetch ${i.url}`);
}
n(Wn, "consumeBody");
const qn = n((i, o2) => {
  let a2, u, { body: f2 } = i[V];
  if (i.bodyUsed)
    throw new Error("cannot clone body after it is used");
  return f2 instanceof me && typeof f2.getBoundary != "function" && (a2 = new PassThrough({ highWaterMark: o2 }), u = new PassThrough({ highWaterMark: o2 }), f2.pipe(a2), f2.pipe(u), i[V].stream = a2, f2 = u), f2;
}, "clone"), Ys = deprecate((i) => i.getBoundary(), "form-data doesn't follow the spec and requires special treatment. Use alternative package", "https://github.com/node-fetch/node-fetch/issues/1167"), mi = n((i, o2) => i === null ? null : typeof i == "string" ? "text/plain;charset=UTF-8" : bi(i) ? "application/x-www-form-urlencoded;charset=UTF-8" : yr(i) ? i.type || null : Buffer$1.isBuffer(i) || types.isAnyArrayBuffer(i) || ArrayBuffer.isView(i) ? null : i instanceof br ? `multipart/form-data; boundary=${o2[V].boundary}` : i && typeof i.getBoundary == "function" ? `multipart/form-data;boundary=${Ys(i)}` : i instanceof me ? null : "text/plain;charset=UTF-8", "extractContentType"), Gs = n((i) => {
  const { body: o2 } = i[V];
  return o2 === null ? 0 : yr(o2) ? o2.size : Buffer$1.isBuffer(o2) ? o2.length : o2 && typeof o2.getLengthSync == "function" && o2.hasKnownLength && o2.hasKnownLength() ? o2.getLengthSync() : null;
}, "getTotalBytes"), Zs = n(async (i, { body: o2 }) => {
  o2 === null ? i.end() : await Qs(o2, i);
}, "writeToStream"), gr = typeof Et.validateHeaderName == "function" ? Et.validateHeaderName : (i) => {
  if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(i)) {
    const o2 = new TypeError(`Header name must be a valid HTTP token [${i}]`);
    throw Object.defineProperty(o2, "code", { value: "ERR_INVALID_HTTP_TOKEN" }), o2;
  }
}, On = typeof Et.validateHeaderValue == "function" ? Et.validateHeaderValue : (i, o2) => {
  if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(o2)) {
    const a2 = new TypeError(`Invalid character in header content ["${i}"]`);
    throw Object.defineProperty(a2, "code", { value: "ERR_INVALID_CHAR" }), a2;
  }
}, Pr = class Pr2 extends URLSearchParams {
  constructor(o2) {
    let a2 = [];
    if (o2 instanceof Pr2) {
      const u = o2.raw();
      for (const [f2, d2] of Object.entries(u))
        a2.push(...d2.map((b) => [f2, b]));
    } else if (o2 != null)
      if (typeof o2 == "object" && !types.isBoxedPrimitive(o2)) {
        const u = o2[Symbol.iterator];
        if (u == null)
          a2.push(...Object.entries(o2));
        else {
          if (typeof u != "function")
            throw new TypeError("Header pairs must be iterable");
          a2 = [...o2].map((f2) => {
            if (typeof f2 != "object" || types.isBoxedPrimitive(f2))
              throw new TypeError("Each header pair must be an iterable object");
            return [...f2];
          }).map((f2) => {
            if (f2.length !== 2)
              throw new TypeError("Each header pair must be a name/value tuple");
            return [...f2];
          });
        }
      } else
        throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
    return a2 = a2.length > 0 ? a2.map(([u, f2]) => (gr(u), On(u, String(f2)), [String(u).toLowerCase(), String(f2)])) : void 0, super(a2), new Proxy(this, { get(u, f2, d2) {
      switch (f2) {
        case "append":
        case "set":
          return (b, p) => (gr(b), On(b, String(p)), URLSearchParams.prototype[f2].call(u, String(b).toLowerCase(), String(p)));
        case "delete":
        case "has":
        case "getAll":
          return (b) => (gr(b), URLSearchParams.prototype[f2].call(u, String(b).toLowerCase()));
        case "keys":
          return () => (u.sort(), new Set(URLSearchParams.prototype.keys.call(u)).keys());
        default:
          return Reflect.get(u, f2, d2);
      }
    } });
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  toString() {
    return Object.prototype.toString.call(this);
  }
  get(o2) {
    const a2 = this.getAll(o2);
    if (a2.length === 0)
      return null;
    let u = a2.join(", ");
    return /^content-encoding$/i.test(o2) && (u = u.toLowerCase()), u;
  }
  forEach(o2, a2 = void 0) {
    for (const u of this.keys())
      Reflect.apply(o2, a2, [this.get(u), u, this]);
  }
  *values() {
    for (const o2 of this.keys())
      yield this.get(o2);
  }
  *entries() {
    for (const o2 of this.keys())
      yield [o2, this.get(o2)];
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  raw() {
    return [...this.keys()].reduce((o2, a2) => (o2[a2] = this.getAll(a2), o2), {});
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this.keys()].reduce((o2, a2) => {
      const u = this.getAll(a2);
      return a2 === "host" ? o2[a2] = u[0] : o2[a2] = u.length > 1 ? u : u[0], o2;
    }, {});
  }
};
n(Pr, "Headers");
let ye = Pr;
Object.defineProperties(ye.prototype, ["get", "entries", "forEach", "values"].reduce((i, o2) => (i[o2] = { enumerable: true }, i), {}));
function Ks(i = []) {
  return new ye(i.reduce((o2, a2, u, f2) => (u % 2 === 0 && o2.push(f2.slice(u, u + 2)), o2), []).filter(([o2, a2]) => {
    try {
      return gr(o2), On(o2, String(a2)), true;
    } catch {
      return false;
    }
  }));
}
n(Ks, "fromRawHeaders");
const Js = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]), zn = n((i) => Js.has(i), "isRedirect"), se = Symbol("Response internals"), xe = class xe2 extends Ue {
  constructor(o2 = null, a2 = {}) {
    super(o2, a2);
    const u = a2.status != null ? a2.status : 200, f2 = new ye(a2.headers);
    if (o2 !== null && !f2.has("Content-Type")) {
      const d2 = mi(o2, this);
      d2 && f2.append("Content-Type", d2);
    }
    this[se] = { type: "default", url: a2.url, status: u, statusText: a2.statusText || "", headers: f2, counter: a2.counter, highWaterMark: a2.highWaterMark };
  }
  get type() {
    return this[se].type;
  }
  get url() {
    return this[se].url || "";
  }
  get status() {
    return this[se].status;
  }
  get ok() {
    return this[se].status >= 200 && this[se].status < 300;
  }
  get redirected() {
    return this[se].counter > 0;
  }
  get statusText() {
    return this[se].statusText;
  }
  get headers() {
    return this[se].headers;
  }
  get highWaterMark() {
    return this[se].highWaterMark;
  }
  clone() {
    return new xe2(qn(this, this.highWaterMark), { type: this.type, url: this.url, status: this.status, statusText: this.statusText, headers: this.headers, ok: this.ok, redirected: this.redirected, size: this.size, highWaterMark: this.highWaterMark });
  }
  static redirect(o2, a2 = 302) {
    if (!zn(a2))
      throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
    return new xe2(null, { headers: { location: new URL(o2).toString() }, status: a2 });
  }
  static error() {
    const o2 = new xe2(null, { status: 0, statusText: "" });
    return o2[se].type = "error", o2;
  }
  static json(o2 = void 0, a2 = {}) {
    const u = JSON.stringify(o2);
    if (u === void 0)
      throw new TypeError("data is not JSON serializable");
    const f2 = new ye(a2 && a2.headers);
    return f2.has("content-type") || f2.set("content-type", "application/json"), new xe2(u, { ...a2, headers: f2 });
  }
  get [Symbol.toStringTag]() {
    return "Response";
  }
};
n(xe, "Response");
let ue = xe;
Object.defineProperties(ue.prototype, { type: { enumerable: true }, url: { enumerable: true }, status: { enumerable: true }, ok: { enumerable: true }, redirected: { enumerable: true }, statusText: { enumerable: true }, headers: { enumerable: true }, clone: { enumerable: true } });
const Xs = n((i) => {
  if (i.search)
    return i.search;
  const o2 = i.href.length - 1, a2 = i.hash || (i.href[o2] === "#" ? "#" : "");
  return i.href[o2 - a2.length] === "?" ? "?" : "";
}, "getSearch");
function yi(i, o2 = false) {
  return i == null || (i = new URL(i), /^(about|blob|data):$/.test(i.protocol)) ? "no-referrer" : (i.username = "", i.password = "", i.hash = "", o2 && (i.pathname = "", i.search = ""), i);
}
n(yi, "stripURLForUseAsAReferrer");
const gi = /* @__PURE__ */ new Set(["", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"]), eu = "strict-origin-when-cross-origin";
function tu(i) {
  if (!gi.has(i))
    throw new TypeError(`Invalid referrerPolicy: ${i}`);
  return i;
}
n(tu, "validateReferrerPolicy");
function ru(i) {
  if (/^(http|ws)s:$/.test(i.protocol))
    return true;
  const o2 = i.host.replace(/(^\[)|(]$)/g, ""), a2 = isIP(o2);
  return a2 === 4 && /^127\./.test(o2) || a2 === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(o2) ? true : i.host === "localhost" || i.host.endsWith(".localhost") ? false : i.protocol === "file:";
}
n(ru, "isOriginPotentiallyTrustworthy");
function ct(i) {
  return /^about:(blank|srcdoc)$/.test(i) || i.protocol === "data:" || /^(blob|filesystem):$/.test(i.protocol) ? true : ru(i);
}
n(ct, "isUrlPotentiallyTrustworthy");
function nu(i, { referrerURLCallback: o2, referrerOriginCallback: a2 } = {}) {
  if (i.referrer === "no-referrer" || i.referrerPolicy === "")
    return null;
  const u = i.referrerPolicy;
  if (i.referrer === "about:client")
    return "no-referrer";
  const f2 = i.referrer;
  let d2 = yi(f2), b = yi(f2, true);
  d2.toString().length > 4096 && (d2 = b), o2 && (d2 = o2(d2)), a2 && (b = a2(b));
  const p = new URL(i.url);
  switch (u) {
    case "no-referrer":
      return "no-referrer";
    case "origin":
      return b;
    case "unsafe-url":
      return d2;
    case "strict-origin":
      return ct(d2) && !ct(p) ? "no-referrer" : b.toString();
    case "strict-origin-when-cross-origin":
      return d2.origin === p.origin ? d2 : ct(d2) && !ct(p) ? "no-referrer" : b;
    case "same-origin":
      return d2.origin === p.origin ? d2 : "no-referrer";
    case "origin-when-cross-origin":
      return d2.origin === p.origin ? d2 : b;
    case "no-referrer-when-downgrade":
      return ct(d2) && !ct(p) ? "no-referrer" : d2;
    default:
      throw new TypeError(`Invalid referrerPolicy: ${u}`);
  }
}
n(nu, "determineRequestsReferrer");
function ou(i) {
  const o2 = (i.get("referrer-policy") || "").split(/[,\s]+/);
  let a2 = "";
  for (const u of o2)
    u && gi.has(u) && (a2 = u);
  return a2;
}
n(ou, "parseReferrerPolicyFromHeader");
const $ = Symbol("Request internals"), Bt = n((i) => typeof i == "object" && typeof i[$] == "object", "isRequest"), iu = deprecate(() => {
}, ".data is not a valid RequestInit property, use .body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (request)"), vr = class vr2 extends Ue {
  constructor(o2, a2 = {}) {
    let u;
    if (Bt(o2) ? u = new URL(o2.url) : (u = new URL(o2), o2 = {}), u.username !== "" || u.password !== "")
      throw new TypeError(`${u} is an url with embedded credentials.`);
    let f2 = a2.method || o2.method || "GET";
    if (/^(delete|get|head|options|post|put)$/i.test(f2) && (f2 = f2.toUpperCase()), !Bt(a2) && "data" in a2 && iu(), (a2.body != null || Bt(o2) && o2.body !== null) && (f2 === "GET" || f2 === "HEAD"))
      throw new TypeError("Request with GET/HEAD method cannot have body");
    const d2 = a2.body ? a2.body : Bt(o2) && o2.body !== null ? qn(o2) : null;
    super(d2, { size: a2.size || o2.size || 0 });
    const b = new ye(a2.headers || o2.headers || {});
    if (d2 !== null && !b.has("Content-Type")) {
      const w = mi(d2, this);
      w && b.set("Content-Type", w);
    }
    let p = Bt(o2) ? o2.signal : null;
    if ("signal" in a2 && (p = a2.signal), p != null && !Ns(p))
      throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
    let E = a2.referrer == null ? o2.referrer : a2.referrer;
    if (E === "")
      E = "no-referrer";
    else if (E) {
      const w = new URL(E);
      E = /^about:(\/\/)?client$/.test(w) ? "client" : w;
    } else
      E = void 0;
    this[$] = { method: f2, redirect: a2.redirect || o2.redirect || "follow", headers: b, parsedURL: u, signal: p, referrer: E }, this.follow = a2.follow === void 0 ? o2.follow === void 0 ? 20 : o2.follow : a2.follow, this.compress = a2.compress === void 0 ? o2.compress === void 0 ? true : o2.compress : a2.compress, this.counter = a2.counter || o2.counter || 0, this.agent = a2.agent || o2.agent, this.highWaterMark = a2.highWaterMark || o2.highWaterMark || 16384, this.insecureHTTPParser = a2.insecureHTTPParser || o2.insecureHTTPParser || false, this.referrerPolicy = a2.referrerPolicy || o2.referrerPolicy || "";
  }
  get method() {
    return this[$].method;
  }
  get url() {
    return format(this[$].parsedURL);
  }
  get headers() {
    return this[$].headers;
  }
  get redirect() {
    return this[$].redirect;
  }
  get signal() {
    return this[$].signal;
  }
  get referrer() {
    if (this[$].referrer === "no-referrer")
      return "";
    if (this[$].referrer === "client")
      return "about:client";
    if (this[$].referrer)
      return this[$].referrer.toString();
  }
  get referrerPolicy() {
    return this[$].referrerPolicy;
  }
  set referrerPolicy(o2) {
    this[$].referrerPolicy = tu(o2);
  }
  clone() {
    return new vr2(this);
  }
  get [Symbol.toStringTag]() {
    return "Request";
  }
};
n(vr, "Request");
let dt = vr;
Object.defineProperties(dt.prototype, { method: { enumerable: true }, url: { enumerable: true }, headers: { enumerable: true }, redirect: { enumerable: true }, clone: { enumerable: true }, signal: { enumerable: true }, referrer: { enumerable: true }, referrerPolicy: { enumerable: true } });
const au = n((i) => {
  const { parsedURL: o2 } = i[$], a2 = new ye(i[$].headers);
  a2.has("Accept") || a2.set("Accept", "*/*");
  let u = null;
  if (i.body === null && /^(post|put)$/i.test(i.method) && (u = "0"), i.body !== null) {
    const p = Gs(i);
    typeof p == "number" && !Number.isNaN(p) && (u = String(p));
  }
  u && a2.set("Content-Length", u), i.referrerPolicy === "" && (i.referrerPolicy = eu), i.referrer && i.referrer !== "no-referrer" ? i[$].referrer = nu(i) : i[$].referrer = "no-referrer", i[$].referrer instanceof URL && a2.set("Referer", i.referrer), a2.has("User-Agent") || a2.set("User-Agent", "node-fetch"), i.compress && !a2.has("Accept-Encoding") && a2.set("Accept-Encoding", "gzip, deflate, br");
  let { agent: f2 } = i;
  typeof f2 == "function" && (f2 = f2(o2));
  const d2 = Xs(o2), b = { path: o2.pathname + d2, method: i.method, headers: a2[Symbol.for("nodejs.util.inspect.custom")](), insecureHTTPParser: i.insecureHTTPParser, agent: f2 };
  return { parsedURL: o2, options: b };
}, "getNodeRequestOptions"), Mn = class Mn2 extends ft {
  constructor(o2, a2 = "aborted") {
    super(o2, a2);
  }
};
n(Mn, "AbortError");
let _r = Mn;
/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
if (!globalThis.DOMException)
  try {
    const { MessageChannel: i } = require("worker_threads"), o2 = new i().port1, a2 = new ArrayBuffer();
    o2.postMessage(a2, [a2, a2]);
  } catch (i) {
    i.constructor.name === "DOMException" && (globalThis.DOMException = i.constructor);
  }
var su = globalThis.DOMException;
const uu = f$1(su), { stat: In } = promises;
n((i, o2) => _i(statSync(i), i, o2), "blobFromSync");
n((i, o2) => In(i).then((a2) => _i(a2, i, o2)), "blobFrom");
n((i, o2) => In(i).then((a2) => Si(a2, i, o2)), "fileFrom");
n((i, o2) => Si(statSync(i), i, o2), "fileFromSync");
const _i = n((i, o2, a2 = "") => new lt([new Sr({ path: o2, size: i.size, lastModified: i.mtimeMs, start: 0 })], { type: a2 }), "fromBlob"), Si = n((i, o2, a2 = "") => new Bn([new Sr({ path: o2, size: i.size, lastModified: i.mtimeMs, start: 0 })], basename(o2), { type: a2, lastModified: i.mtimeMs }), "fromFile"), Er = class Er2 {
  constructor(o2) {
    be(this, Ne, void 0);
    be(this, He, void 0);
    X(this, Ne, o2.path), X(this, He, o2.start), this.size = o2.size, this.lastModified = o2.lastModified;
  }
  slice(o2, a2) {
    return new Er2({ path: O(this, Ne), lastModified: this.lastModified, size: a2 - o2, start: O(this, He) + o2 });
  }
  async *stream() {
    const { mtimeMs: o2 } = await In(O(this, Ne));
    if (o2 > this.lastModified)
      throw new uu("The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.", "NotReadableError");
    yield* createReadStream(O(this, Ne), { start: O(this, He), end: O(this, He) + this.size - 1 });
  }
  get [Symbol.toStringTag]() {
    return "Blob";
  }
};
Ne = /* @__PURE__ */ new WeakMap(), He = /* @__PURE__ */ new WeakMap(), n(Er, "BlobDataItem");
let Sr = Er;
const hu = /* @__PURE__ */ new Set(["data:", "http:", "https:"]);
async function wi(i, o2) {
  return new Promise((a2, u) => {
    const f2 = new dt(i, o2), { parsedURL: d2, options: b } = au(f2);
    if (!hu.has(d2.protocol))
      throw new TypeError(`node-fetch cannot load ${i}. URL scheme "${d2.protocol.replace(/:$/, "")}" is not supported.`);
    if (d2.protocol === "data:") {
      const R = zs(f2.url), q = new ue(R, { headers: { "Content-Type": R.typeFull } });
      a2(q);
      return;
    }
    const p = (d2.protocol === "https:" ? vs : Et).request, { signal: E } = f2;
    let w = null;
    const D = n(() => {
      const R = new _r("The operation was aborted.");
      u(R), f2.body && f2.body instanceof me.Readable && f2.body.destroy(R), !(!w || !w.body) && w.body.emit("error", R);
    }, "abort");
    if (E && E.aborted) {
      D();
      return;
    }
    const A2 = n(() => {
      D(), m();
    }, "abortAndFinalize"), S = p(d2.toString(), b);
    E && E.addEventListener("abort", A2);
    const m = n(() => {
      S.abort(), E && E.removeEventListener("abort", A2);
    }, "finalize");
    S.on("error", (R) => {
      u(new G(`request to ${f2.url} failed, reason: ${R.message}`, "system", R)), m();
    }), pu(S, (R) => {
      w && w.body && w.body.destroy(R);
    }), process.version < "v14" && S.on("socket", (R) => {
      let q;
      R.prependListener("end", () => {
        q = R._eventsCount;
      }), R.prependListener("close", (F) => {
        if (w && q < R._eventsCount && !F) {
          const Q = new Error("Premature close");
          Q.code = "ERR_STREAM_PREMATURE_CLOSE", w.body.emit("error", Q);
        }
      });
    }), S.on("response", (R) => {
      S.setTimeout(0);
      const q = Ks(R.rawHeaders);
      if (zn(R.statusCode)) {
        const z = q.get("Location");
        let j = null;
        try {
          j = z === null ? null : new URL(z, f2.url);
        } catch {
          if (f2.redirect !== "manual") {
            u(new G(`uri requested responds with an invalid redirect URL: ${z}`, "invalid-redirect")), m();
            return;
          }
        }
        switch (f2.redirect) {
          case "error":
            u(new G(`uri requested responds with a redirect, redirect mode is set to error: ${f2.url}`, "no-redirect")), m();
            return;
          case "manual":
            break;
          case "follow": {
            if (j === null)
              break;
            if (f2.counter >= f2.follow) {
              u(new G(`maximum redirect reached at: ${f2.url}`, "max-redirect")), m();
              return;
            }
            const I = { headers: new ye(f2.headers), follow: f2.follow, counter: f2.counter + 1, agent: f2.agent, compress: f2.compress, method: f2.method, body: qn(f2), signal: f2.signal, size: f2.size, referrer: f2.referrer, referrerPolicy: f2.referrerPolicy };
            if (!Hs(f2.url, j) || !Vs(f2.url, j))
              for (const U of ["authorization", "www-authenticate", "cookie", "cookie2"])
                I.headers.delete(U);
            if (R.statusCode !== 303 && f2.body && o2.body instanceof me.Readable) {
              u(new G("Cannot follow redirect with body being a readable stream", "unsupported-redirect")), m();
              return;
            }
            (R.statusCode === 303 || (R.statusCode === 301 || R.statusCode === 302) && f2.method === "POST") && (I.method = "GET", I.body = void 0, I.headers.delete("content-length"));
            const mt = ou(q);
            mt && (I.referrerPolicy = mt), a2(wi(new dt(j, I))), m();
            return;
          }
          default:
            return u(new TypeError(`Redirect option '${f2.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      E && R.once("end", () => {
        E.removeEventListener("abort", A2);
      });
      let F = pipeline(R, new PassThrough(), (z) => {
        z && u(z);
      });
      process.version < "v12.10" && R.on("aborted", A2);
      const Q = { url: f2.url, status: R.statusCode, statusText: R.statusMessage, headers: q, size: f2.size, counter: f2.counter, highWaterMark: f2.highWaterMark }, M = q.get("Content-Encoding");
      if (!f2.compress || f2.method === "HEAD" || M === null || R.statusCode === 204 || R.statusCode === 304) {
        w = new ue(F, Q), a2(w);
        return;
      }
      const ve = { flush: st.Z_SYNC_FLUSH, finishFlush: st.Z_SYNC_FLUSH };
      if (M === "gzip" || M === "x-gzip") {
        F = pipeline(F, st.createGunzip(ve), (z) => {
          z && u(z);
        }), w = new ue(F, Q), a2(w);
        return;
      }
      if (M === "deflate" || M === "x-deflate") {
        const z = pipeline(R, new PassThrough(), (j) => {
          j && u(j);
        });
        z.once("data", (j) => {
          (j[0] & 15) === 8 ? F = pipeline(F, st.createInflate(), (I) => {
            I && u(I);
          }) : F = pipeline(F, st.createInflateRaw(), (I) => {
            I && u(I);
          }), w = new ue(F, Q), a2(w);
        }), z.once("end", () => {
          w || (w = new ue(F, Q), a2(w));
        });
        return;
      }
      if (M === "br") {
        F = pipeline(F, st.createBrotliDecompress(), (z) => {
          z && u(z);
        }), w = new ue(F, Q), a2(w);
        return;
      }
      w = new ue(F, Q), a2(w);
    }), Zs(S, f2).catch(u);
  });
}
n(wi, "fetch$1");
function pu(i, o2) {
  const a2 = Buffer$1.from(`0\r
\r
`);
  let u = false, f2 = false, d2;
  i.on("response", (b) => {
    const { headers: p } = b;
    u = p["transfer-encoding"] === "chunked" && !p["content-length"];
  }), i.on("socket", (b) => {
    const p = n(() => {
      if (u && !f2) {
        const w = new Error("Premature close");
        w.code = "ERR_STREAM_PREMATURE_CLOSE", o2(w);
      }
    }, "onSocketClose"), E = n((w) => {
      f2 = Buffer$1.compare(w.slice(-5), a2) === 0, !f2 && d2 && (f2 = Buffer$1.compare(d2.slice(-3), a2.slice(0, 3)) === 0 && Buffer$1.compare(w.slice(-2), a2.slice(3)) === 0), d2 = w;
    }, "onData");
    b.prependListener("close", p), b.on("data", E), i.on("close", () => {
      b.removeListener("close", p), b.removeListener("data", E);
    });
  });
}
n(pu, "fixResponseChunkedTransferBadEnding");
const Ri = /* @__PURE__ */ new WeakMap(), Fn = /* @__PURE__ */ new WeakMap();
function W(i) {
  const o2 = Ri.get(i);
  return console.assert(o2 != null, "'this' is expected an Event object, but got", i), o2;
}
n(W, "pd");
function Ti(i) {
  if (i.passiveListener != null) {
    typeof console < "u" && typeof console.error == "function" && console.error("Unable to preventDefault inside passive event listener invocation.", i.passiveListener);
    return;
  }
  i.event.cancelable && (i.canceled = true, typeof i.event.preventDefault == "function" && i.event.preventDefault());
}
n(Ti, "setCancelFlag");
function ht(i, o2) {
  Ri.set(this, { eventTarget: i, event: o2, eventPhase: 2, currentTarget: i, canceled: false, stopped: false, immediateStopped: false, passiveListener: null, timeStamp: o2.timeStamp || Date.now() }), Object.defineProperty(this, "isTrusted", { value: false, enumerable: true });
  const a2 = Object.keys(o2);
  for (let u = 0; u < a2.length; ++u) {
    const f2 = a2[u];
    f2 in this || Object.defineProperty(this, f2, Ci(f2));
  }
}
n(ht, "Event"), ht.prototype = { get type() {
  return W(this).event.type;
}, get target() {
  return W(this).eventTarget;
}, get currentTarget() {
  return W(this).currentTarget;
}, composedPath() {
  const i = W(this).currentTarget;
  return i == null ? [] : [i];
}, get NONE() {
  return 0;
}, get CAPTURING_PHASE() {
  return 1;
}, get AT_TARGET() {
  return 2;
}, get BUBBLING_PHASE() {
  return 3;
}, get eventPhase() {
  return W(this).eventPhase;
}, stopPropagation() {
  const i = W(this);
  i.stopped = true, typeof i.event.stopPropagation == "function" && i.event.stopPropagation();
}, stopImmediatePropagation() {
  const i = W(this);
  i.stopped = true, i.immediateStopped = true, typeof i.event.stopImmediatePropagation == "function" && i.event.stopImmediatePropagation();
}, get bubbles() {
  return !!W(this).event.bubbles;
}, get cancelable() {
  return !!W(this).event.cancelable;
}, preventDefault() {
  Ti(W(this));
}, get defaultPrevented() {
  return W(this).canceled;
}, get composed() {
  return !!W(this).event.composed;
}, get timeStamp() {
  return W(this).timeStamp;
}, get srcElement() {
  return W(this).eventTarget;
}, get cancelBubble() {
  return W(this).stopped;
}, set cancelBubble(i) {
  if (!i)
    return;
  const o2 = W(this);
  o2.stopped = true, typeof o2.event.cancelBubble == "boolean" && (o2.event.cancelBubble = true);
}, get returnValue() {
  return !W(this).canceled;
}, set returnValue(i) {
  i || Ti(W(this));
}, initEvent() {
} }, Object.defineProperty(ht.prototype, "constructor", { value: ht, configurable: true, writable: true });
function Ci(i) {
  return { get() {
    return W(this).event[i];
  }, set(o2) {
    W(this).event[i] = o2;
  }, configurable: true, enumerable: true };
}
n(Ci, "defineRedirectDescriptor");
function bu(i) {
  return { value() {
    const o2 = W(this).event;
    return o2[i].apply(o2, arguments);
  }, configurable: true, enumerable: true };
}
n(bu, "defineCallDescriptor");
function mu(i, o2) {
  const a2 = Object.keys(o2);
  if (a2.length === 0)
    return i;
  function u(f2, d2) {
    i.call(this, f2, d2);
  }
  n(u, "CustomEvent"), u.prototype = Object.create(i.prototype, { constructor: { value: u, configurable: true, writable: true } });
  for (let f2 = 0; f2 < a2.length; ++f2) {
    const d2 = a2[f2];
    if (!(d2 in i.prototype)) {
      const p = typeof Object.getOwnPropertyDescriptor(o2, d2).value == "function";
      Object.defineProperty(u.prototype, d2, p ? bu(d2) : Ci(d2));
    }
  }
  return u;
}
n(mu, "defineWrapper");
function Pi(i) {
  if (i == null || i === Object.prototype)
    return ht;
  let o2 = Fn.get(i);
  return o2 == null && (o2 = mu(Pi(Object.getPrototypeOf(i)), i), Fn.set(i, o2)), o2;
}
n(Pi, "getWrapper");
function yu(i, o2) {
  const a2 = Pi(Object.getPrototypeOf(o2));
  return new a2(i, o2);
}
n(yu, "wrapEvent");
function gu(i) {
  return W(i).immediateStopped;
}
n(gu, "isStopped");
function _u(i, o2) {
  W(i).eventPhase = o2;
}
n(_u, "setEventPhase");
function Su(i, o2) {
  W(i).currentTarget = o2;
}
n(Su, "setCurrentTarget");
function vi(i, o2) {
  W(i).passiveListener = o2;
}
n(vi, "setPassiveListener");
const Ei = /* @__PURE__ */ new WeakMap(), Ai = 1, Bi = 2, wr = 3;
function Rr(i) {
  return i !== null && typeof i == "object";
}
n(Rr, "isObject");
function kt(i) {
  const o2 = Ei.get(i);
  if (o2 == null)
    throw new TypeError("'this' is expected an EventTarget object, but got another value.");
  return o2;
}
n(kt, "getListeners");
function wu(i) {
  return { get() {
    let a2 = kt(this).get(i);
    for (; a2 != null; ) {
      if (a2.listenerType === wr)
        return a2.listener;
      a2 = a2.next;
    }
    return null;
  }, set(o2) {
    typeof o2 != "function" && !Rr(o2) && (o2 = null);
    const a2 = kt(this);
    let u = null, f2 = a2.get(i);
    for (; f2 != null; )
      f2.listenerType === wr ? u !== null ? u.next = f2.next : f2.next !== null ? a2.set(i, f2.next) : a2.delete(i) : u = f2, f2 = f2.next;
    if (o2 !== null) {
      const d2 = { listener: o2, listenerType: wr, passive: false, once: false, next: null };
      u === null ? a2.set(i, d2) : u.next = d2;
    }
  }, configurable: true, enumerable: true };
}
n(wu, "defineEventAttributeDescriptor");
function ki(i, o2) {
  Object.defineProperty(i, `on${o2}`, wu(o2));
}
n(ki, "defineEventAttribute");
function Wi(i) {
  function o2() {
    Ce.call(this);
  }
  n(o2, "CustomEventTarget"), o2.prototype = Object.create(Ce.prototype, { constructor: { value: o2, configurable: true, writable: true } });
  for (let a2 = 0; a2 < i.length; ++a2)
    ki(o2.prototype, i[a2]);
  return o2;
}
n(Wi, "defineCustomEventTarget");
function Ce() {
  if (this instanceof Ce) {
    Ei.set(this, /* @__PURE__ */ new Map());
    return;
  }
  if (arguments.length === 1 && Array.isArray(arguments[0]))
    return Wi(arguments[0]);
  if (arguments.length > 0) {
    const i = new Array(arguments.length);
    for (let o2 = 0; o2 < arguments.length; ++o2)
      i[o2] = arguments[o2];
    return Wi(i);
  }
  throw new TypeError("Cannot call a class as a function");
}
n(Ce, "EventTarget"), Ce.prototype = { addEventListener(i, o2, a2) {
  if (o2 == null)
    return;
  if (typeof o2 != "function" && !Rr(o2))
    throw new TypeError("'listener' should be a function or an object.");
  const u = kt(this), f2 = Rr(a2), b = (f2 ? !!a2.capture : !!a2) ? Ai : Bi, p = { listener: o2, listenerType: b, passive: f2 && !!a2.passive, once: f2 && !!a2.once, next: null };
  let E = u.get(i);
  if (E === void 0) {
    u.set(i, p);
    return;
  }
  let w = null;
  for (; E != null; ) {
    if (E.listener === o2 && E.listenerType === b)
      return;
    w = E, E = E.next;
  }
  w.next = p;
}, removeEventListener(i, o2, a2) {
  if (o2 == null)
    return;
  const u = kt(this), d2 = (Rr(a2) ? !!a2.capture : !!a2) ? Ai : Bi;
  let b = null, p = u.get(i);
  for (; p != null; ) {
    if (p.listener === o2 && p.listenerType === d2) {
      b !== null ? b.next = p.next : p.next !== null ? u.set(i, p.next) : u.delete(i);
      return;
    }
    b = p, p = p.next;
  }
}, dispatchEvent(i) {
  if (i == null || typeof i.type != "string")
    throw new TypeError('"event.type" should be a string.');
  const o2 = kt(this), a2 = i.type;
  let u = o2.get(a2);
  if (u == null)
    return true;
  const f2 = yu(this, i);
  let d2 = null;
  for (; u != null; ) {
    if (u.once ? d2 !== null ? d2.next = u.next : u.next !== null ? o2.set(a2, u.next) : o2.delete(a2) : d2 = u, vi(f2, u.passive ? u.listener : null), typeof u.listener == "function")
      try {
        u.listener.call(this, f2);
      } catch (b) {
        typeof console < "u" && typeof console.error == "function" && console.error(b);
      }
    else
      u.listenerType !== wr && typeof u.listener.handleEvent == "function" && u.listener.handleEvent(f2);
    if (gu(f2))
      break;
    u = u.next;
  }
  return vi(f2, null), _u(f2, 0), Su(f2, null), !f2.defaultPrevented;
} }, Object.defineProperty(Ce.prototype, "constructor", { value: Ce, configurable: true, writable: true });
const Un = class Un2 extends Ce {
  constructor() {
    throw super(), new TypeError("AbortSignal cannot be constructed directly");
  }
  get aborted() {
    const o2 = Tr.get(this);
    if (typeof o2 != "boolean")
      throw new TypeError(`Expected 'this' to be an 'AbortSignal' object, but got ${this === null ? "null" : typeof this}`);
    return o2;
  }
};
n(Un, "AbortSignal");
let pt = Un;
ki(pt.prototype, "abort");
function Ru() {
  const i = Object.create(pt.prototype);
  return Ce.call(i), Tr.set(i, false), i;
}
n(Ru, "createAbortSignal");
function Tu(i) {
  Tr.get(i) === false && (Tr.set(i, true), i.dispatchEvent({ type: "abort" }));
}
n(Tu, "abortSignal");
const Tr = /* @__PURE__ */ new WeakMap();
Object.defineProperties(pt.prototype, { aborted: { enumerable: true } }), typeof Symbol == "function" && typeof Symbol.toStringTag == "symbol" && Object.defineProperty(pt.prototype, Symbol.toStringTag, { configurable: true, value: "AbortSignal" });
let jn = (Ft = class {
  constructor() {
    qi.set(this, Ru());
  }
  get signal() {
    return Oi(this);
  }
  abort() {
    Tu(Oi(this));
  }
}, n(Ft, "AbortController"), Ft);
const qi = /* @__PURE__ */ new WeakMap();
function Oi(i) {
  const o2 = qi.get(i);
  if (o2 == null)
    throw new TypeError(`Expected 'this' to be an 'AbortController' object, but got ${i === null ? "null" : typeof i}`);
  return o2;
}
n(Oi, "getSignal"), Object.defineProperties(jn.prototype, { signal: { enumerable: true }, abort: { enumerable: true } }), typeof Symbol == "function" && typeof Symbol.toStringTag == "symbol" && Object.defineProperty(jn.prototype, Symbol.toStringTag, { configurable: true, value: "AbortController" });
var Cu = Object.defineProperty, Pu = n((i, o2) => Cu(i, "name", { value: o2, configurable: true }), "e");
const zi = wi;
Ii();
function Ii() {
  var _a2, _b2, _c;
  !((_b2 = (_a2 = globalThis.process) == null ? void 0 : _a2.versions) == null ? void 0 : _b2.node) && !((_c = globalThis.process) == null ? void 0 : _c.env.DISABLE_NODE_FETCH_NATIVE_WARN) && console.warn("[node-fetch-native] Node.js compatible build of `node-fetch-native` is being used in a non-Node.js environment. Please make sure you are using proper export conditions or report this issue to https://github.com/unjs/node-fetch-native. You can set `process.env.DISABLE_NODE_FETCH_NATIVE_WARN` to disable this warning.");
}
n(Ii, "s"), Pu(Ii, "checkNodeEnvironment");
var a = Object.defineProperty;
var t = (e, r) => a(e, "name", { value: r, configurable: true });
var f = Object.defineProperty, g = t((e, r) => f(e, "name", { value: r, configurable: true }), "e");
const o = !!((_b = (_a = globalThis.process) == null ? void 0 : _a.env) == null ? void 0 : _b.FORCE_NODE_FETCH);
function l() {
  return !o && globalThis.fetch ? globalThis.fetch : zi;
}
t(l, "p"), g(l, "_getFetch");
const s = l(), d = !o && globalThis.Headers || ye, A = !o && globalThis.AbortController || jn;
const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  const _value = value.trim();
  if (
    // eslint-disable-next-line unicorn/prefer-at
    value[0] === '"' && value.endsWith('"') && !value.includes("\\")
  ) {
    return _value.slice(1, -1);
  }
  if (_value.length <= 9) {
    const _lval = _value.toLowerCase();
    if (_lval === "true") {
      return true;
    }
    if (_lval === "false") {
      return false;
    }
    if (_lval === "undefined") {
      return void 0;
    }
    if (_lval === "null") {
      return null;
    }
    if (_lval === "nan") {
      return Number.NaN;
    }
    if (_lval === "infinity") {
      return Number.POSITIVE_INFINITY;
    }
    if (_lval === "-infinity") {
      return Number.NEGATIVE_INFINITY;
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}
class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if ((opts == null ? void 0 : opts.cause) && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  var _a2, _b2, _c, _d, _e;
  const errorMessage = ((_a2 = ctx.error) == null ? void 0 : _a2.message) || ((_b2 = ctx.error) == null ? void 0 : _b2.toString()) || "";
  const method = ((_c = ctx.request) == null ? void 0 : _c.method) || ((_d = ctx.options) == null ? void 0 : _d.method) || "GET";
  const url = ((_e = ctx.request) == null ? void 0 : _e.url) || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}
const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t2 = typeof value;
  if (t2 === "string" || t2 === "number" || t2 === "boolean" || t2 === null) {
    return true;
  }
  if (t2 !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function mergeFetchOptions(input, defaults, Headers2 = globalThis.Headers) {
  const merged = {
    ...defaults,
    ...input
  };
  if ((defaults == null ? void 0 : defaults.params) && (input == null ? void 0 : input.params)) {
    merged.params = {
      ...defaults == null ? void 0 : defaults.params,
      ...input == null ? void 0 : input.params
    };
  }
  if ((defaults == null ? void 0 : defaults.query) && (input == null ? void 0 : input.query)) {
    merged.query = {
      ...defaults == null ? void 0 : defaults.query,
      ...input == null ? void 0 : input.query
    };
  }
  if ((defaults == null ? void 0 : defaults.headers) && (input == null ? void 0 : input.headers)) {
    merged.headers = new Headers2((defaults == null ? void 0 : defaults.headers) || {});
    for (const [key, value] of new Headers2((input == null ? void 0 : input.headers) || {})) {
      merged.headers.set(key, value);
    }
  }
  return merged;
}
const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  //  Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch: fetch2 = globalThis.fetch,
    Headers: Headers2 = globalThis.Headers,
    AbortController: AbortController2 = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1,
          timeout: context.options.timeout
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    var _a2;
    const context = {
      request: _request,
      options: mergeFetchOptions(_options, globalOptions.defaults, Headers2),
      response: void 0,
      error: void 0
    };
    context.options.method = (_a2 = context.options.method) == null ? void 0 : _a2.toUpperCase();
    if (context.options.onRequest) {
      await context.options.onRequest(context);
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query || context.options.params) {
        context.request = withQuery(context.request, {
          ...context.options.params,
          ...context.options.query
        });
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        context.options.body = typeof context.options.body === "string" ? context.options.body : JSON.stringify(context.options.body);
        context.options.headers = new Headers2(context.options.headers || {});
        if (!context.options.headers.has("content-type")) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController2();
      setTimeout(() => controller.abort(), context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch2(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await context.options.onRequestError(context);
      }
      return await onError(context);
    }
    const hasBody = context.response.body && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await context.options.onResponse(context);
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await context.options.onResponseError(context);
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch2 = async function $fetch22(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch2.raw = $fetchRaw;
  $fetch2.native = (...args) => fetch2(...args);
  $fetch2.create = (defaultOptions = {}) => createFetch({
    ...globalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch2;
}
function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return s;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new Et.Agent(agentOptions);
  const httpsAgent = new vs.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return s(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch || createNodeFetch();
const Headers = globalThis.Headers || d;
const AbortController$1 = globalThis.AbortController || A;
const ofetch = createFetch({ fetch, Headers, AbortController: AbortController$1 });
const $fetch = ofetch;
if (!globalThis.$fetch) {
  globalThis.$fetch = $fetch.create({
    baseURL: baseURL()
  });
}
const nuxtAppCtx = /* @__PURE__ */ getContext("nuxt-app", {
  asyncContext: false
});
const NuxtPluginIndicator = "__nuxt_plugin";
function createNuxtApp(options) {
  let hydratingCount = 0;
  const nuxtApp = {
    _scope: effectScope(),
    provide: void 0,
    globalName: "nuxt",
    versions: {
      get nuxt() {
        return "3.10.2";
      },
      get vue() {
        return nuxtApp.vueApp.version;
      }
    },
    payload: reactive({
      data: {},
      state: {},
      once: /* @__PURE__ */ new Set(),
      _errors: {},
      ...{ serverRendered: true }
    }),
    static: {
      data: {}
    },
    runWithContext: (fn) => nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn)),
    isHydrating: false,
    deferHydration() {
      if (!nuxtApp.isHydrating) {
        return () => {
        };
      }
      hydratingCount++;
      let called = false;
      return () => {
        if (called) {
          return;
        }
        called = true;
        hydratingCount--;
        if (hydratingCount === 0) {
          nuxtApp.isHydrating = false;
          return nuxtApp.callHook("app:suspense:resolve");
        }
      };
    },
    _asyncDataPromises: {},
    _asyncData: {},
    _payloadRevivers: {},
    ...options
  };
  nuxtApp.hooks = createHooks();
  nuxtApp.hook = nuxtApp.hooks.hook;
  {
    const contextCaller = async function(hooks, args) {
      for (const hook of hooks) {
        await nuxtApp.runWithContext(() => hook(...args));
      }
    };
    nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, ...args);
  }
  nuxtApp.callHook = nuxtApp.hooks.callHook;
  nuxtApp.provide = (name, value) => {
    const $name = "$" + name;
    defineGetter(nuxtApp, $name, value);
    defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
  };
  defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
  defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
  {
    if (nuxtApp.ssrContext) {
      nuxtApp.ssrContext.nuxt = nuxtApp;
      nuxtApp.ssrContext._payloadReducers = {};
      nuxtApp.payload.path = nuxtApp.ssrContext.url;
    }
    nuxtApp.ssrContext = nuxtApp.ssrContext || {};
    if (nuxtApp.ssrContext.payload) {
      Object.assign(nuxtApp.payload, nuxtApp.ssrContext.payload);
    }
    nuxtApp.ssrContext.payload = nuxtApp.payload;
    nuxtApp.ssrContext.config = {
      public: options.ssrContext.runtimeConfig.public,
      app: options.ssrContext.runtimeConfig.app
    };
  }
  const runtimeConfig = options.ssrContext.runtimeConfig;
  nuxtApp.provide("config", runtimeConfig);
  return nuxtApp;
}
async function applyPlugin(nuxtApp, plugin) {
  if (plugin.hooks) {
    nuxtApp.hooks.addHooks(plugin.hooks);
  }
  if (typeof plugin === "function") {
    const { provide: provide2 } = await nuxtApp.runWithContext(() => plugin(nuxtApp)) || {};
    if (provide2 && typeof provide2 === "object") {
      for (const key in provide2) {
        nuxtApp.provide(key, provide2[key]);
      }
    }
  }
}
async function applyPlugins(nuxtApp, plugins2) {
  var _a2, _b2;
  const resolvedPlugins = [];
  const unresolvedPlugins = [];
  const parallels = [];
  const errors = [];
  let promiseDepth = 0;
  async function executePlugin(plugin) {
    var _a3;
    const unresolvedPluginsForThisPlugin = ((_a3 = plugin.dependsOn) == null ? void 0 : _a3.filter((name) => plugins2.some((p) => p._name === name) && !resolvedPlugins.includes(name))) ?? [];
    if (unresolvedPluginsForThisPlugin.length > 0) {
      unresolvedPlugins.push([new Set(unresolvedPluginsForThisPlugin), plugin]);
    } else {
      const promise = applyPlugin(nuxtApp, plugin).then(async () => {
        if (plugin._name) {
          resolvedPlugins.push(plugin._name);
          await Promise.all(unresolvedPlugins.map(async ([dependsOn, unexecutedPlugin]) => {
            if (dependsOn.has(plugin._name)) {
              dependsOn.delete(plugin._name);
              if (dependsOn.size === 0) {
                promiseDepth++;
                await executePlugin(unexecutedPlugin);
              }
            }
          }));
        }
      });
      if (plugin.parallel) {
        parallels.push(promise.catch((e) => errors.push(e)));
      } else {
        await promise;
      }
    }
  }
  for (const plugin of plugins2) {
    if (((_a2 = nuxtApp.ssrContext) == null ? void 0 : _a2.islandContext) && ((_b2 = plugin.env) == null ? void 0 : _b2.islands) === false) {
      continue;
    }
    await executePlugin(plugin);
  }
  await Promise.all(parallels);
  if (promiseDepth) {
    for (let i = 0; i < promiseDepth; i++) {
      await Promise.all(parallels);
    }
  }
  if (errors.length) {
    throw errors[0];
  }
}
// @__NO_SIDE_EFFECTS__
function defineNuxtPlugin(plugin) {
  if (typeof plugin === "function") {
    return plugin;
  }
  const _name = plugin._name || plugin.name;
  delete plugin.name;
  return Object.assign(plugin.setup || (() => {
  }), plugin, { [NuxtPluginIndicator]: true, _name });
}
function callWithNuxt(nuxt, setup, args) {
  const fn = () => args ? setup(...args) : setup();
  {
    return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
  }
}
// @__NO_SIDE_EFFECTS__
function tryUseNuxtApp() {
  var _a2;
  let nuxtAppInstance;
  if (hasInjectionContext()) {
    nuxtAppInstance = (_a2 = getCurrentInstance()) == null ? void 0 : _a2.appContext.app.$nuxt;
  }
  nuxtAppInstance = nuxtAppInstance || nuxtAppCtx.tryUse();
  return nuxtAppInstance || null;
}
// @__NO_SIDE_EFFECTS__
function useNuxtApp() {
  const nuxtAppInstance = /* @__PURE__ */ tryUseNuxtApp();
  if (!nuxtAppInstance) {
    {
      throw new Error("[nuxt] instance unavailable");
    }
  }
  return nuxtAppInstance;
}
// @__NO_SIDE_EFFECTS__
function useRuntimeConfig(_event) {
  return (/* @__PURE__ */ useNuxtApp()).$config;
}
function defineGetter(obj, key, val) {
  Object.defineProperty(obj, key, { get: () => val });
}
const PageRouteSymbol = Symbol("route");
const useRouter = () => {
  var _a2;
  return (_a2 = /* @__PURE__ */ useNuxtApp()) == null ? void 0 : _a2.$router;
};
const useRoute = () => {
  if (hasInjectionContext()) {
    return inject(PageRouteSymbol, (/* @__PURE__ */ useNuxtApp())._route);
  }
  return (/* @__PURE__ */ useNuxtApp())._route;
};
// @__NO_SIDE_EFFECTS__
function defineNuxtRouteMiddleware(middleware) {
  return middleware;
}
const isProcessingMiddleware = () => {
  try {
    if ((/* @__PURE__ */ useNuxtApp())._processingMiddleware) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
};
const navigateTo = (to, options) => {
  if (!to) {
    to = "/";
  }
  const toPath = typeof to === "string" ? to : withQuery(to.path || "/", to.query || {}) + (to.hash || "");
  if (options == null ? void 0 : options.open) {
    return Promise.resolve();
  }
  const isExternal = (options == null ? void 0 : options.external) || hasProtocol(toPath, { acceptRelative: true });
  if (isExternal) {
    if (!(options == null ? void 0 : options.external)) {
      throw new Error("Navigating to an external URL is not allowed by default. Use `navigateTo(url, { external: true })`.");
    }
    const protocol = parseURL(toPath).protocol;
    if (protocol && isScriptProtocol(protocol)) {
      throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`);
    }
  }
  const inMiddleware = isProcessingMiddleware();
  const router = useRouter();
  const nuxtApp = /* @__PURE__ */ useNuxtApp();
  {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
      const location2 = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
      const redirect = async function(response) {
        await nuxtApp.callHook("app:redirected");
        const encodedLoc = location2.replace(/"/g, "%22");
        nuxtApp.ssrContext._renderResponse = {
          statusCode: sanitizeStatusCode((options == null ? void 0 : options.redirectCode) || 302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: location2 }
        };
        return response;
      };
      if (!isExternal && inMiddleware) {
        router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
        return to;
      }
      return redirect(!inMiddleware ? void 0 : (
        /* abort route navigation */
        false
      ));
    }
  }
  if (isExternal) {
    nuxtApp._scope.stop();
    if (options == null ? void 0 : options.replace) {
      (void 0).replace(toPath);
    } else {
      (void 0).href = toPath;
    }
    if (inMiddleware) {
      if (!nuxtApp.isHydrating) {
        return false;
      }
      return new Promise(() => {
      });
    }
    return Promise.resolve();
  }
  return (options == null ? void 0 : options.replace) ? router.replace(to) : router.push(to);
};
const NUXT_ERROR_SIGNATURE = "__nuxt_error";
const useError = () => toRef((/* @__PURE__ */ useNuxtApp()).payload, "error");
const showError = (error) => {
  const nuxtError = createError(error);
  try {
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    const error2 = useError();
    if (false)
      ;
    error2.value = error2.value || nuxtError;
  } catch {
    throw nuxtError;
  }
  return nuxtError;
};
const isNuxtError = (error) => !!error && typeof error === "object" && NUXT_ERROR_SIGNATURE in error;
const createError = (error) => {
  const nuxtError = createError$1(error);
  Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
    value: true,
    configurable: false,
    writable: false
  });
  return nuxtError;
};
version.startsWith("3");
function resolveUnref(r) {
  return typeof r === "function" ? r() : unref(r);
}
function resolveUnrefHeadInput(ref2, lastKey = "") {
  if (ref2 instanceof Promise)
    return ref2;
  const root = resolveUnref(ref2);
  if (!ref2 || !root)
    return root;
  if (Array.isArray(root))
    return root.map((r) => resolveUnrefHeadInput(r, lastKey));
  if (typeof root === "object") {
    return Object.fromEntries(
      Object.entries(root).map(([k, v]) => {
        if (k === "titleTemplate" || k.startsWith("on"))
          return [k, unref(v)];
        return [k, resolveUnrefHeadInput(v, k)];
      })
    );
  }
  return root;
}
const headSymbol = "usehead";
const _global = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
const globalKey$1 = "__unhead_injection_handler__";
function setHeadInjectionHandler(handler) {
  _global[globalKey$1] = handler;
}
function injectHead() {
  if (globalKey$1 in _global) {
    return _global[globalKey$1]();
  }
  const head = inject(headSymbol);
  if (!head && "production" !== "production")
    console.warn("Unhead is missing Vue context, falling back to shared context. This may have unexpected results.");
  return head || getActiveHead();
}
function useHead(input, options = {}) {
  const head = options.head || injectHead();
  if (head) {
    if (!head.ssr)
      return clientUseHead(head, input, options);
    return head.push(input, options);
  }
}
function clientUseHead(head, input, options = {}) {
  const deactivated = ref(false);
  const resolvedInput = ref({});
  watchEffect(() => {
    resolvedInput.value = deactivated.value ? {} : resolveUnrefHeadInput(input);
  });
  const entry2 = head.push(resolvedInput.value, options);
  watch(resolvedInput, (e) => {
    entry2.patch(e);
  });
  getCurrentInstance();
  return entry2;
}
const unhead_f0ZT0uZ7Xv = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:head",
  enforce: "pre",
  setup(nuxtApp) {
    const head = nuxtApp.ssrContext.head;
    setHeadInjectionHandler(
      // need a fresh instance of the nuxt app to avoid parallel requests interfering with each other
      () => (/* @__PURE__ */ useNuxtApp()).vueApp._context.provides.usehead
    );
    nuxtApp.vueApp.use(head);
  }
});
function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als && currentInstance === void 0) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      contexts[key];
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
_globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
const manifest_45route_45rule = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  {
    return;
  }
});
const globalMiddleware = [
  manifest_45route_45rule
];
function getRouteFromPath(fullPath) {
  if (typeof fullPath === "object") {
    fullPath = stringifyParsedURL({
      pathname: fullPath.path || "",
      search: stringifyQuery(fullPath.query || {}),
      hash: fullPath.hash || ""
    });
  }
  const url = parseURL(fullPath.toString());
  return {
    path: url.pathname,
    fullPath,
    query: parseQuery(url.search),
    hash: url.hash,
    // stub properties for compat with vue-router
    params: {},
    name: void 0,
    matched: [],
    redirectedFrom: void 0,
    meta: {},
    href: fullPath
  };
}
const router_bZeszJbmOa = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:router",
  enforce: "pre",
  setup(nuxtApp) {
    const initialURL = nuxtApp.ssrContext.url;
    const routes = [];
    const hooks = {
      "navigate:before": [],
      "resolve:before": [],
      "navigate:after": [],
      error: []
    };
    const registerHook = (hook, guard) => {
      hooks[hook].push(guard);
      return () => hooks[hook].splice(hooks[hook].indexOf(guard), 1);
    };
    (/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
    const route = reactive(getRouteFromPath(initialURL));
    async function handleNavigation(url, replace) {
      try {
        const to = getRouteFromPath(url);
        for (const middleware of hooks["navigate:before"]) {
          const result = await middleware(to, route);
          if (result === false || result instanceof Error) {
            return;
          }
          if (typeof result === "string" && result.length) {
            return handleNavigation(result, true);
          }
        }
        for (const handler of hooks["resolve:before"]) {
          await handler(to, route);
        }
        Object.assign(route, to);
        if (false)
          ;
        for (const middleware of hooks["navigate:after"]) {
          await middleware(to, route);
        }
      } catch (err) {
        for (const handler of hooks.error) {
          await handler(err);
        }
      }
    }
    const currentRoute = computed(() => route);
    const router = {
      currentRoute,
      isReady: () => Promise.resolve(),
      // These options provide a similar API to vue-router but have no effect
      options: {},
      install: () => Promise.resolve(),
      // Navigation
      push: (url) => handleNavigation(url),
      replace: (url) => handleNavigation(url),
      back: () => (void 0).history.go(-1),
      go: (delta) => (void 0).history.go(delta),
      forward: () => (void 0).history.go(1),
      // Guards
      beforeResolve: (guard) => registerHook("resolve:before", guard),
      beforeEach: (guard) => registerHook("navigate:before", guard),
      afterEach: (guard) => registerHook("navigate:after", guard),
      onError: (handler) => registerHook("error", handler),
      // Routes
      resolve: getRouteFromPath,
      addRoute: (parentName, route2) => {
        routes.push(route2);
      },
      getRoutes: () => routes,
      hasRoute: (name) => routes.some((route2) => route2.name === name),
      removeRoute: (name) => {
        const index = routes.findIndex((route2) => route2.name === name);
        if (index !== -1) {
          routes.splice(index, 1);
        }
      }
    };
    nuxtApp.vueApp.component("RouterLink", defineComponent({
      functional: true,
      props: {
        to: {
          type: String,
          required: true
        },
        custom: Boolean,
        replace: Boolean,
        // Not implemented
        activeClass: String,
        exactActiveClass: String,
        ariaCurrentValue: String
      },
      setup: (props, { slots }) => {
        const navigate = () => handleNavigation(props.to, props.replace);
        return () => {
          var _a2;
          const route2 = router.resolve(props.to);
          return props.custom ? (_a2 = slots.default) == null ? void 0 : _a2.call(slots, { href: props.to, navigate, route: route2 }) : h("a", { href: props.to, onClick: (e) => {
            e.preventDefault();
            return navigate();
          } }, slots);
        };
      }
    }));
    nuxtApp._route = route;
    nuxtApp._middleware = nuxtApp._middleware || {
      global: [],
      named: {}
    };
    const initialLayout = nuxtApp.payload.state._layout;
    nuxtApp.hooks.hookOnce("app:created", async () => {
      router.beforeEach(async (to, from) => {
        var _a2;
        to.meta = reactive(to.meta || {});
        if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) {
          to.meta.layout = initialLayout;
        }
        nuxtApp._processingMiddleware = true;
        if (!((_a2 = nuxtApp.ssrContext) == null ? void 0 : _a2.islandContext)) {
          const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
          for (const middleware of middlewareEntries) {
            const result = await nuxtApp.runWithContext(() => middleware(to, from));
            {
              if (result === false || result instanceof Error) {
                const error = result || createError$1({
                  statusCode: 404,
                  statusMessage: `Page Not Found: ${initialURL}`,
                  data: {
                    path: initialURL
                  }
                });
                delete nuxtApp._processingMiddleware;
                return nuxtApp.runWithContext(() => showError(error));
              }
            }
            if (result === true) {
              continue;
            }
            if (result || result === false) {
              return result;
            }
          }
        }
      });
      router.afterEach(() => {
        delete nuxtApp._processingMiddleware;
      });
      await router.replace(initialURL);
      if (!isEqual(route.fullPath, initialURL)) {
        await nuxtApp.runWithContext(() => navigateTo(route.fullPath));
      }
    });
    return {
      provide: {
        route,
        router
      }
    };
  }
});
function definePayloadReducer(name, reduce) {
  {
    (/* @__PURE__ */ useNuxtApp()).ssrContext._payloadReducers[name] = reduce;
  }
}
const reducers = {
  NuxtError: (data) => isNuxtError(data) && data.toJSON(),
  EmptyShallowRef: (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_"),
  EmptyRef: (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_"),
  ShallowRef: (data) => isRef(data) && isShallow(data) && data.value,
  ShallowReactive: (data) => isReactive(data) && isShallow(data) && toRaw(data),
  Ref: (data) => isRef(data) && data.value,
  Reactive: (data) => isReactive(data) && toRaw(data)
};
const revive_payload_server_LySgel90iV = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:revive-payload:server",
  setup() {
    for (const reducer in reducers) {
      definePayloadReducer(reducer, reducers[reducer]);
    }
  }
});
const components_plugin_KR1HBZs4kY = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:global-components"
});
const plugins = [
  unhead_f0ZT0uZ7Xv,
  router_bZeszJbmOa,
  revive_payload_server_LySgel90iV,
  components_plugin_KR1HBZs4kY
];
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main$3 = {
  __name: "welcome",
  __ssrInlineRender: true,
  props: {
    appName: {
      type: String,
      default: "Nuxt"
    },
    version: {
      type: String,
      default: ""
    },
    title: {
      type: String,
      default: "Welcome to Nuxt!"
    },
    readDocs: {
      type: String,
      default: "We highly recommend you take a look at the Nuxt documentation, whether you are new or have previous experience with the framework."
    },
    followTwitter: {
      type: String,
      default: "Follow the Nuxt Twitter account to get latest news about releases, new modules, tutorials and tips."
    },
    starGitHub: {
      type: String,
      default: "Nuxt is open source and the code is available on GitHub, feel free to star it, participate in discussions or dive into the source."
    }
  },
  setup(__props) {
    const props = __props;
    useHead({
      title: `${props.title}`,
      script: [],
      style: [
        {
          children: `@property --gradient-angle{syntax:'<angle>';inherits:false;initial-value:180deg}@keyframes gradient-rotate{0%{--gradient-angle:0deg}100%{--gradient-angle:360deg}}*,:before,:after{-webkit-box-sizing:border-box;box-sizing:border-box;border-width:0;border-style:solid;border-color:#e0e0e0}*{--tw-ring-inset:var(--tw-empty, );--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(14, 165, 233, .5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000}:root{-moz-tab-size:4;-o-tab-size:4;tab-size:4}a{color:inherit;text-decoration:inherit}body{margin:0;font-family:inherit;line-height:inherit}html{-webkit-text-size-adjust:100%;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,"Apple Color Emoji","Segoe UI Emoji",Segoe UI Symbol,"Noto Color Emoji";line-height:1.5}h1,p,h2,h3{margin:0}h1,h2,h3{font-size:inherit;font-weight:inherit}img{border-style:solid;max-width:100%;height:auto}svg,img{display:block;vertical-align:middle}ul{list-style:none;margin:0;padding:0}`
        }
      ]
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "antialiased bg-white dark:bg-black text-black dark:text-white min-h-screen place-content-center flex flex-col items-center justify-center text-sm sm:text-base" }, _attrs))} data-v-7af2ada2><div class="flex-1 flex flex-col gap-y-16 py-14" data-v-7af2ada2><div class="flex flex-col gap-y-4 items-center justify-center" data-v-7af2ada2><a href="https://nuxt.com" target="_blank" data-v-7af2ada2><svg width="61" height="42" viewBox="0 0 61 42" fill="none" xmlns="http://www.w3.org/2000/svg" data-v-7af2ada2><path d="M33.9869 41.2211H56.412C57.1243 41.2212 57.824 41.0336 58.4408 40.6772C59.0576 40.3209 59.5698 39.8083 59.9258 39.191C60.2818 38.5737 60.469 37.8736 60.4687 37.1609C60.4684 36.4482 60.2805 35.7482 59.924 35.1313L44.864 9.03129C44.508 8.41416 43.996 7.90168 43.3793 7.54537C42.7626 7.18906 42.063 7.00147 41.3509 7.00147C40.6387 7.00147 39.9391 7.18906 39.3225 7.54537C38.7058 7.90168 38.1937 8.41416 37.8377 9.03129L33.9869 15.7093L26.458 2.65061C26.1018 2.03354 25.5895 1.52113 24.9726 1.16489C24.3557 0.808639 23.656 0.621094 22.9438 0.621094C22.2316 0.621094 21.5318 0.808639 20.915 1.16489C20.2981 1.52113 19.7858 2.03354 19.4296 2.65061L0.689224 35.1313C0.332704 35.7482 0.144842 36.4482 0.144532 37.1609C0.144222 37.8736 0.331476 38.5737 0.687459 39.191C1.04344 39.8083 1.5556 40.3209 2.17243 40.6772C2.78925 41.0336 3.48899 41.2212 4.20126 41.2211H18.2778C23.8551 41.2211 27.9682 38.7699 30.7984 33.9876L37.6694 22.0813L41.3498 15.7093L52.3951 34.8492H37.6694L33.9869 41.2211ZM18.0484 34.8426L8.2247 34.8404L22.9504 9.32211L30.2979 22.0813L25.3784 30.6092C23.4989 33.7121 21.3637 34.8426 18.0484 34.8426Z" fill="#00DC82" data-v-7af2ada2></path></svg></a><h1 class="text-black dark:text-white text-4xl sm:text-5xl font-semibold text-center" data-v-7af2ada2>Welcome to Nuxt!</h1></div><div class="grid grid-cols-2 lg:grid-cols-10 gap-6 max-w-[960px] px-4" data-v-7af2ada2><div class="col-span-2 lg:col-span-10 relative get-started-gradient-border" data-v-7af2ada2><div class="get-started-gradient-left absolute left-0 inset-y-0 w-[20%] bg-gradient-to-r to-transparent from-green-400 rounded-xl z-1 transition-opacity duration-300" data-v-7af2ada2></div><div class="get-started-gradient-right absolute right-0 inset-y-0 w-[20%] bg-gradient-to-l to-transparent from-blue-400 rounded-xl z-1 transition-opacity duration-300" data-v-7af2ada2></div><div class="w-full absolute inset-x-0 flex justify-center -top-[58px]" data-v-7af2ada2><img src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22105%22%20height%3D%22116%22%20fill%3D%22none%22%3E%3Cg%20filter%3D%22url(%23a)%22%20shape-rendering%3D%22geometricPrecision%22%3E%3Cpath%20fill%3D%22%2318181B%22%20d%3D%22M17.203%2033.223%2046.9%2014.286a8.416%208.416%200%200%201%208.64-.18L87.38%2031.97c2.68%201.527%204.365%204.409%204.428%207.571l.191%2034.944c.063%203.151-1.491%206.104-4.091%207.776l-30.143%2019.383a8.417%208.417%200%200%201-8.75.251l-31.126-17.73C15.135%2082.595%2012.98%2079.6%2013%2076.35V40.828c.02-3.111%201.614-5.994%204.203-7.605Z%22%2F%3E%3Cpath%20stroke%3D%22url(%23b)%22%20stroke-width%3D%222%22%20d%3D%22M46.9%2014.286%2017.202%2033.223c-2.59%201.61-4.183%204.494-4.203%207.605V76.35m33.9-62.064a8.416%208.416%200%200%201%208.64-.18m-8.64.18a8.435%208.435%200%200%201%208.64-.18M13%2076.35c-.02%203.25%202.135%206.246%204.888%207.814M13%2076.35c-.02%203.233%202.136%206.247%204.888%207.814m0%200%2031.126%2017.731m0%200a8.417%208.417%200%200%200%208.75-.251m-8.75.251a8.438%208.438%200%200%200%208.75-.251m0%200%2030.143-19.383m0%200c2.598-1.67%204.154-4.627%204.091-7.776m-4.091%207.776c2.6-1.672%204.154-4.625%204.091-7.776m0%200-.19-34.944m0%200c-.064-3.162-1.75-6.044-4.43-7.571m4.43%207.571c-.063-3.147-1.75-6.045-4.43-7.571m0%200L55.54%2014.105%22%2F%3E%3C%2Fg%3E%3Cpath%20fill%3D%22url(%23c)%22%20d%3D%22M48.669%2067.696c-.886%202.69-3.02%204.659-6.153%205.709-1.41.465-2.88.72-4.364.755a1.313%201.313%200%200%201-1.312-1.313c.035-1.484.29-2.954.754-4.364%201.05-3.133%203.02-5.266%205.71-6.152a1.312%201.312%200%201%201%20.836%202.477c-3.232%201.083-4.232%204.577-4.544%206.595%202.018-.311%205.512-1.312%206.595-4.544a1.313%201.313%200%200%201%202.477.837Zm16.39-12.486-1.46%201.477v10.057a2.657%202.657%200%200%201-.772%201.854l-5.316%205.3a2.559%202.559%200%200%201-1.853.77%202.413%202.413%200%200%201-.755-.115%202.624%202.624%200%200%201-1.821-2.001l-1.296-6.48-6.858-6.858-6.48-1.297a2.625%202.625%200%200%201-2.002-1.82%202.609%202.609%200%200%201%20.656-2.61l5.3-5.315a2.658%202.658%200%200%201%201.853-.771h10.057l1.477-1.46c4.692-4.692%209.499-4.561%2011.353-4.282a2.576%202.576%200%200%201%202.198%202.198c.28%201.854.41%206.661-4.282%2011.353Zm-26.103.132%206.185%201.23%206.546-6.546h-7.432l-5.299%205.316Zm8.482%202.657L53%2063.561l10.205-10.205c1.28-1.28%204.2-4.724%203.543-9.105-4.38-.656-7.826%202.264-9.105%203.544L47.438%2057.999Zm13.535%201.313-6.546%206.546%201.23%206.185%205.316-5.299v-7.432Z%22%20shape-rendering%3D%22geometricPrecision%22%2F%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22b%22%20x1%3D%2257.994%22%20x2%3D%2292%22%20y1%3D%2258%22%20y2%3D%2258%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%231DE0B1%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2336E4DA%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22c%22%20x1%3D%2255.197%22%20x2%3D%2269.453%22%20y1%3D%2258.107%22%20y2%3D%2258.107%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%231DE0B1%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2336E4DA%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22a%22%20width%3D%22104.897%22%20height%3D%22115.897%22%20x%3D%22.052%22%20y%3D%22.052%22%20color-interpolation-filters%3D%22sRGB%22%20filterUnits%3D%22userSpaceOnUse%22%3E%3CfeFlood%20flood-opacity%3D%220%22%20result%3D%22BackgroundImageFix%22%2F%3E%3CfeColorMatrix%20in%3D%22SourceAlpha%22%20result%3D%22hardAlpha%22%20values%3D%220%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20127%200%22%2F%3E%3CfeOffset%2F%3E%3CfeGaussianBlur%20stdDeviation%3D%225.974%22%2F%3E%3CfeComposite%20in2%3D%22hardAlpha%22%20operator%3D%22out%22%2F%3E%3CfeColorMatrix%20values%3D%220%200%200%200%201%200%200%200%200%201%200%200%200%200%201%200%200%200%200.07%200%22%2F%3E%3CfeBlend%20in2%3D%22BackgroundImageFix%22%20result%3D%22effect1_dropShadow_2724_4091%22%2F%3E%3CfeBlend%20in%3D%22SourceGraphic%22%20in2%3D%22effect1_dropShadow_2724_4091%22%20result%3D%22shape%22%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3C%2Fsvg%3E%0A" class="hidden dark:block" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22105%22%20height%3D%22116%22%20fill%3D%22none%22%3E%3Cg%20filter%3D%22url(%23a)%22%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M17.203%2033.223%2046.9%2014.286a8.416%208.416%200%200%201%208.64-.18L87.38%2031.97c2.68%201.527%204.365%204.409%204.428%207.571l.191%2034.944c.063%203.151-1.491%206.104-4.091%207.776l-30.143%2019.383a8.417%208.417%200%200%201-8.75.251l-31.126-17.73C15.135%2082.595%2012.98%2079.6%2013%2076.35V40.828c.02-3.111%201.614-5.994%204.203-7.605Z%22%2F%3E%3Cpath%20stroke%3D%22url(%23b)%22%20stroke-width%3D%222%22%20d%3D%22M46.9%2014.286%2017.202%2033.223c-2.59%201.61-4.183%204.494-4.203%207.605V76.35m33.9-62.064a8.416%208.416%200%200%201%208.64-.18m-8.64.18a8.435%208.435%200%200%201%208.64-.18M13%2076.35c-.02%203.25%202.135%206.246%204.888%207.814M13%2076.35c-.02%203.233%202.136%206.247%204.888%207.814m0%200%2031.126%2017.731m0%200a8.417%208.417%200%200%200%208.75-.251m-8.75.251a8.438%208.438%200%200%200%208.75-.251m0%200%2030.143-19.383m0%200c2.598-1.67%204.154-4.627%204.091-7.776m-4.091%207.776c2.6-1.672%204.154-4.625%204.091-7.776m0%200-.19-34.944m0%200c-.064-3.162-1.75-6.044-4.43-7.571m4.43%207.571c-.063-3.147-1.75-6.045-4.43-7.571m0%200L55.54%2014.105%22%2F%3E%3C%2Fg%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M32%2037h42v42H32z%22%2F%3E%3Cpath%20fill%3D%22url(%23c)%22%20d%3D%22M48.669%2067.697c-.886%202.69-3.02%204.659-6.153%205.709-1.41.465-2.88.72-4.364.755a1.313%201.313%200%200%201-1.312-1.313c.035-1.484.29-2.954.754-4.364%201.05-3.134%203.02-5.266%205.71-6.152a1.314%201.314%200%201%201%20.836%202.477c-3.232%201.083-4.232%204.577-4.544%206.595%202.018-.311%205.512-1.312%206.595-4.544a1.313%201.313%200%200%201%202.477.837Zm16.39-12.486-1.46%201.477v10.057a2.657%202.657%200%200%201-.772%201.854l-5.316%205.3a2.559%202.559%200%200%201-1.853.77%202.413%202.413%200%200%201-.755-.115%202.626%202.626%200%200%201-1.821-2.001l-1.296-6.48-6.858-6.858-6.48-1.297a2.625%202.625%200%200%201-2.002-1.82%202.609%202.609%200%200%201%20.656-2.61l5.3-5.315a2.658%202.658%200%200%201%201.853-.771h10.057l1.477-1.46c4.692-4.692%209.499-4.561%2011.353-4.282a2.576%202.576%200%200%201%202.198%202.198c.28%201.854.41%206.661-4.282%2011.353Zm-26.103.132%206.185%201.23%206.546-6.546h-7.432l-5.299%205.316ZM47.438%2058%2053%2063.562l10.205-10.204c1.28-1.28%204.2-4.725%203.543-9.106-4.38-.656-7.826%202.264-9.105%203.544L47.438%2058Zm13.535%201.313-6.546%206.546%201.23%206.185%205.316-5.299v-7.432Z%22%2F%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22b%22%20x1%3D%2257.994%22%20x2%3D%2292%22%20y1%3D%2258%22%20y2%3D%2258%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%231DE0B1%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2336E4DA%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22c%22%20x1%3D%2255.197%22%20x2%3D%2269.453%22%20y1%3D%2258.108%22%20y2%3D%2258.108%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%231DE0B1%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2336E4DA%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22a%22%20width%3D%22104.897%22%20height%3D%22115.897%22%20x%3D%22.052%22%20y%3D%22.052%22%20color-interpolation-filters%3D%22sRGB%22%20filterUnits%3D%22userSpaceOnUse%22%3E%3CfeFlood%20flood-opacity%3D%220%22%20result%3D%22BackgroundImageFix%22%2F%3E%3CfeColorMatrix%20in%3D%22SourceAlpha%22%20result%3D%22hardAlpha%22%20values%3D%220%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20127%200%22%2F%3E%3CfeOffset%2F%3E%3CfeGaussianBlur%20stdDeviation%3D%225.974%22%2F%3E%3CfeComposite%20in2%3D%22hardAlpha%22%20operator%3D%22out%22%2F%3E%3CfeColorMatrix%20values%3D%220%200%200%200%201%200%200%200%200%201%200%200%200%200%201%200%200%200%200.07%200%22%2F%3E%3CfeBlend%20in2%3D%22BackgroundImageFix%22%20result%3D%22effect1_dropShadow_2726_4054%22%2F%3E%3CfeBlend%20in%3D%22SourceGraphic%22%20in2%3D%22effect1_dropShadow_2726_4054%22%20result%3D%22shape%22%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3C%2Fsvg%3E%0A" class="dark:hidden" data-v-7af2ada2></div><div class="flex flex-col rounded-xl items-center gap-y-4 pt-[58px] px-4 sm:px-28 pb-6 z-10" data-v-7af2ada2><h2 class="font-semibold text-2xl text-black dark:text-white" data-v-7af2ada2>Get started</h2><p class="mb-2 text-center" data-v-7af2ada2>Remove this welcome page by replacing <a class="bg-gray-100 dark:bg-white/10 rounded font-mono p-1 font-bold" data-v-7af2ada2>&lt;NuxtWelcome /&gt;</a> in <a href="https://nuxt.com/docs/guide/directory-structure/app" target="_blank" rel="noopener" class="bg-gray-100 dark:bg-white/10 rounded font-mono p-1 font-bold" data-v-7af2ada2>app.vue</a> with your own code.</p></div></div><div class="lg:min-h-min sm:min-h-[220px] md:min-h-[180px] col-span-2 sm:col-span-1 lg:col-span-6 text-black dark:text-white rounded-xl modules-container relative items-center justify-center border border-gray-200 dark:border-transparent hover:border-transparent" data-v-7af2ada2><div class="gradient-border gradient-border-modules gradient-border-rect" data-v-7af2ada2></div><div class="modules-gradient-right absolute right-0 inset-y-0 w-[20%] bg-gradient-to-l to-transparent from-yellow-400 rounded-xl z-1 transition-opacity duration-300" data-v-7af2ada2></div><a href="https://nuxt.com/modules" target="_blank" class="py-6 px-5 rounded-xl flex items-center justify-center gap-x-4 dark:border-none bg-white dark:bg-gray-900 sm:min-h-[220px] md:min-h-[180px] lg:min-h-min" data-v-7af2ada2><img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20clip-path%3D%22url(%23clip0_2613_3853)%22%3E%0A%3Cpath%20d%3D%22M51.1519%2039.8821C51.154%2039.9844%2051.1527%2040.0863%2051.148%2040.1877C51.0782%2041.7091%2050.2566%2043.1165%2048.9325%2043.9357L29.0918%2056.2117C27.6504%2057.1035%2025.8212%2057.1564%2024.3387%2056.3439L3.85107%2045.1148C2.27157%2044.2491%201.14238%2042.6366%201.15291%2041.0494L1.15293%2041.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4169%201.73583%2026.2139%201.69824%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8136C50.0797%2014.6078%2050.9898%2016.1132%2051.026%2017.7438L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821Z%22%20fill%3D%22white%22%20stroke%3D%22url(%23paint0_linear_2613_3853)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M33.8193%2042.2552H17.8193C16.7585%2042.2552%2015.7411%2041.8337%2014.9909%2041.0836C14.2408%2040.3334%2013.8193%2039.316%2013.8193%2038.2552V24.9218C13.8193%2023.861%2014.2408%2022.8435%2014.9909%2022.0934C15.7411%2021.3433%2016.7585%2020.9218%2017.8193%2020.9218H19.1527C19.1751%2019.792%2019.5558%2018.6985%2020.2399%2017.7991C20.924%2016.8996%2021.8761%2016.2407%2022.9589%2015.9173C24.0416%2015.594%2025.1992%2015.6229%2026.2644%2016C27.3297%2016.377%2028.2477%2017.0827%2028.886%2018.0152C29.4839%2018.8674%2029.8094%2019.8808%2029.8193%2020.9218H33.8193C34.173%2020.9218%2034.5121%2021.0623%2034.7621%2021.3124C35.0122%2021.5624%2035.1527%2021.9015%2035.1527%2022.2552V26.2552C36.2825%2026.2776%2037.376%2026.6583%2038.2754%2027.3424C39.1749%2028.0265%2039.8338%2028.9786%2040.1572%2030.0613C40.4805%2031.1441%2040.4516%2032.3016%2040.0745%2033.3669C39.6975%2034.4322%2038.9918%2035.3502%2038.0593%2035.9885C37.2071%2036.5864%2036.1937%2036.9118%2035.1527%2036.9218V36.9218V40.9218C35.1527%2041.2755%2035.0122%2041.6146%2034.7621%2041.8646C34.5121%2042.1147%2034.173%2042.2552%2033.8193%2042.2552ZM17.8193%2023.5885C17.4657%2023.5885%2017.1266%2023.729%2016.8765%2023.979C16.6265%2024.2291%2016.486%2024.5682%2016.486%2024.9218V38.2552C16.486%2038.6088%2016.6265%2038.9479%2016.8765%2039.198C17.1266%2039.448%2017.4657%2039.5885%2017.8193%2039.5885H32.486V35.3485C32.4849%2035.1347%2032.5351%2034.9238%2032.6326%2034.7335C32.7301%2034.5432%2032.8718%2034.3792%2033.046%2034.2552C33.2196%2034.1313%2033.4204%2034.051%2033.6316%2034.0208C33.8427%2033.9907%2034.058%2034.0116%2034.2593%2034.0818C34.6393%2034.2368%2035.0532%2034.2901%2035.46%2034.2363C35.8669%2034.1825%2036.2527%2034.0236%2036.5793%2033.7752C36.9045%2033.5769%2037.1834%2033.3113%2037.3973%2032.9962C37.6111%2032.6811%2037.7551%2032.3239%2037.8193%2031.9485C37.8708%2031.5699%2037.8402%2031.1847%2037.7298%2030.8189C37.6194%2030.4532%2037.4317%2030.1154%2037.1793%2029.8285C36.8381%2029.414%2036.3734%2029.1193%2035.8529%2028.9874C35.3325%2028.8555%2034.7835%2028.8932%2034.286%2029.0952C34.0846%2029.1654%2033.8694%2029.1863%2033.6582%2029.1562C33.4471%2029.126%2033.2463%2029.0457%2033.0727%2028.9218C32.8985%2028.7978%2032.7567%2028.6338%2032.6593%2028.4435C32.5618%2028.2532%2032.5115%2028.0423%2032.5127%2027.8285V23.5885H28.246C28.0269%2023.6009%2027.8081%2023.559%2027.609%2023.4666C27.4099%2023.3742%2027.2368%2023.234%2027.1049%2023.0586C26.973%2022.8832%2026.8864%2022.6779%2026.8529%2022.461C26.8194%2022.2441%2026.8399%2022.0222%2026.9127%2021.8152C27.0677%2021.4352%2027.1209%2021.0213%2027.0671%2020.6145C27.0134%2020.2076%2026.8544%2019.8218%2026.606%2019.4952C26.4091%2019.1607%2026.1395%2018.8749%2025.8172%2018.6588C25.4948%2018.4427%2025.128%2018.3019%2024.7438%2018.2468C24.3597%2018.1917%2023.9681%2018.2238%2023.598%2018.3407C23.2279%2018.4575%2022.8889%2018.6561%2022.606%2018.9218C22.3433%2019.1824%2022.1377%2019.4948%2022.0023%2019.8391C21.8668%2020.1834%2021.8045%2020.5521%2021.8193%2020.9218C21.8224%2021.2277%2021.8812%2021.5304%2021.9927%2021.8152C22.0632%2022.0168%2022.0842%2022.2324%2022.054%2022.4438C22.0237%2022.6553%2021.9432%2022.8564%2021.819%2023.0302C21.6949%2023.204%2021.5308%2023.3454%2021.3406%2023.4426C21.1504%2023.5397%2020.9396%2023.5898%2020.726%2023.5885H17.8193Z%22%20fill%3D%22url(%23paint1_linear_2613_3853)%22%2F%3E%0A%3C%2Fg%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2613_3853%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23F7D14C%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23A38108%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2613_3853%22%20x1%3D%2213.7453%22%20y1%3D%2221.3705%22%20x2%3D%2240.3876%22%20y2%3D%2235.7024%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23F7D14C%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23A38108%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3CclipPath%20id%3D%22clip0_2613_3853%22%3E%0A%3Crect%20width%3D%2252%22%20height%3D%2257%22%20fill%3D%22white%22%20transform%3D%22translate(0.152832%200.920898)%22%2F%3E%0A%3C%2FclipPath%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="modules icon" class="modules-image-color-light" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M3.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4246%201.73116%2026.2124%201.69742%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8137C50.0812%2014.6086%2050.9896%2016.1043%2051.026%2017.7437L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821C51.1856%2041.5204%2050.346%2043.0611%2048.9325%2043.9357L29.0918%2056.2117C27.6424%2057.1085%2025.8227%2057.1572%2024.3387%2056.3439L3.85107%2045.1148C2.26984%2044.2481%201.14232%2042.646%201.15293%2041.0494V41.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869Z%22%20fill%3D%22%2318181B%22%20stroke%3D%22url(%23paint0_linear_2595_7337)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M33.8193%2042.2542H17.8193C16.7585%2042.2542%2015.7411%2041.8328%2014.9909%2041.0826C14.2408%2040.3325%2013.8193%2039.3151%2013.8193%2038.2542V24.9209C13.8193%2023.86%2014.2408%2022.8426%2014.9909%2022.0924C15.7411%2021.3423%2016.7585%2020.9209%2017.8193%2020.9209H19.1527C19.1751%2019.791%2019.5558%2018.6975%2020.2399%2017.7981C20.924%2016.8986%2021.8761%2016.2397%2022.9589%2015.9164C24.0416%2015.593%2025.1992%2015.6219%2026.2644%2015.999C27.3297%2016.376%2028.2477%2017.0817%2028.886%2018.0142C29.4839%2018.8664%2029.8094%2019.8799%2029.8193%2020.9209H33.8193C34.173%2020.9209%2034.5121%2021.0613%2034.7621%2021.3114C35.0122%2021.5614%2035.1527%2021.9006%2035.1527%2022.2542V26.2542C36.2825%2026.2766%2037.376%2026.6573%2038.2754%2027.3414C39.1749%2028.0255%2039.8338%2028.9776%2040.1572%2030.0604C40.4805%2031.1432%2040.4516%2032.3007%2040.0745%2033.366C39.6975%2034.4312%2038.9918%2035.3492%2038.0593%2035.9875C37.2071%2036.5854%2036.1937%2036.9109%2035.1527%2036.9209V40.9209C35.1527%2041.2745%2035.0122%2041.6136%2034.7621%2041.8637C34.5121%2042.1137%2034.173%2042.2542%2033.8193%2042.2542ZM17.8193%2023.5875C17.4657%2023.5875%2017.1266%2023.728%2016.8765%2023.978C16.6265%2024.2281%2016.486%2024.5672%2016.486%2024.9209V38.2542C16.486%2038.6078%2016.6265%2038.9469%2016.8765%2039.197C17.1266%2039.447%2017.4657%2039.5875%2017.8193%2039.5875H32.486V35.3475C32.4849%2035.1337%2032.5351%2034.9228%2032.6326%2034.7325C32.7301%2034.5422%2032.8718%2034.3782%2033.046%2034.2542C33.2196%2034.1304%2033.4205%2034.05%2033.6316%2034.0198C33.8427%2033.9897%2034.058%2034.0106%2034.2593%2034.0809C34.6393%2034.2359%2035.0532%2034.2891%2035.46%2034.2353C35.8669%2034.1816%2036.2527%2034.0226%2036.5793%2033.7742C36.9045%2033.5759%2037.1834%2033.3103%2037.3973%2032.9952C37.6111%2032.6801%2037.7551%2032.3229%2037.8193%2031.9475C37.8708%2031.5689%2037.8402%2031.1837%2037.7298%2030.8179C37.6194%2030.4522%2037.4317%2030.1144%2037.1793%2029.8275C36.8381%2029.413%2036.3734%2029.1183%2035.8529%2028.9864C35.3325%2028.8545%2034.7835%2028.8923%2034.286%2029.0942C34.0846%2029.1644%2033.8694%2029.1854%2033.6582%2029.1552C33.4471%2029.125%2033.2463%2029.0447%2033.0727%2028.9209C32.8985%2028.7969%2032.7567%2028.6328%2032.6593%2028.4425C32.5618%2028.2522%2032.5115%2028.0413%2032.5127%2027.8275V23.5875H28.246C28.0269%2023.5999%2027.8081%2023.5581%2027.609%2023.4656C27.4099%2023.3732%2027.2368%2023.233%2027.1049%2023.0576C26.973%2022.8822%2026.8864%2022.6769%2026.8529%2022.46C26.8194%2022.2431%2026.8399%2022.0213%2026.9127%2021.8142C27.0677%2021.4342%2027.1209%2021.0204%2027.0671%2020.6135C27.0134%2020.2066%2026.8544%2019.8208%2026.606%2019.4942C26.4091%2019.1597%2026.1395%2018.8739%2025.8172%2018.6578C25.4948%2018.4417%2025.128%2018.3009%2024.7438%2018.2458C24.3597%2018.1908%2023.9681%2018.2228%2023.598%2018.3397C23.2279%2018.4565%2022.8889%2018.6552%2022.606%2018.9209C22.3433%2019.1814%2022.1377%2019.4938%2022.0023%2019.8381C21.8668%2020.1824%2021.8045%2020.5512%2021.8193%2020.9209C21.8224%2021.2267%2021.8812%2021.5294%2021.9927%2021.8142C22.0632%2022.0158%2022.0842%2022.2314%2022.054%2022.4429C22.0237%2022.6543%2021.9432%2022.8554%2021.819%2023.0292C21.6949%2023.203%2021.5308%2023.3444%2021.3406%2023.4416C21.1504%2023.5388%2020.9396%2023.5888%2020.726%2023.5875H17.8193Z%22%20fill%3D%22url(%23paint1_linear_2595_7337)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2595_7337%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23F7D14C%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23A38108%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2595_7337%22%20x1%3D%2213.7453%22%20y1%3D%2221.3695%22%20x2%3D%2240.3876%22%20y2%3D%2235.7015%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23F7D14C%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23A38108%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="modules icon" class="modules-image-color-dark" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20clip-path%3D%22url(%23clip0_2691_4389)%22%3E%0A%3Cpath%20d%3D%22M51.1519%2039.8821C51.154%2039.9844%2051.1527%2040.0863%2051.148%2040.1877C51.0782%2041.7091%2050.2566%2043.1165%2048.9325%2043.9357L29.0918%2056.2117C27.6504%2057.1035%2025.8212%2057.1564%2024.3387%2056.3439L3.85107%2045.1148C2.27157%2044.2491%201.14238%2042.6366%201.15291%2041.0494L1.15293%2041.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4169%201.73583%2026.2139%201.69824%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8136C50.0797%2014.6078%2050.9898%2016.1132%2051.026%2017.7438L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821Z%22%20fill%3D%22white%22%20stroke%3D%22url(%23paint0_linear_2691_4389)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M33.8193%2042.2542H17.8193C16.7585%2042.2542%2015.7411%2041.8328%2014.9909%2041.0826C14.2408%2040.3325%2013.8193%2039.3151%2013.8193%2038.2542V24.9209C13.8193%2023.86%2014.2408%2022.8426%2014.9909%2022.0924C15.7411%2021.3423%2016.7585%2020.9209%2017.8193%2020.9209H19.1527C19.1751%2019.791%2019.5558%2018.6975%2020.2399%2017.7981C20.924%2016.8986%2021.8761%2016.2397%2022.9589%2015.9164C24.0416%2015.593%2025.1992%2015.6219%2026.2644%2015.999C27.3297%2016.376%2028.2477%2017.0817%2028.886%2018.0142C29.4839%2018.8664%2029.8094%2019.8799%2029.8193%2020.9209H33.8193C34.173%2020.9209%2034.5121%2021.0613%2034.7621%2021.3114C35.0122%2021.5614%2035.1527%2021.9006%2035.1527%2022.2542V26.2542C36.2825%2026.2766%2037.376%2026.6573%2038.2754%2027.3414C39.1749%2028.0255%2039.8338%2028.9776%2040.1572%2030.0604C40.4805%2031.1432%2040.4516%2032.3007%2040.0745%2033.366C39.6975%2034.4312%2038.9918%2035.3492%2038.0593%2035.9875C37.2071%2036.5854%2036.1937%2036.9109%2035.1527%2036.9209V36.9209V40.9209C35.1527%2041.2745%2035.0122%2041.6136%2034.7621%2041.8637C34.5121%2042.1137%2034.173%2042.2542%2033.8193%2042.2542ZM17.8193%2023.5875C17.4657%2023.5875%2017.1266%2023.728%2016.8765%2023.978C16.6265%2024.2281%2016.486%2024.5672%2016.486%2024.9209V38.2542C16.486%2038.6078%2016.6265%2038.9469%2016.8765%2039.197C17.1266%2039.447%2017.4657%2039.5875%2017.8193%2039.5875H32.486V35.3475C32.4849%2035.1337%2032.5351%2034.9228%2032.6326%2034.7325C32.7301%2034.5422%2032.8718%2034.3782%2033.046%2034.2542C33.2196%2034.1304%2033.4204%2034.05%2033.6316%2034.0198C33.8427%2033.9897%2034.058%2034.0106%2034.2593%2034.0809C34.6393%2034.2359%2035.0532%2034.2891%2035.46%2034.2353C35.8669%2034.1816%2036.2527%2034.0226%2036.5793%2033.7742C36.9045%2033.5759%2037.1834%2033.3103%2037.3973%2032.9952C37.6111%2032.6801%2037.7551%2032.3229%2037.8193%2031.9475C37.8708%2031.5689%2037.8402%2031.1837%2037.7298%2030.8179C37.6194%2030.4522%2037.4317%2030.1144%2037.1793%2029.8275C36.8381%2029.413%2036.3734%2029.1183%2035.8529%2028.9864C35.3325%2028.8545%2034.7835%2028.8923%2034.286%2029.0942C34.0846%2029.1644%2033.8694%2029.1854%2033.6582%2029.1552C33.4471%2029.125%2033.2463%2029.0447%2033.0727%2028.9209C32.8985%2028.7969%2032.7567%2028.6328%2032.6593%2028.4425C32.5618%2028.2522%2032.5115%2028.0413%2032.5127%2027.8275V23.5875H28.246C28.0269%2023.5999%2027.8081%2023.5581%2027.609%2023.4656C27.4099%2023.3732%2027.2368%2023.233%2027.1049%2023.0576C26.973%2022.8822%2026.8864%2022.6769%2026.8529%2022.46C26.8194%2022.2431%2026.8399%2022.0213%2026.9127%2021.8142C27.0677%2021.4342%2027.1209%2021.0204%2027.0671%2020.6135C27.0134%2020.2066%2026.8544%2019.8208%2026.606%2019.4942C26.4091%2019.1597%2026.1395%2018.8739%2025.8172%2018.6578C25.4948%2018.4417%2025.128%2018.3009%2024.7438%2018.2458C24.3597%2018.1908%2023.9681%2018.2228%2023.598%2018.3397C23.2279%2018.4565%2022.8889%2018.6552%2022.606%2018.9209C22.3433%2019.1814%2022.1377%2019.4938%2022.0023%2019.8381C21.8668%2020.1824%2021.8045%2020.5512%2021.8193%2020.9209C21.8224%2021.2267%2021.8812%2021.5294%2021.9927%2021.8142C22.0632%2022.0158%2022.0842%2022.2314%2022.054%2022.4429C22.0237%2022.6543%2021.9432%2022.8554%2021.819%2023.0292C21.6949%2023.203%2021.5308%2023.3444%2021.3406%2023.4416C21.1504%2023.5388%2020.9396%2023.5888%2020.726%2023.5875H17.8193Z%22%20fill%3D%22url(%23paint1_linear_2691_4389)%22%2F%3E%0A%3C%2Fg%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2691_4389%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23D4D4D8%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2691_4389%22%20x1%3D%2213.7453%22%20y1%3D%2221.3695%22%20x2%3D%2240.3876%22%20y2%3D%2235.7015%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23D4D4D8%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3CclipPath%20id%3D%22clip0_2691_4389%22%3E%0A%3Crect%20width%3D%2252%22%20height%3D%2257%22%20fill%3D%22white%22%20transform%3D%22translate(0.152832%200.920898)%22%2F%3E%0A%3C%2FclipPath%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="modules icon" class="modules-image-light" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M3.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4246%201.73116%2026.2124%201.69742%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8137C50.0812%2014.6086%2050.9896%2016.1043%2051.026%2017.7437L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821C51.1856%2041.5203%2050.346%2043.0611%2048.9325%2043.9357L29.0918%2056.2117C27.6424%2057.1085%2025.8227%2057.1572%2024.3387%2056.3439L3.85107%2045.1148C2.26984%2044.2481%201.14232%2042.646%201.15293%2041.0494V41.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869Z%22%20fill%3D%22%2318181B%22%20stroke%3D%22url(%23paint0_linear_2595_7175)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M33.8193%2042.2542H17.8193C16.7585%2042.2542%2015.7411%2041.8328%2014.9909%2041.0826C14.2408%2040.3325%2013.8193%2039.3151%2013.8193%2038.2542V24.9209C13.8193%2023.86%2014.2408%2022.8426%2014.9909%2022.0924C15.7411%2021.3423%2016.7585%2020.9209%2017.8193%2020.9209H19.1527C19.1751%2019.791%2019.5558%2018.6975%2020.2399%2017.7981C20.924%2016.8986%2021.8761%2016.2397%2022.9589%2015.9164C24.0416%2015.593%2025.1992%2015.6219%2026.2644%2015.999C27.3297%2016.376%2028.2477%2017.0817%2028.886%2018.0142C29.4839%2018.8664%2029.8094%2019.8799%2029.8193%2020.9209H33.8193C34.173%2020.9209%2034.5121%2021.0613%2034.7621%2021.3114C35.0122%2021.5614%2035.1527%2021.9006%2035.1527%2022.2542V26.2542C36.2825%2026.2766%2037.376%2026.6573%2038.2754%2027.3414C39.1749%2028.0255%2039.8338%2028.9776%2040.1572%2030.0604C40.4805%2031.1432%2040.4516%2032.3007%2040.0745%2033.366C39.6975%2034.4312%2038.9918%2035.3492%2038.0593%2035.9875C37.2071%2036.5854%2036.1937%2036.9109%2035.1527%2036.9209V40.9209C35.1527%2041.2745%2035.0122%2041.6136%2034.7621%2041.8637C34.5121%2042.1137%2034.173%2042.2542%2033.8193%2042.2542ZM17.8193%2023.5875C17.4657%2023.5875%2017.1266%2023.728%2016.8765%2023.978C16.6265%2024.2281%2016.486%2024.5672%2016.486%2024.9209V38.2542C16.486%2038.6078%2016.6265%2038.9469%2016.8765%2039.197C17.1266%2039.447%2017.4657%2039.5875%2017.8193%2039.5875H32.486V35.3475C32.4849%2035.1337%2032.5351%2034.9228%2032.6326%2034.7325C32.7301%2034.5422%2032.8718%2034.3782%2033.046%2034.2542C33.2196%2034.1304%2033.4205%2034.05%2033.6316%2034.0198C33.8427%2033.9897%2034.058%2034.0106%2034.2593%2034.0809C34.6393%2034.2359%2035.0532%2034.2891%2035.46%2034.2353C35.8669%2034.1816%2036.2527%2034.0226%2036.5793%2033.7742C36.9045%2033.5759%2037.1834%2033.3103%2037.3973%2032.9952C37.6111%2032.6801%2037.7551%2032.3229%2037.8193%2031.9475C37.8708%2031.5689%2037.8402%2031.1837%2037.7298%2030.8179C37.6194%2030.4522%2037.4317%2030.1144%2037.1793%2029.8275C36.8381%2029.413%2036.3734%2029.1183%2035.8529%2028.9864C35.3325%2028.8545%2034.7835%2028.8923%2034.286%2029.0942C34.0846%2029.1644%2033.8694%2029.1854%2033.6582%2029.1552C33.4471%2029.125%2033.2463%2029.0447%2033.0727%2028.9209C32.8985%2028.7969%2032.7567%2028.6328%2032.6593%2028.4425C32.5618%2028.2522%2032.5115%2028.0413%2032.5127%2027.8275V23.5875H28.246C28.0269%2023.5999%2027.8081%2023.5581%2027.609%2023.4656C27.4099%2023.3732%2027.2368%2023.233%2027.1049%2023.0576C26.973%2022.8822%2026.8864%2022.6769%2026.8529%2022.46C26.8194%2022.2431%2026.8399%2022.0213%2026.9127%2021.8142C27.0677%2021.4342%2027.1209%2021.0204%2027.0671%2020.6135C27.0134%2020.2066%2026.8544%2019.8208%2026.606%2019.4942C26.4091%2019.1597%2026.1395%2018.8739%2025.8172%2018.6578C25.4948%2018.4417%2025.128%2018.3009%2024.7438%2018.2458C24.3597%2018.1908%2023.9681%2018.2228%2023.598%2018.3397C23.2279%2018.4565%2022.8889%2018.6552%2022.606%2018.9209C22.3433%2019.1814%2022.1377%2019.4938%2022.0023%2019.8381C21.8668%2020.1824%2021.8045%2020.5512%2021.8193%2020.9209C21.8224%2021.2267%2021.8812%2021.5294%2021.9927%2021.8142C22.0632%2022.0158%2022.0842%2022.2314%2022.054%2022.4429C22.0237%2022.6543%2021.9432%2022.8554%2021.819%2023.0292C21.6949%2023.203%2021.5308%2023.3444%2021.3406%2023.4416C21.1504%2023.5388%2020.9396%2023.5888%2020.726%2023.5875H17.8193Z%22%20fill%3D%22url(%23paint1_linear_2595_7175)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2595_7175%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2595_7175%22%20x1%3D%2213.7453%22%20y1%3D%2221.3695%22%20x2%3D%2240.3876%22%20y2%3D%2235.7015%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="modules icon" class="modules-image-dark" data-v-7af2ada2><div class="flex flex-col space-y text-black dark:text-white" data-v-7af2ada2><h3 class="font-semibold text-xl" data-v-7af2ada2>Modules</h3><p class="text-gray-700 dark:text-gray-300" data-v-7af2ada2>Discover our list of modules to supercharge your Nuxt project. Created by the Nuxt team and community.</p></div></a></div><div class="row-span-2 col-span-2 order-last lg:order-none lg:col-span-4 text-black dark:text-white documentation-container rounded-xl relative items-center justify-center border border-gray-200 dark:border-transparent hover:border-transparent" data-v-7af2ada2><div class="gradient-border gradient-border-square gradient-border-documentation" data-v-7af2ada2></div><a href="https://nuxt.com/docs" target="_blank" class="rounded-xl flex lg:flex-col items-center justify-center gap-y-4 bg-white dark:bg-gray-900" data-v-7af2ada2><div class="py-6 lg:py-7 px-5 rounded-xl flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-y-2" data-v-7af2ada2><div class="flex flex-col space-y text-black dark:text-white" data-v-7af2ada2><h3 class="font-semibold text-xl" data-v-7af2ada2>Documentation</h3><p class="text-gray-700 dark:text-gray-300" data-v-7af2ada2>We highly recommend you take a look at the Nuxt documentation to level up.</p></div><img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%22342%22%20height%3D%22165%22%20viewBox%3D%220%200%20342%20165%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20clip-path%3D%22url(%23clip0_2687_3947)%22%3E%0A%3Cpath%20d%3D%22M0.152832%20131.851H154.28%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M215.399%20107.359H349.153%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M0.152832%2077.2178L116.191%2077.2178%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M36.1528%20106.921L152.191%20106.921%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M202.153%2042.9209L317.305%2042.9209%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2076.9209L345.305%2076.9209%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M285.947%208.45605V166.979%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M252.602%2016.8311V107.36%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M171.153%2016.9209V107.45%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2016.9209V43.4501%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M122.153%2016.9211L327.45%2016.9209%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M1.92432%2043.3086H148.163%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M122.392%2016.4209V55.3659%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M36.084%200.920898L36.084%20176.921%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M75.4448%2043.249V175.152%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%2275.4448%22%20cy%3D%2277.2178%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%2236.1528%22%20cy%3D%22131.85%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%22285.947%22%20cy%3D%2242.9209%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%22252.602%22%20cy%3D%22107.359%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Cg%20filter%3D%22url(%23filter0_d_2687_3947)%22%3E%0A%3Cpath%20d%3D%22M122.846%2050.7109L163.067%2026.0929C166.656%2023.9507%20171.117%2023.8611%20174.77%2025.8579L217.894%2049.0819C221.524%2051.0665%20223.807%2054.8133%20223.892%2058.9246L224.15%20104.352C224.235%20108.448%20222.13%20112.287%20218.609%20114.46L177.783%20139.658C174.174%20141.886%20169.638%20142.011%20165.931%20139.984L123.774%20116.935C120.045%20114.896%20117.125%20111.001%20117.153%20106.776L117.153%2060.5974C117.18%2056.5529%20119.338%2052.8048%20122.846%2050.7109Z%22%20fill%3D%22white%22%2F%3E%0A%3Cpath%20d%3D%22M222.151%20104.393C222.22%20107.764%20220.487%20110.944%20217.571%20112.75C217.567%20112.753%20217.563%20112.755%20217.559%20112.758L176.733%20137.956C173.748%20139.798%20169.96%20139.907%20166.89%20138.229L124.733%20115.18C121.469%20113.395%20119.131%20110.069%20119.153%20106.79L119.153%20106.776L119.153%2060.6107C119.153%2060.6086%20119.153%2060.6065%20119.153%2060.6044C119.178%2057.2703%20120.958%2054.1669%20123.871%2052.4282L123.881%2052.4225L123.89%2052.4167L164.101%2027.8047C164.101%2027.8047%20164.101%2027.8047%20164.101%2027.8047C164.106%2027.8022%20164.11%2027.7997%20164.114%2027.7972C167.078%2026.0385%20170.793%2025.9632%20173.81%2027.6128L173.81%2027.6128L173.821%2027.6188L216.934%2050.8367C216.936%2050.8377%20216.938%2050.8387%20216.94%2050.8397C219.935%2052.4801%20221.817%2055.5878%20221.892%2058.9515L222.15%20104.363L222.15%20104.378L222.151%20104.393Z%22%20stroke%3D%22url(%23paint0_linear_2687_3947)%22%20stroke-width%3D%224%22%2F%3E%0A%3C%2Fg%3E%0A%3Cpath%20d%3D%22M192.349%2096.9158L190.63%2090.5186L183.778%2064.9088C183.55%2064.0605%20182.994%2063.3375%20182.233%2062.8988C181.472%2062.4601%20180.568%2062.3416%20179.72%2062.5693L173.323%2064.2877L173.116%2064.3498C172.807%2063.945%20172.409%2063.6168%20171.953%2063.3906C171.497%2063.1644%20170.995%2063.0463%20170.486%2063.0455H163.861C163.279%2063.0471%20162.707%2063.2043%20162.205%2063.501C161.703%2063.2043%20161.132%2063.0471%20160.549%2063.0455H153.924C153.045%2063.0455%20152.203%2063.3945%20151.582%2064.0157C150.96%2064.6369%20150.611%2065.4795%20150.611%2066.358V99.483C150.611%20100.362%20150.96%20101.204%20151.582%20101.825C152.203%20102.447%20153.045%20102.796%20153.924%20102.796H160.549C161.132%20102.794%20161.703%20102.637%20162.205%20102.34C162.707%20102.637%20163.279%20102.794%20163.861%20102.796H170.486C171.365%20102.796%20172.207%20102.447%20172.829%20101.825C173.45%20101.204%20173.799%20100.362%20173.799%2099.483V78.8627L177.836%2093.9346L179.554%20100.332C179.742%20101.039%20180.158%20101.665%20180.739%20102.11C181.32%20102.556%20182.031%20102.797%20182.763%20102.796C183.049%20102.791%20183.334%20102.756%20183.612%20102.692L190.009%20100.974C190.43%20100.861%20190.824%20100.665%20191.169%20100.399C191.514%20100.132%20191.802%2099.7997%20192.018%2099.4209C192.238%2099.047%20192.381%2098.6325%20192.438%2098.2021C192.495%2097.7717%20192.465%2097.3342%20192.349%2096.9158V96.9158ZM176.325%2075.4881L182.722%2073.7697L187.007%2089.7732L180.61%2091.4916L176.325%2075.4881ZM180.569%2065.7783L181.873%2070.5607L175.476%2072.2791L174.171%2067.4967L180.569%2065.7783ZM170.486%2066.358V91.2018H163.861V66.358H170.486ZM160.549%2066.358V71.3268H153.924V66.358H160.549ZM153.924%2099.483V74.6393H160.549V99.483H153.924ZM170.486%2099.483H163.861V94.5143H170.486V99.483ZM189.161%2097.7646L182.763%2099.483L181.459%2094.6799L187.877%2092.9615L189.161%2097.7646V97.7646Z%22%20fill%3D%22url(%23paint1_linear_2687_3947)%22%2F%3E%0A%3Crect%20x%3D%222.15283%22%20y%3D%22-3.0791%22%20width%3D%22327%22%20height%3D%2223%22%20fill%3D%22url(%23paint2_linear_2687_3947)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(1%200%200%20-1%202.15283%20166.921)%22%20fill%3D%22url(%23paint3_linear_2687_3947)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(0%201%201%200%200.152832%20-17.0791)%22%20fill%3D%22url(%23paint4_linear_2687_3947)%22%2F%3E%0A%3Crect%20x%3D%22342.153%22%20y%3D%22-17.0791%22%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22rotate(90%20342.153%20-17.0791)%22%20fill%3D%22url(%23paint5_linear_2687_3947)%22%2F%3E%0A%3C%2Fg%3E%0A%3Cdefs%3E%0A%3Cfilter%20id%3D%22filter0_d_2687_3947%22%20x%3D%2286.1528%22%20y%3D%22-6.5791%22%20width%3D%22169%22%20height%3D%22179%22%20filterUnits%3D%22userSpaceOnUse%22%20color-interpolation-filters%3D%22sRGB%22%3E%0A%3CfeFlood%20flood-opacity%3D%220%22%20result%3D%22BackgroundImageFix%22%2F%3E%0A%3CfeColorMatrix%20in%3D%22SourceAlpha%22%20type%3D%22matrix%22%20values%3D%220%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20127%200%22%20result%3D%22hardAlpha%22%2F%3E%0A%3CfeOffset%2F%3E%0A%3CfeGaussianBlur%20stdDeviation%3D%2215.5%22%2F%3E%0A%3CfeComposite%20in2%3D%22hardAlpha%22%20operator%3D%22out%22%2F%3E%0A%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%201%200%200%200%200%201%200%200%200%200%201%200%200%200%200.07%200%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in2%3D%22BackgroundImageFix%22%20result%3D%22effect1_dropShadow_2687_3947%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in%3D%22SourceGraphic%22%20in2%3D%22effect1_dropShadow_2687_3947%22%20result%3D%22shape%22%2F%3E%0A%3C%2Ffilter%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2687_3947%22%20x1%3D%22118.202%22%20y1%3D%2260.3042%22%20x2%3D%22223.159%22%20y2%3D%22113.509%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23003F25%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2687_3947%22%20x1%3D%22150.495%22%20y1%3D%2271.0767%22%20x2%3D%22191.769%22%20y2%3D%2294.1139%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23003F25%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint2_linear_2687_3947%22%20x1%3D%22165.653%22%20y1%3D%22-3.0791%22%20x2%3D%22166.153%22%20y2%3D%2219.9209%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint3_linear_2687_3947%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint4_linear_2687_3947%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint5_linear_2687_3947%22%20x1%3D%22505.653%22%20y1%3D%22-17.0791%22%20x2%3D%22506.244%22%20y2%3D%227.91876%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3CclipPath%20id%3D%22clip0_2687_3947%22%3E%0A%3Crect%20width%3D%22341%22%20height%3D%22164%22%20fill%3D%22white%22%20transform%3D%22translate(0.152832%200.920898)%22%2F%3E%0A%3C%2FclipPath%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="documentation icon" class="documentation-image-color-light h-32 sm:h-34" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%22342%22%20height%3D%22165%22%20viewBox%3D%220%200%20342%20165%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20clip-path%3D%22url(%23clip0_2595_7273)%22%3E%0A%3Cpath%20d%3D%22M0.152832%20131.851H154.28%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M215.399%20107.359H349.153%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M0.152832%2077.2178L116.191%2077.2178%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M36.1528%20106.921L152.191%20106.921%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M202.153%2042.9209L317.305%2042.9209%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2076.9209L345.305%2076.9209%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M285.947%208.45605V166.979%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M252.602%2016.8311V107.36%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M171.153%2016.9209V107.45%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2016.9209V43.4501%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M122.153%2016.9211L327.45%2016.9209%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M1.92432%2043.3086H148.163%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M122.392%2016.4209V55.3659%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M36.084%200.920898L36.084%20176.921%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M75.4448%2043.249V175.152%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%2275.4448%22%20cy%3D%2277.2178%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%2236.1528%22%20cy%3D%22131.85%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%22285.947%22%20cy%3D%2242.9209%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%22252.602%22%20cy%3D%22107.359%22%20r%3D%223.5%22%20fill%3D%22%2300DC82%22%2F%3E%0A%3Cg%20filter%3D%22url(%23filter0_d_2595_7273)%22%3E%0A%3Cpath%20d%3D%22M122.846%2050.7109L163.067%2026.0929C166.656%2023.9507%20171.117%2023.8611%20174.77%2025.8579L217.894%2049.0819C221.524%2051.0665%20223.807%2054.8133%20223.892%2058.9246L224.15%20104.352C224.235%20108.448%20222.13%20112.287%20218.609%20114.46L177.783%20139.658C174.174%20141.886%20169.638%20142.011%20165.931%20139.984L123.774%20116.935C120.045%20114.896%20117.125%20111.001%20117.153%20106.776L117.153%2060.5974C117.18%2056.5529%20119.338%2052.8048%20122.846%2050.7109Z%22%20fill%3D%22%2318181B%22%2F%3E%0A%3Cpath%20d%3D%22M123.871%2052.4282L123.881%2052.4225L123.89%2052.4167L164.101%2027.8047C167.083%2026.0291%20170.786%2025.9592%20173.81%2027.6128L173.81%2027.6128L173.821%2027.6188L216.934%2050.8367C216.936%2050.8376%20216.938%2050.8386%20216.939%2050.8395C219.938%2052.4814%20221.817%2055.5694%20221.892%2058.9515L222.15%20104.363L222.15%20104.378L222.151%20104.393C222.221%20107.772%20220.485%20110.952%20217.559%20112.758L176.733%20137.956C173.732%20139.808%20169.963%20139.909%20166.89%20138.229L124.733%20115.18C121.465%20113.393%20119.131%20110.089%20119.153%20106.79L119.153%20106.776L119.153%2060.6107C119.153%2060.6086%20119.153%2060.6065%20119.153%2060.6044C119.178%2057.2703%20120.958%2054.1669%20123.871%2052.4282Z%22%20stroke%3D%22url(%23paint0_linear_2595_7273)%22%20stroke-width%3D%224%22%2F%3E%0A%3C%2Fg%3E%0A%3Cpath%20d%3D%22M192.349%2096.9158L190.63%2090.5186L183.778%2064.9088C183.55%2064.0605%20182.994%2063.3375%20182.233%2062.8988C181.472%2062.4601%20180.568%2062.3416%20179.72%2062.5693L173.323%2064.2877L173.116%2064.3498C172.807%2063.945%20172.409%2063.6168%20171.953%2063.3906C171.497%2063.1644%20170.995%2063.0463%20170.486%2063.0455H163.861C163.279%2063.0471%20162.707%2063.2043%20162.205%2063.501C161.703%2063.2043%20161.132%2063.0471%20160.549%2063.0455H153.924C153.045%2063.0455%20152.203%2063.3945%20151.582%2064.0157C150.96%2064.6369%20150.611%2065.4795%20150.611%2066.358V99.483C150.611%20100.362%20150.96%20101.204%20151.582%20101.825C152.203%20102.447%20153.045%20102.796%20153.924%20102.796H160.549C161.132%20102.794%20161.703%20102.637%20162.205%20102.34C162.707%20102.637%20163.279%20102.794%20163.861%20102.796H170.486C171.365%20102.796%20172.207%20102.447%20172.829%20101.825C173.45%20101.204%20173.799%20100.362%20173.799%2099.483V78.8627L177.836%2093.9346L179.554%20100.332C179.742%20101.039%20180.158%20101.665%20180.739%20102.11C181.32%20102.556%20182.031%20102.797%20182.763%20102.796C183.049%20102.791%20183.334%20102.756%20183.612%20102.692L190.009%20100.974C190.43%20100.861%20190.824%20100.665%20191.169%20100.399C191.514%20100.132%20191.802%2099.7998%20192.018%2099.4209C192.238%2099.047%20192.381%2098.6325%20192.438%2098.2021C192.495%2097.7717%20192.465%2097.3342%20192.349%2096.9158ZM176.325%2075.4881L182.722%2073.7697L187.007%2089.7732L180.61%2091.4916L176.325%2075.4881ZM180.569%2065.7783L181.873%2070.5607L175.476%2072.2791L174.171%2067.4967L180.569%2065.7783ZM170.486%2066.358V91.2018H163.861V66.358H170.486ZM160.549%2066.358V71.3268H153.924V66.358H160.549ZM153.924%2099.483V74.6393H160.549V99.483H153.924ZM170.486%2099.483H163.861V94.5143H170.486V99.483ZM189.161%2097.7646L182.763%2099.483L181.459%2094.6799L187.877%2092.9615L189.161%2097.7646Z%22%20fill%3D%22url(%23paint1_linear_2595_7273)%22%2F%3E%0A%3Crect%20x%3D%222.15283%22%20y%3D%22-3.0791%22%20width%3D%22327%22%20height%3D%2223%22%20fill%3D%22url(%23paint2_linear_2595_7273)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(1%200%200%20-1%202.15283%20166.921)%22%20fill%3D%22url(%23paint3_linear_2595_7273)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(0%201%201%200%200.152832%20-17.0791)%22%20fill%3D%22url(%23paint4_linear_2595_7273)%22%2F%3E%0A%3Crect%20x%3D%22342.153%22%20y%3D%22-17.0791%22%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22rotate(90%20342.153%20-17.0791)%22%20fill%3D%22url(%23paint5_linear_2595_7273)%22%2F%3E%0A%3C%2Fg%3E%0A%3Cdefs%3E%0A%3Cfilter%20id%3D%22filter0_d_2595_7273%22%20x%3D%2286.1528%22%20y%3D%22-6.5791%22%20width%3D%22169%22%20height%3D%22179%22%20filterUnits%3D%22userSpaceOnUse%22%20color-interpolation-filters%3D%22sRGB%22%3E%0A%3CfeFlood%20flood-opacity%3D%220%22%20result%3D%22BackgroundImageFix%22%2F%3E%0A%3CfeColorMatrix%20in%3D%22SourceAlpha%22%20type%3D%22matrix%22%20values%3D%220%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20127%200%22%20result%3D%22hardAlpha%22%2F%3E%0A%3CfeOffset%2F%3E%0A%3CfeGaussianBlur%20stdDeviation%3D%2215.5%22%2F%3E%0A%3CfeComposite%20in2%3D%22hardAlpha%22%20operator%3D%22out%22%2F%3E%0A%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%201%200%200%200%200%201%200%200%200%200%201%200%200%200%200.07%200%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in2%3D%22BackgroundImageFix%22%20result%3D%22effect1_dropShadow_2595_7273%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in%3D%22SourceGraphic%22%20in2%3D%22effect1_dropShadow_2595_7273%22%20result%3D%22shape%22%2F%3E%0A%3C%2Ffilter%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2595_7273%22%20x1%3D%22118.202%22%20y1%3D%2260.3042%22%20x2%3D%22223.159%22%20y2%3D%22113.509%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23003F25%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2595_7273%22%20x1%3D%22150.495%22%20y1%3D%2271.0767%22%20x2%3D%22191.769%22%20y2%3D%2294.1139%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2300DC82%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23003F25%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint2_linear_2595_7273%22%20x1%3D%22165.653%22%20y1%3D%22-3.0791%22%20x2%3D%22166.153%22%20y2%3D%2219.9209%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint3_linear_2595_7273%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint4_linear_2595_7273%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint5_linear_2595_7273%22%20x1%3D%22505.653%22%20y1%3D%22-17.0791%22%20x2%3D%22506.244%22%20y2%3D%227.91876%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3CclipPath%20id%3D%22clip0_2595_7273%22%3E%0A%3Crect%20width%3D%22341%22%20height%3D%22164%22%20fill%3D%22white%22%20transform%3D%22translate(0.152832%200.920898)%22%2F%3E%0A%3C%2FclipPath%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="documentation icon" class="documentation-image-color-dark h-32 sm:h-34" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%22342%22%20height%3D%22165%22%20viewBox%3D%220%200%20342%20165%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20clip-path%3D%22url(%23clip0_2687_3977)%22%3E%0A%3Cpath%20d%3D%22M0.152832%20131.851H154.28%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M215.399%20107.359H349.153%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M0.152832%2077.2178L116.191%2077.2178%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M36.1528%20106.921L152.191%20106.921%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M202.153%2042.9209L317.305%2042.9209%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2076.9209L345.305%2076.9209%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M285.947%208.45605V166.979%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M252.602%2016.8311V107.36%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M171.153%2016.9209V107.45%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2016.9209V43.4501%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M122.153%2016.9211L327.45%2016.9209%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M1.92432%2043.3086H148.163%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M122.392%2016.4209V55.3659%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M36.084%200.920898L36.084%20176.921%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Cpath%20d%3D%22M75.4448%2043.249V175.152%22%20stroke%3D%22%23E4E4E7%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%2275.4448%22%20cy%3D%2277.2178%22%20r%3D%223.5%22%20fill%3D%22%23A1A1AA%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%2236.1528%22%20cy%3D%22131.85%22%20r%3D%223.5%22%20fill%3D%22%23A1A1AA%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%22285.947%22%20cy%3D%2242.9209%22%20r%3D%223.5%22%20fill%3D%22%23A1A1AA%22%2F%3E%0A%3Ccircle%20opacity%3D%220.7%22%20cx%3D%22252.602%22%20cy%3D%22107.359%22%20r%3D%223.5%22%20fill%3D%22%23A1A1AA%22%2F%3E%0A%3Cg%20filter%3D%22url(%23filter0_d_2687_3977)%22%3E%0A%3Cpath%20d%3D%22M122.846%2050.7109L163.067%2026.0929C166.656%2023.9507%20171.117%2023.8611%20174.77%2025.8579L217.894%2049.0819C221.524%2051.0665%20223.807%2054.8133%20223.892%2058.9246L224.15%20104.352C224.235%20108.448%20222.13%20112.287%20218.609%20114.46L177.783%20139.658C174.174%20141.886%20169.638%20142.011%20165.931%20139.984L123.774%20116.935C120.045%20114.896%20117.125%20111.001%20117.153%20106.776L117.153%2060.5974C117.18%2056.5529%20119.338%2052.8048%20122.846%2050.7109Z%22%20fill%3D%22white%22%2F%3E%0A%3Cpath%20d%3D%22M222.151%20104.393C222.22%20107.764%20220.487%20110.944%20217.571%20112.75C217.567%20112.753%20217.563%20112.755%20217.559%20112.758L176.733%20137.956C173.748%20139.798%20169.96%20139.907%20166.89%20138.229L124.733%20115.18C121.469%20113.395%20119.131%20110.069%20119.153%20106.79L119.153%20106.776L119.153%2060.6107C119.153%2060.6086%20119.153%2060.6065%20119.153%2060.6044C119.178%2057.2703%20120.958%2054.1669%20123.871%2052.4282L123.881%2052.4225L123.89%2052.4167L164.101%2027.8047C164.101%2027.8047%20164.101%2027.8047%20164.101%2027.8047C164.106%2027.8022%20164.11%2027.7997%20164.114%2027.7972C167.078%2026.0385%20170.793%2025.9632%20173.81%2027.6128L173.81%2027.6128L173.821%2027.6188L216.934%2050.8367C216.936%2050.8377%20216.938%2050.8387%20216.94%2050.8397C219.935%2052.4801%20221.817%2055.5878%20221.892%2058.9515L222.15%20104.363L222.15%20104.378L222.151%20104.393Z%22%20stroke%3D%22url(%23paint0_linear_2687_3977)%22%20stroke-width%3D%224%22%2F%3E%0A%3C%2Fg%3E%0A%3Cpath%20d%3D%22M192.349%2096.9158L190.63%2090.5186L183.778%2064.9088C183.55%2064.0605%20182.994%2063.3375%20182.233%2062.8988C181.472%2062.4601%20180.568%2062.3416%20179.72%2062.5693L173.323%2064.2877L173.116%2064.3498C172.807%2063.945%20172.409%2063.6168%20171.953%2063.3906C171.497%2063.1644%20170.995%2063.0463%20170.486%2063.0455H163.861C163.279%2063.0471%20162.707%2063.2043%20162.205%2063.501C161.703%2063.2043%20161.132%2063.0471%20160.549%2063.0455H153.924C153.045%2063.0455%20152.203%2063.3945%20151.582%2064.0157C150.96%2064.6369%20150.611%2065.4795%20150.611%2066.358V99.483C150.611%20100.362%20150.96%20101.204%20151.582%20101.825C152.203%20102.447%20153.045%20102.796%20153.924%20102.796H160.549C161.132%20102.794%20161.703%20102.637%20162.205%20102.34C162.707%20102.637%20163.279%20102.794%20163.861%20102.796H170.486C171.365%20102.796%20172.207%20102.447%20172.829%20101.825C173.45%20101.204%20173.799%20100.362%20173.799%2099.483V78.8627L177.836%2093.9346L179.554%20100.332C179.742%20101.039%20180.158%20101.665%20180.739%20102.11C181.32%20102.556%20182.031%20102.797%20182.763%20102.796C183.049%20102.791%20183.334%20102.756%20183.612%20102.692L190.009%20100.974C190.43%20100.861%20190.824%20100.665%20191.169%20100.399C191.514%20100.132%20191.802%2099.7997%20192.018%2099.4209C192.238%2099.047%20192.381%2098.6325%20192.438%2098.2021C192.495%2097.7717%20192.465%2097.3342%20192.349%2096.9158V96.9158ZM176.325%2075.4881L182.722%2073.7697L187.007%2089.7732L180.61%2091.4916L176.325%2075.4881ZM180.569%2065.7783L181.873%2070.5607L175.476%2072.2791L174.171%2067.4967L180.569%2065.7783ZM170.486%2066.358V91.2018H163.861V66.358H170.486ZM160.549%2066.358V71.3268H153.924V66.358H160.549ZM153.924%2099.483V74.6393H160.549V99.483H153.924ZM170.486%2099.483H163.861V94.5143H170.486V99.483ZM189.161%2097.7646L182.763%2099.483L181.459%2094.6799L187.877%2092.9615L189.161%2097.7646V97.7646Z%22%20fill%3D%22url(%23paint1_linear_2687_3977)%22%2F%3E%0A%3Crect%20x%3D%222.15283%22%20y%3D%22-3.0791%22%20width%3D%22327%22%20height%3D%2223%22%20fill%3D%22url(%23paint2_linear_2687_3977)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(1%200%200%20-1%202.15283%20166.921)%22%20fill%3D%22url(%23paint3_linear_2687_3977)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(0%201%201%200%200.152832%20-17.0791)%22%20fill%3D%22url(%23paint4_linear_2687_3977)%22%2F%3E%0A%3Crect%20x%3D%22342.153%22%20y%3D%22-17.0791%22%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22rotate(90%20342.153%20-17.0791)%22%20fill%3D%22url(%23paint5_linear_2687_3977)%22%2F%3E%0A%3C%2Fg%3E%0A%3Cdefs%3E%0A%3Cfilter%20id%3D%22filter0_d_2687_3977%22%20x%3D%2286.1528%22%20y%3D%22-6.5791%22%20width%3D%22169%22%20height%3D%22179%22%20filterUnits%3D%22userSpaceOnUse%22%20color-interpolation-filters%3D%22sRGB%22%3E%0A%3CfeFlood%20flood-opacity%3D%220%22%20result%3D%22BackgroundImageFix%22%2F%3E%0A%3CfeColorMatrix%20in%3D%22SourceAlpha%22%20type%3D%22matrix%22%20values%3D%220%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20127%200%22%20result%3D%22hardAlpha%22%2F%3E%0A%3CfeOffset%2F%3E%0A%3CfeGaussianBlur%20stdDeviation%3D%2215.5%22%2F%3E%0A%3CfeComposite%20in2%3D%22hardAlpha%22%20operator%3D%22out%22%2F%3E%0A%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%200.831373%200%200%200%200%200.831373%200%200%200%200%200.847059%200%200%200%200.07%200%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in2%3D%22BackgroundImageFix%22%20result%3D%22effect1_dropShadow_2687_3977%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in%3D%22SourceGraphic%22%20in2%3D%22effect1_dropShadow_2687_3977%22%20result%3D%22shape%22%2F%3E%0A%3C%2Ffilter%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2687_3977%22%20x1%3D%22118.202%22%20y1%3D%2260.3042%22%20x2%3D%22223.159%22%20y2%3D%22113.509%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23D4D4D8%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%233F3F46%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2687_3977%22%20x1%3D%22150.495%22%20y1%3D%2271.0767%22%20x2%3D%22191.769%22%20y2%3D%2294.1139%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23D4D4D8%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%233F3F46%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint2_linear_2687_3977%22%20x1%3D%22165.653%22%20y1%3D%22-3.0791%22%20x2%3D%22166.153%22%20y2%3D%2219.9209%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint3_linear_2687_3977%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint4_linear_2687_3977%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint5_linear_2687_3977%22%20x1%3D%22505.653%22%20y1%3D%22-17.0791%22%20x2%3D%22506.244%22%20y2%3D%227.91876%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3CclipPath%20id%3D%22clip0_2687_3977%22%3E%0A%3Crect%20width%3D%22341%22%20height%3D%22164%22%20fill%3D%22white%22%20transform%3D%22translate(0.152832%200.920898)%22%2F%3E%0A%3C%2FclipPath%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="documentation icon" class="documentation-image-light h-32 sm:h-34" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%22342%22%20height%3D%22165%22%20viewBox%3D%220%200%20342%20165%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20clip-path%3D%22url(%23clip0_2595_7193)%22%3E%0A%3Cpath%20d%3D%22M0.152832%20131.851H154.28%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M215.399%20107.359H349.153%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M0.152832%2077.2178L116.191%2077.2178%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M36.1528%20106.921L152.191%20106.921%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M202.153%2042.9209L317.305%2042.9209%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2076.9209L345.305%2076.9209%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M285.947%208.45605V166.979%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M252.602%2016.8311V107.36%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M171.153%2016.9209V107.45%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M218.153%2016.9209V43.4501%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M122.153%2016.9211L327.45%2016.9209%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M1.92432%2043.3086H148.163%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M122.392%2016.4209V55.3659%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M36.084%200.920898L36.084%20176.921%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Cpath%20d%3D%22M75.4448%2043.249V175.152%22%20stroke%3D%22%2327272A%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%2275.4448%22%20cy%3D%2277.2178%22%20r%3D%223.5%22%20fill%3D%22white%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%2236.1528%22%20cy%3D%22131.85%22%20r%3D%223.5%22%20fill%3D%22white%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%22285.947%22%20cy%3D%2242.9209%22%20r%3D%223.5%22%20fill%3D%22white%22%2F%3E%0A%3Ccircle%20opacity%3D%220.14%22%20cx%3D%22252.602%22%20cy%3D%22107.359%22%20r%3D%223.5%22%20fill%3D%22white%22%2F%3E%0A%3Cg%20filter%3D%22url(%23filter0_d_2595_7193)%22%3E%0A%3Cpath%20d%3D%22M122.846%2050.7109L163.067%2026.0929C166.656%2023.9507%20171.117%2023.8611%20174.77%2025.8579L217.894%2049.0819C221.524%2051.0665%20223.807%2054.8133%20223.892%2058.9246L224.15%20104.352C224.235%20108.448%20222.13%20112.287%20218.609%20114.46L177.783%20139.658C174.174%20141.886%20169.638%20142.011%20165.931%20139.984L123.774%20116.935C120.045%20114.896%20117.125%20111.001%20117.153%20106.776L117.153%2060.5974C117.18%2056.5529%20119.338%2052.8048%20122.846%2050.7109Z%22%20fill%3D%22%2318181B%22%2F%3E%0A%3Cpath%20d%3D%22M123.871%2052.4282L123.881%2052.4225L123.89%2052.4167L164.101%2027.8047C167.083%2026.0291%20170.786%2025.9592%20173.81%2027.6128L173.81%2027.6128L173.821%2027.6188L216.934%2050.8367C216.936%2050.8376%20216.938%2050.8386%20216.939%2050.8395C219.938%2052.4814%20221.817%2055.5694%20221.892%2058.9515L222.15%20104.363L222.15%20104.378L222.151%20104.393C222.221%20107.772%20220.485%20110.952%20217.559%20112.758L176.733%20137.956C173.732%20139.808%20169.963%20139.909%20166.89%20138.229L124.733%20115.18C121.465%20113.393%20119.131%20110.089%20119.153%20106.79L119.153%20106.776L119.153%2060.6107C119.153%2060.6086%20119.153%2060.6065%20119.153%2060.6044C119.178%2057.2703%20120.958%2054.1669%20123.871%2052.4282Z%22%20stroke%3D%22url(%23paint0_linear_2595_7193)%22%20stroke-width%3D%224%22%2F%3E%0A%3C%2Fg%3E%0A%3Cpath%20d%3D%22M192.349%2096.9158L190.63%2090.5186L183.778%2064.9088C183.55%2064.0605%20182.994%2063.3375%20182.233%2062.8988C181.472%2062.4601%20180.568%2062.3416%20179.72%2062.5693L173.323%2064.2877L173.116%2064.3498C172.807%2063.945%20172.409%2063.6168%20171.953%2063.3906C171.497%2063.1644%20170.995%2063.0463%20170.486%2063.0455H163.861C163.279%2063.0471%20162.707%2063.2043%20162.205%2063.501C161.703%2063.2043%20161.132%2063.0471%20160.549%2063.0455H153.924C153.045%2063.0455%20152.203%2063.3945%20151.582%2064.0157C150.96%2064.6369%20150.611%2065.4795%20150.611%2066.358V99.483C150.611%20100.362%20150.96%20101.204%20151.582%20101.825C152.203%20102.447%20153.045%20102.796%20153.924%20102.796H160.549C161.132%20102.794%20161.703%20102.637%20162.205%20102.34C162.707%20102.637%20163.279%20102.794%20163.861%20102.796H170.486C171.365%20102.796%20172.207%20102.447%20172.829%20101.825C173.45%20101.204%20173.799%20100.362%20173.799%2099.483V78.8627L177.836%2093.9346L179.554%20100.332C179.742%20101.039%20180.158%20101.665%20180.739%20102.11C181.32%20102.556%20182.031%20102.797%20182.763%20102.796C183.049%20102.791%20183.334%20102.756%20183.612%20102.692L190.009%20100.974C190.43%20100.861%20190.824%20100.665%20191.169%20100.399C191.514%20100.132%20191.802%2099.7998%20192.018%2099.4209C192.238%2099.047%20192.381%2098.6325%20192.438%2098.2021C192.495%2097.7717%20192.465%2097.3342%20192.349%2096.9158ZM176.325%2075.4881L182.722%2073.7697L187.007%2089.7732L180.61%2091.4916L176.325%2075.4881ZM180.569%2065.7783L181.873%2070.5607L175.476%2072.2791L174.171%2067.4967L180.569%2065.7783ZM170.486%2066.358V91.2018H163.861V66.358H170.486ZM160.549%2066.358V71.3268H153.924V66.358H160.549ZM153.924%2099.483V74.6393H160.549V99.483H153.924ZM170.486%2099.483H163.861V94.5143H170.486V99.483ZM189.161%2097.7646L182.763%2099.483L181.459%2094.6799L187.877%2092.9615L189.161%2097.7646Z%22%20fill%3D%22url(%23paint1_linear_2595_7193)%22%2F%3E%0A%3Crect%20x%3D%222.15283%22%20y%3D%22-3.0791%22%20width%3D%22327%22%20height%3D%2223%22%20fill%3D%22url(%23paint2_linear_2595_7193)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(1%200%200%20-1%202.15283%20166.921)%22%20fill%3D%22url(%23paint3_linear_2595_7193)%22%2F%3E%0A%3Crect%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22matrix(0%201%201%200%200.152832%20-17.0791)%22%20fill%3D%22url(%23paint4_linear_2595_7193)%22%2F%3E%0A%3Crect%20x%3D%22342.153%22%20y%3D%22-17.0791%22%20width%3D%22327%22%20height%3D%2225%22%20transform%3D%22rotate(90%20342.153%20-17.0791)%22%20fill%3D%22url(%23paint5_linear_2595_7193)%22%2F%3E%0A%3C%2Fg%3E%0A%3Cdefs%3E%0A%3Cfilter%20id%3D%22filter0_d_2595_7193%22%20x%3D%2286.1528%22%20y%3D%22-6.5791%22%20width%3D%22169%22%20height%3D%22179%22%20filterUnits%3D%22userSpaceOnUse%22%20color-interpolation-filters%3D%22sRGB%22%3E%0A%3CfeFlood%20flood-opacity%3D%220%22%20result%3D%22BackgroundImageFix%22%2F%3E%0A%3CfeColorMatrix%20in%3D%22SourceAlpha%22%20type%3D%22matrix%22%20values%3D%220%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20127%200%22%20result%3D%22hardAlpha%22%2F%3E%0A%3CfeOffset%2F%3E%0A%3CfeGaussianBlur%20stdDeviation%3D%2215.5%22%2F%3E%0A%3CfeComposite%20in2%3D%22hardAlpha%22%20operator%3D%22out%22%2F%3E%0A%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%201%200%200%200%200%201%200%200%200%200%201%200%200%200%200.07%200%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in2%3D%22BackgroundImageFix%22%20result%3D%22effect1_dropShadow_2595_7193%22%2F%3E%0A%3CfeBlend%20mode%3D%22normal%22%20in%3D%22SourceGraphic%22%20in2%3D%22effect1_dropShadow_2595_7193%22%20result%3D%22shape%22%2F%3E%0A%3C%2Ffilter%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2595_7193%22%20x1%3D%22118.202%22%20y1%3D%2260.3042%22%20x2%3D%22223.159%22%20y2%3D%22113.509%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2595_7193%22%20x1%3D%22150.495%22%20y1%3D%2271.0767%22%20x2%3D%22191.769%22%20y2%3D%2294.1139%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint2_linear_2595_7193%22%20x1%3D%22165.653%22%20y1%3D%22-3.0791%22%20x2%3D%22166.153%22%20y2%3D%2219.9209%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint3_linear_2595_7193%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint4_linear_2595_7193%22%20x1%3D%22163.5%22%20y1%3D%22-2.30278e-07%22%20x2%3D%22164.091%22%20y2%3D%2224.9979%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint5_linear_2595_7193%22%20x1%3D%22505.653%22%20y1%3D%22-17.0791%22%20x2%3D%22506.244%22%20y2%3D%227.91876%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%2318181B%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2318181B%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3CclipPath%20id%3D%22clip0_2595_7193%22%3E%0A%3Crect%20width%3D%22341%22%20height%3D%22164%22%20fill%3D%22white%22%20transform%3D%22translate(0.152832%200.920898)%22%2F%3E%0A%3C%2FclipPath%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="documentation icon" class="documentation-image-dark h-32 sm:h-34" data-v-7af2ada2></div></a></div><div class="lg:min-h-min sm:min-h-[220px] md:min-h-[180px] col-span-2 sm:col-span-1 lg:col-span-6 text-black dark:text-white rounded-xl examples-container relative items-center justify-center border border-gray-200 dark:border-transparent hover:border-transparent" data-v-7af2ada2><div class="gradient-border gradient-border-examples gradient-border-rect" data-v-7af2ada2></div><div class="examples-gradient-right absolute right-0 inset-y-0 w-[20%] bg-gradient-to-l to-transparent from-blue-400 rounded-xl z-1 transition-opacity duration-300" data-v-7af2ada2></div><a href="https://nuxt.com/docs/examples" target="_blank" class="py-6 px-5 rounded-xl flex items-center justify-center gap-x-4 bg-white dark:bg-gray-900 sm:min-h-[220px] md:min-h-[180px] lg:min-h-min" data-v-7af2ada2><img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M49.1971%2043.7595C49.1113%2043.8209%2049.0231%2043.8796%2048.9325%2043.9357L29.0918%2056.2117C27.6504%2057.1035%2025.8212%2057.1564%2024.3387%2056.3439L3.85107%2045.1148C2.27157%2044.2491%201.14238%2042.6366%201.15291%2041.0494L1.15293%2041.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4169%201.73583%2026.2139%201.69824%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8136C50.0797%2014.6078%2050.9898%2016.1132%2051.026%2017.7438L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821C51.1834%2041.4138%2050.4491%2042.8635%2049.1971%2043.7595Z%22%20fill%3D%22white%22%20stroke%3D%22url(%23paint0_linear_2613_3941)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M37.1528%2017.9209H15.1528C14.6224%2017.9209%2014.1137%2018.1316%2013.7386%2018.5067C13.3635%2018.8818%2013.1528%2019.3905%2013.1528%2019.9209V37.9209C13.1528%2038.4513%2013.3635%2038.96%2013.7386%2039.3351C14.1137%2039.7102%2014.6224%2039.9209%2015.1528%2039.9209H37.1528C37.6833%2039.9209%2038.192%2039.7102%2038.567%2039.3351C38.9421%2038.96%2039.1528%2038.4513%2039.1528%2037.9209V19.9209C39.1528%2019.3905%2038.9421%2018.8818%2038.567%2018.5067C38.192%2018.1316%2037.6833%2017.9209%2037.1528%2017.9209V17.9209ZM15.1528%2019.9209H37.1528V24.9209H15.1528V19.9209ZM15.1528%2026.9209H22.1528V37.9209H15.1528V26.9209ZM37.1528%2037.9209H24.1528V26.9209H37.1528V37.9209Z%22%20fill%3D%22url(%23paint1_linear_2613_3941)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2613_3941%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%238DEAFF%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23008AA9%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2613_3941%22%20x1%3D%2213.0804%22%20y1%3D%2222.6224%22%20x2%3D%2237.028%22%20y2%3D%2237.847%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%238DEAFF%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23008AA9%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="examples icon" class="examples-image-color-light" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M3.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4246%201.73116%2026.2124%201.69742%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8137C50.0812%2014.6086%2050.9896%2016.1043%2051.026%2017.7437L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821C51.1856%2041.5203%2050.346%2043.0611%2048.9325%2043.9357L29.0918%2056.2117C27.6424%2057.1085%2025.8227%2057.1572%2024.3387%2056.3439L3.85107%2045.1148C2.26984%2044.2481%201.14232%2042.646%201.15293%2041.0494V41.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869Z%22%20fill%3D%22%2318181B%22%20stroke%3D%22url(%23paint0_linear_2595_7426)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M37.1528%2017.9209H15.1528C14.6224%2017.9209%2014.1137%2018.1316%2013.7386%2018.5067C13.3635%2018.8818%2013.1528%2019.3905%2013.1528%2019.9209V37.9209C13.1528%2038.4513%2013.3635%2038.96%2013.7386%2039.3351C14.1137%2039.7102%2014.6224%2039.9209%2015.1528%2039.9209H37.1528C37.6833%2039.9209%2038.192%2039.7102%2038.567%2039.3351C38.9421%2038.96%2039.1528%2038.4513%2039.1528%2037.9209V19.9209C39.1528%2019.3905%2038.9421%2018.8818%2038.567%2018.5067C38.192%2018.1316%2037.6833%2017.9209%2037.1528%2017.9209ZM15.1528%2019.9209H37.1528V24.9209H15.1528V19.9209ZM15.1528%2026.9209H22.1528V37.9209H15.1528V26.9209ZM37.1528%2037.9209H24.1528V26.9209H37.1528V37.9209Z%22%20fill%3D%22url(%23paint1_linear_2595_7426)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2595_7426%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%238DEAFF%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23008AA9%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2595_7426%22%20x1%3D%2213.0804%22%20y1%3D%2222.6224%22%20x2%3D%2237.028%22%20y2%3D%2237.847%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%238DEAFF%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23008AA9%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="examples icon" class="examples-image-color-dark" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M49.1971%2043.7595C49.1113%2043.8209%2049.0231%2043.8796%2048.9325%2043.9357L29.0918%2056.2117C27.6504%2057.1035%2025.8212%2057.1564%2024.3387%2056.3439L3.85107%2045.1148C2.27157%2044.2491%201.14238%2042.6366%201.15291%2041.0494L1.15293%2041.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4169%201.73583%2026.2139%201.69824%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8136C50.0797%2014.6078%2050.9898%2016.1132%2051.026%2017.7438L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821C51.1834%2041.4138%2050.4491%2042.8635%2049.1971%2043.7595Z%22%20fill%3D%22white%22%20stroke%3D%22url(%23paint0_linear_2691_4397)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M37.1528%2017.9209H15.1528C14.6224%2017.9209%2014.1137%2018.1316%2013.7386%2018.5067C13.3635%2018.8818%2013.1528%2019.3905%2013.1528%2019.9209V37.9209C13.1528%2038.4513%2013.3635%2038.96%2013.7386%2039.3351C14.1137%2039.7102%2014.6224%2039.9209%2015.1528%2039.9209H37.1528C37.6833%2039.9209%2038.192%2039.7102%2038.567%2039.3351C38.9421%2038.96%2039.1528%2038.4513%2039.1528%2037.9209V19.9209C39.1528%2019.3905%2038.9421%2018.8818%2038.567%2018.5067C38.192%2018.1316%2037.6833%2017.9209%2037.1528%2017.9209V17.9209ZM15.1528%2019.9209H37.1528V24.9209H15.1528V19.9209ZM15.1528%2026.9209H22.1528V37.9209H15.1528V26.9209ZM37.1528%2037.9209H24.1528V26.9209H37.1528V37.9209Z%22%20fill%3D%22url(%23paint1_linear_2691_4397)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2691_4397%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23D4D4D8%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2691_4397%22%20x1%3D%2213.0804%22%20y1%3D%2222.6224%22%20x2%3D%2237.028%22%20y2%3D%2237.847%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22%23D4D4D8%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="examples icon" class="examples-image-light" data-v-7af2ada2> <img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2253%22%20height%3D%2258%22%20viewBox%3D%220%200%2053%2058%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M3.43319%2014.5869L3.43322%2014.587L3.44269%2014.5812L22.9844%202.59084C24.4246%201.73116%2026.2124%201.69742%2027.6729%202.49791L27.6729%202.49792L27.6784%202.50094L48.6303%2013.8121C48.6313%2013.8126%2048.6322%2013.8131%2048.6331%2013.8137C50.0812%2014.6086%2050.9896%2016.1043%2051.026%2017.7437L51.1517%2039.8672L51.1517%2039.8746L51.1519%2039.8821C51.1856%2041.5203%2050.346%2043.0611%2048.9325%2043.9357L29.0918%2056.2117C27.6424%2057.1085%2025.8227%2057.1572%2024.3387%2056.3439L3.85107%2045.1148C2.26984%2044.2481%201.14232%2042.646%201.15293%2041.0494V41.0427L1.153%2018.552C1.15301%2018.5509%201.15302%2018.5499%201.15302%2018.5488C1.16485%2016.9324%202.02611%2015.4289%203.43319%2014.5869Z%22%20fill%3D%22%2318181B%22%20stroke%3D%22url(%23paint0_linear_2595_7182)%22%20stroke-width%3D%222%22%2F%3E%0A%3Cpath%20d%3D%22M37.1528%2017.9209H15.1528C14.6224%2017.9209%2014.1137%2018.1316%2013.7386%2018.5067C13.3635%2018.8818%2013.1528%2019.3905%2013.1528%2019.9209V37.9209C13.1528%2038.4513%2013.3635%2038.96%2013.7386%2039.3351C14.1137%2039.7102%2014.6224%2039.9209%2015.1528%2039.9209H37.1528C37.6833%2039.9209%2038.192%2039.7102%2038.567%2039.3351C38.9421%2038.96%2039.1528%2038.4513%2039.1528%2037.9209V19.9209C39.1528%2019.3905%2038.9421%2018.8818%2038.567%2018.5067C38.192%2018.1316%2037.6833%2017.9209%2037.1528%2017.9209ZM15.1528%2019.9209H37.1528V24.9209H15.1528V19.9209ZM15.1528%2026.9209H22.1528V37.9209H15.1528V26.9209ZM37.1528%2037.9209H24.1528V26.9209H37.1528V37.9209Z%22%20fill%3D%22url(%23paint1_linear_2595_7182)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_2595_7182%22%20x1%3D%220.662695%22%20y1%3D%2218.4025%22%20x2%3D%2251.7209%22%20y2%3D%2244.2212%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3ClinearGradient%20id%3D%22paint1_linear_2595_7182%22%20x1%3D%2213.0804%22%20y1%3D%2222.6224%22%20x2%3D%2237.028%22%20y2%3D%2237.847%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2371717A%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A" alt="examples icon" class="examples-image-dark" data-v-7af2ada2><div class="flex flex-col space-y text-black dark:text-white" data-v-7af2ada2><h3 class="font-semibold text-xl" data-v-7af2ada2>Examples</h3><p class="text-gray-700 dark:text-gray-300" data-v-7af2ada2>Explore different way of using Nuxt features and get inspired with our list of examples.</p></div></a></div></div></div><footer class="relative border-t bg-white dark:bg-black border-gray-200 dark:border-gray-900 w-full h-[70px] flex items-center" data-v-7af2ada2><div class="absolute inset-x-0 flex items-center justify-center -top-3" data-v-7af2ada2><a href="https://nuxt.com" target="_blank" data-v-7af2ada2><svg width="70" height="20" viewBox="0 0 70 20" fill="none" xmlns="http://www.w3.org/2000/svg" data-v-7af2ada2><ellipse cx="34.6528" cy="10.4209" rx="34.5" ry="9.5" fill="white" class="dark:hidden" data-v-7af2ada2></ellipse><ellipse cx="34.6528" cy="10.4209" rx="34.5" ry="9.5" fill="black" class="hidden dark:block" data-v-7af2ada2></ellipse><path d="M36.0605 15.9209H42.6256C42.8341 15.9209 43.0389 15.8655 43.2195 15.7602C43.4001 15.6548 43.55 15.5033 43.6543 15.3209C43.7585 15.1384 43.8133 14.9315 43.8132 14.7208C43.8131 14.5102 43.7581 14.3033 43.6537 14.1209L39.2448 6.40667C39.1406 6.22427 38.9907 6.0728 38.8101 5.96748C38.6296 5.86217 38.4248 5.80672 38.2163 5.80672C38.0078 5.80672 37.803 5.86217 37.6225 5.96748C37.4419 6.0728 37.292 6.22427 37.1878 6.40667L36.0605 8.38048L33.8563 4.52076C33.752 4.33837 33.602 4.18692 33.4214 4.08163C33.2409 3.97633 33.036 3.9209 32.8275 3.9209C32.619 3.9209 32.4141 3.97633 32.2335 4.08163C32.053 4.18692 31.903 4.33837 31.7987 4.52076L26.3123 14.1209C26.2079 14.3033 26.1529 14.5102 26.1528 14.7208C26.1527 14.9315 26.2076 15.1384 26.3118 15.3209C26.416 15.5033 26.5659 15.6548 26.7465 15.7602C26.9271 15.8655 27.1319 15.9209 27.3405 15.9209H31.4615C33.0943 15.9209 34.2984 15.1964 35.127 13.7829L37.1385 10.2638L38.216 8.38048L41.4496 14.0376H37.1385L36.0605 15.9209ZM31.3943 14.0356L28.5184 14.035L32.8294 6.49263L34.9805 10.2638L33.5402 12.7844C32.99 13.7015 32.3649 14.0356 31.3943 14.0356Z" fill="#00DC82" data-v-7af2ada2></path></svg></a></div><div class="mx-auto sm:px-6 lg:px-8 px-4 w-full" data-v-7af2ada2><div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-between" data-v-7af2ada2><div class="flex flex-col-reverse items-center gap-3 sm:flex-row" data-v-7af2ada2><span class="text-sm text-gray-700 dark:text-gray-300" data-v-7af2ada2>© 2016-${ssrInterpolate((/* @__PURE__ */ new Date()).getFullYear())} Nuxt - MIT License</span></div><ul class="flex items-center justify-end gap-3" data-v-7af2ada2><li data-v-7af2ada2><a href="https://chat.nuxt.dev" target="_blank" class="focus-visible:ring-2 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white" data-v-7af2ada2><svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" data-v-7af2ada2><path d="M13.3705 1.07322C13.3663 1.06497 13.3594 1.05851 13.351 1.05499C12.3785 0.599487 11.3522 0.274675 10.2978 0.0886873C10.2882 0.0868693 10.2783 0.0881809 10.2695 0.0924354C10.2607 0.0966899 10.2534 0.103671 10.2487 0.112385C10.109 0.371315 9.98212 0.637279 9.86863 0.909263C8.73205 0.733138 7.57595 0.733138 6.43938 0.909263C6.32514 0.636589 6.19624 0.370559 6.05328 0.112385C6.04838 0.10386 6.04107 0.0970401 6.03232 0.0928132C6.02356 0.0885863 6.01377 0.0871486 6.0042 0.0886873C4.9497 0.274285 3.92333 0.599121 2.95092 1.05502C2.9426 1.05862 2.93558 1.06477 2.93082 1.07262C0.986197 4.03716 0.453491 6.92881 0.714819 9.78465C0.715554 9.79165 0.71766 9.79843 0.721013 9.80458C0.724365 9.81073 0.728896 9.81613 0.734334 9.82046C1.86667 10.6763 3.1332 11.3296 4.47988 11.7525C4.48937 11.7554 4.49949 11.7552 4.5089 11.7521C4.51831 11.7489 4.52655 11.7429 4.53251 11.7349C4.82175 11.3331 5.07803 10.9077 5.29876 10.4629C5.3018 10.4568 5.30353 10.4501 5.30384 10.4433C5.30416 10.4365 5.30305 10.4296 5.3006 10.4233C5.29814 10.4169 5.29439 10.4111 5.2896 10.4064C5.2848 10.4016 5.27906 10.3979 5.27277 10.3955C4.86862 10.2377 4.47736 10.0474 4.10266 9.82645C4.09586 9.82236 4.09014 9.81663 4.08602 9.80976C4.0819 9.80288 4.0795 9.79508 4.07903 9.78703C4.07856 9.77899 4.08004 9.77095 4.08334 9.76362C4.08664 9.7563 4.09166 9.74992 4.09794 9.74504C4.17657 9.68491 4.25524 9.62236 4.33032 9.55918C4.33699 9.55358 4.34506 9.54998 4.35362 9.5488C4.36218 9.54762 4.3709 9.54891 4.37879 9.55252C6.83362 10.6962 9.4913 10.6962 11.9171 9.55252C11.925 9.54868 11.9338 9.54721 11.9425 9.54829C11.9512 9.54936 11.9594 9.55293 11.9662 9.55858C12.0413 9.62176 12.1199 9.68491 12.1991 9.74504C12.2054 9.74987 12.2105 9.75621 12.2138 9.7635C12.2172 9.7708 12.2187 9.77882 12.2183 9.78687C12.2179 9.79492 12.2156 9.80274 12.2115 9.80964C12.2074 9.81654 12.2018 9.82232 12.195 9.82645C11.8211 10.0492 11.4295 10.2394 11.0243 10.3949C11.018 10.3974 11.0123 10.4012 11.0075 10.406C11.0028 10.4109 10.9991 10.4167 10.9967 10.4231C10.9943 10.4295 10.9932 10.4364 10.9936 10.4433C10.9939 10.4501 10.9957 10.4568 10.9988 10.4629C11.2232 10.9052 11.4791 11.3301 11.7645 11.7342C11.7703 11.7425 11.7785 11.7487 11.7879 11.7519C11.7974 11.7552 11.8076 11.7554 11.8171 11.7524C13.1662 11.331 14.4349 10.6776 15.5687 9.82046C15.5742 9.81635 15.5788 9.81108 15.5822 9.80501C15.5855 9.79893 15.5876 9.7922 15.5882 9.78525C15.9011 6.4836 15.0644 3.61565 13.3705 1.07322ZM5.66537 8.04574C4.92629 8.04574 4.31731 7.35337 4.31731 6.50305C4.31731 5.65274 4.91448 4.96032 5.66537 4.96032C6.42213 4.96032 7.02522 5.65875 7.01341 6.503C7.01341 7.35337 6.41622 8.04574 5.66537 8.04574ZM10.6496 8.04574C9.91051 8.04574 9.30153 7.35337 9.30153 6.50305C9.30153 5.65274 9.8987 4.96032 10.6496 4.96032C11.4064 4.96032 12.0094 5.65875 11.9976 6.503C11.9976 7.35337 11.4064 8.04574 10.6496 8.04574Z" fill="currentColor" data-v-7af2ada2></path></svg></a></li><li data-v-7af2ada2><a href="https://twitter.nuxt.dev" target="_blank" class="focus-visible:ring-2 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white" data-v-7af2ada2><svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" data-v-7af2ada2><path d="M17.486 1.75441C16.8596 2.02615 16.1972 2.20579 15.5193 2.28774C16.2345 1.86051 16.7704 1.18839 17.0277 0.396073C16.3556 0.796126 15.62 1.07799 14.8527 1.22941C14.3398 0.673216 13.6568 0.302987 12.9108 0.176783C12.1649 0.0505786 11.3981 0.175539 10.7308 0.532064C10.0635 0.88859 9.53345 1.45652 9.2237 2.14677C8.91396 2.83702 8.84208 3.61056 9.01934 4.34607C7.66053 4.27734 6.33137 3.92353 5.11822 3.30762C3.90506 2.69171 2.83504 1.82748 1.97767 0.771073C1.67695 1.29621 1.51894 1.89093 1.51934 2.49607C1.51827 3.05806 1.65618 3.61159 1.9208 4.10738C2.18541 4.60317 2.56852 5.02583 3.036 5.33774C2.49265 5.32296 1.96091 5.17716 1.486 4.91274V4.95441C1.49008 5.74182 1.766 6.50365 2.2671 7.11104C2.7682 7.71844 3.46372 8.13411 4.236 8.28774C3.93872 8.37821 3.63007 8.42591 3.31934 8.42941C3.10424 8.42689 2.88969 8.40739 2.67767 8.37107C2.89759 9.04842 3.32319 9.64036 3.89523 10.0645C4.46728 10.4887 5.15732 10.724 5.86934 10.7377C4.66701 11.6838 3.18257 12.2001 1.65267 12.2044C1.37412 12.2053 1.09578 12.1886 0.819336 12.1544C2.38136 13.163 4.20168 13.6983 6.061 13.6961C7.34408 13.7094 8.61695 13.4669 9.80527 12.9828C10.9936 12.4987 12.0735 11.7826 12.982 10.8765C13.8905 9.97033 14.6093 8.89223 15.0965 7.70516C15.5836 6.51809 15.8294 5.24585 15.8193 3.96274C15.8193 3.82107 15.8193 3.67107 15.8193 3.52107C16.4732 3.03342 17.0372 2.43559 17.486 1.75441Z" fill="currentColor" data-v-7af2ada2></path></svg></a></li><li data-v-7af2ada2><a href="https://github.nuxt.dev" target="_blank" class="focus-visible:ring-2 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white" data-v-7af2ada2><svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" data-v-7af2ada2><path d="M9.15269 0.792969C7.17392 0.793051 5.25974 1.49723 3.75266 2.77951C2.24558 4.06179 1.24394 5.83849 0.92697 7.7917C0.609997 9.74492 0.998373 11.7472 2.02261 13.4403C3.04684 15.1333 4.6401 16.4067 6.51729 17.0325C6.93396 17.1055 7.09021 16.8555 7.09021 16.6367C7.09021 16.4388 7.07978 15.7825 7.07978 15.0846C4.98603 15.47 4.44436 14.5742 4.27769 14.1055C4.09276 13.6496 3.79959 13.2456 3.42353 12.9284C3.13186 12.7721 2.71519 12.3867 3.4131 12.3763C3.67959 12.4052 3.93518 12.498 4.15822 12.6467C4.38125 12.7953 4.56516 12.9956 4.69436 13.2305C4.80833 13.4352 4.96159 13.6155 5.14535 13.7609C5.32911 13.9063 5.53975 14.014 5.76522 14.0779C5.99068 14.1418 6.22653 14.1605 6.45926 14.1331C6.69198 14.1056 6.917 14.0325 7.12143 13.918C7.1575 13.4943 7.34631 13.0982 7.65269 12.8034C5.79853 12.5951 3.86103 11.8763 3.86103 8.68883C3.84931 7.86062 4.15493 7.05931 4.71519 6.44924C4.46043 5.72943 4.49024 4.93948 4.79853 4.24091C4.79853 4.24091 5.49642 4.02215 7.09019 5.09508C8.45376 4.72005 9.89328 4.72005 11.2569 5.09508C12.8506 4.01174 13.5485 4.24091 13.5485 4.24091C13.8569 4.93947 13.8867 5.72943 13.6319 6.44924C14.1938 7.05826 14.4997 7.86027 14.486 8.68883C14.486 11.8867 12.5381 12.5951 10.6839 12.8034C10.8828 13.005 11.036 13.247 11.133 13.513C11.2301 13.779 11.2688 14.0628 11.2464 14.3451C11.2464 15.4597 11.236 16.3555 11.236 16.6367C11.236 16.8555 11.3923 17.1159 11.8089 17.0326C13.6828 16.4016 15.2715 15.1253 16.2914 13.4313C17.3112 11.7374 17.6959 9.73616 17.3768 7.78483C17.0576 5.83351 16.0553 4.05911 14.5489 2.77839C13.0425 1.49768 11.1299 0.793998 9.15269 0.792969Z" fill="currentColor" data-v-7af2ada2></path></svg></a></li></ul></div></div></footer></div>`);
    };
  }
};
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/.pnpm/@nuxt+ui-templates@1.3.1/node_modules/@nuxt/ui-templates/dist/templates/welcome.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const __nuxt_component_0 = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-7af2ada2"]]);
const _sfc_main$2 = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_NuxtWelcome = __nuxt_component_0;
  _push(`<div${ssrRenderAttrs(_attrs)}><h1>哈哈哈</h1>`);
  _push(ssrRenderComponent(_component_NuxtWelcome, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const AppComponent = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["ssrRender", _sfc_ssrRender]]);
const _sfc_main$1 = {
  __name: "nuxt-error-page",
  __ssrInlineRender: true,
  props: {
    error: Object
  },
  setup(__props) {
    const props = __props;
    const _error = props.error;
    (_error.stack || "").split("\n").splice(1).map((line) => {
      const text = line.replace("webpack:/", "").replace(".vue", ".js").trim();
      return {
        text,
        internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
      };
    }).map((i) => `<span class="stack${i.internal ? " internal" : ""}">${i.text}</span>`).join("\n");
    const statusCode = Number(_error.statusCode || 500);
    const is404 = statusCode === 404;
    const statusMessage = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
    const description = _error.message || _error.toString();
    const stack = void 0;
    const _Error404 = defineAsyncComponent(() => import('./_nuxt/error-404-CvXP07vE.mjs').then((r) => r.default || r));
    const _Error = defineAsyncComponent(() => import('./_nuxt/error-500-okes8lt2.mjs').then((r) => r.default || r));
    const ErrorTemplate = is404 ? _Error404 : _Error;
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({ statusCode: unref(statusCode), statusMessage: unref(statusMessage), description: unref(description), stack: unref(stack) }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/.pnpm/nuxt@3.10.2_vite@5.1.3/node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ErrorComponent = _sfc_main$1;
const _sfc_main = {
  __name: "nuxt-root",
  __ssrInlineRender: true,
  setup(__props) {
    const IslandRenderer = defineAsyncComponent(() => import('./_nuxt/island-renderer-JwGTzM1h.mjs').then((r) => r.default || r));
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    nuxtApp.deferHydration();
    nuxtApp.ssrContext.url;
    const SingleRenderer = false;
    provide(PageRouteSymbol, useRoute());
    nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup");
    const error = useError();
    onErrorCaptured((err, target, info) => {
      nuxtApp.hooks.callHook("vue:error", err, target, info).catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
      {
        const p = nuxtApp.runWithContext(() => showError(err));
        onServerPrefetch(() => p);
        return false;
      }
    });
    const islandContext = nuxtApp.ssrContext.islandContext;
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderSuspense(_push, {
        default: () => {
          if (unref(error)) {
            _push(ssrRenderComponent(unref(ErrorComponent), { error: unref(error) }, null, _parent));
          } else if (unref(islandContext)) {
            _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
          } else if (unref(SingleRenderer)) {
            ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
          } else {
            _push(ssrRenderComponent(unref(AppComponent), null, null, _parent));
          }
        },
        _: 1
      });
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/.pnpm/nuxt@3.10.2_vite@5.1.3/node_modules/nuxt/dist/app/components/nuxt-root.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RootComponent = _sfc_main;
let entry;
{
  entry = async function createNuxtAppServer(ssrContext) {
    const vueApp = createApp(RootComponent);
    const nuxt = createNuxtApp({ vueApp, ssrContext });
    try {
      await applyPlugins(nuxt, plugins);
      await nuxt.hooks.callHook("app:created", vueApp);
    } catch (error) {
      await nuxt.hooks.callHook("app:error", error);
      nuxt.payload.error = nuxt.payload.error || createError(error);
    }
    if (ssrContext == null ? void 0 : ssrContext._renderResponse) {
      throw new Error("skipping render");
    }
    return vueApp;
  };
}
const entry$1 = (ssrContext) => entry(ssrContext);

export { Bn as B, _export_sfc as _, parseQuery as a, useRuntimeConfig as b, createError as c, withoutTrailingSlash as d, entry$1 as default, useHead as e, br as f, hasProtocol as h, joinURL as j, navigateTo as n, parseURL as p, useRouter as u, withTrailingSlash as w };
//# sourceMappingURL=server.mjs.map
