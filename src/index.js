const signatureKey = 'snabbdom_signature';

const signature = Symbol.for(signatureKey);

export const signedData = {[signatureKey]: signature};

const signData = data => Object.assign({}, data, signedData);

const isPlainTextNode = vnode => (
  (vnode.children === undefined)
  && (vnode.data === undefined)
  && (vnode.key === undefined)
);

const isSigned = vnode => {
  return vnode.data 
    ? (vnode.data[signatureKey] === signature)
    :  isPlainTextNode(vnode);
};

const removeSignatureFromData = data => {
  return Object.assign({}, data, {[signatureKey]: undefined});
};

const isPrimitive = a => ['string', 'number'].includes(typeof a);

export const signingH = defaultH => (sel, b, c) => {
  if (c !== undefined) {
    // a - sel, b - data, c - primitive/child/children
    return defaultH(sel, signData(b), c);
  } else if (b === undefined) {
    // a - sel
    return defaultH(sel, signedData);
  } else if (Array.isArray(b) || b.sel || isPrimitive(b)) {
    // a - sel, b - primitive/child/children
    return defaultH(sel, signedData, b);
  } else {
    // a - sel, b - data
    return defaultH(sel, signData(b));
  }
};

const denyUnlessSignedHook = (oldVnode, vnode) => {
  if (!isSigned(vnode)) {
    throw new Error('Patching with a vnode which is not correctly signed!');
  }
};

export const denyUnlessSigned = {
  create: denyUnlessSignedHook,
  update: denyUnlessSignedHook,
};

const processDataRecursively = (checkIfValidVnode, dataProcessFn) => {
  const fn = tree => {
    checkIfValidVnode(tree);
    const data = dataProcessFn(tree.data);
    const children = tree.children ? tree.children.map(fn) : undefined;
    return Object.assign({}, tree, {data, children});
  };
  return fn;
};

export const removeSignature = processDataRecursively(
  (vnode) => {
    if (!isSigned(vnode)) {
      throw new Error('Unable to remove the signature, because the vnode is not signed.');
    }
  }, 
  removeSignatureFromData
);

export const sign = processDataRecursively(() => {}, signData);