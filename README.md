# Snabbdom-Signature
Protects your app against vnode injection.
```javascript
const text = userInput.potentiallyMaliciousInput;
// Thanks to Snabbdom-Signature this is XSS-free.
const vnode = h('p', text);
```

## The problem Snabbdom-Signature solves
Snabbdom vnodes are just data structures. 
It's impossible distinguish vnodes created by the programmer from user-supplied objects. 
Malicious vnodes may come from sources like web requests or document-oriented databases.
It is a type of [XSS attacks](https://www.owasp.org/index.php/Cross-site_Scripting_(XSS)).

## How does Snabbdom-Signature work?
Snabbdom-Signature ships with two essential parts.
1. A `h` vnode factory function which marks the vnodes it creates with a [Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol).
```javascript
const h = snabbdomSignature.signingH(require('snabbdom/h').default);
const vnode = h('p', text); // {sel: "p", data: {snabbdom_signature: Symbol(snabbdom_signature)}, /* ... */ }
```
Please bear in mind that in order for this mechanism to work, __the browser must support Symbols__.

2. A module which allows DOM elements to be created only based on signed (marked with a Symbol) vnodes.
```javascript
const patch = snabbdom.init([
  snabbdomSignature.denyUnlessSigned,
  // other modules
]);
```
Since now the `patch` function throws an error (`Error: Patching with a vnode which is not correctly signed!`) when it encounters an unsigned vnode.

## Getting Snabbdom-Signature
First, install the package.
```
npm i snabbdom-signature
```
Then, add the `denyUnlessSigned` module to your snabbdom init call and get the vnode signing version of the `h` function.
```javascript
const snabbdom = require('snabbdom');
// Include the Snabbdom-Signature package
const snabbdomSignature = require('snabbdom-signature');
const patch = snabbdom.init([
  // Add the snabbdomSignature.denyUnlessSigned module 
  // to make sure that every vnode has been created by the programmer 
  // and not a malicious user.
  snabbdomSignature.denyUnlessSigned,
  // other modules
]);
// This helper function signs vnodes. 
// Use it like you use the default h helper.
const h = snabbdomSignature.signingH(require('snabbdom/h').default); 
```
## Transferring vnodes (postMessage, Worker, JSON etc.)
1. Remove the signature from a tree

Let's say `signedVnode` is a complex tree with many signed vnodes.

In order to be able to do things like sending vnodes to another window, we need to remove all the signatures, because Symbols don't survive structured cloning.
```javascript
const snabbdomSignature = require('snabbdom-signature');
const removeSignature = snabbdomSignature.removeSignature;

// This form is ready for serialization/structured cloning.
const unsigned = removeSignature(signedVnode);
```
Because signature validation usually happens during the patching phase, there's a chance that the tree we pass to the `removeSignature` function consists of an injected, malicious vnode. That's why __the removeSignature function verifies the signature and throws an error if it's invalid__. You can be sure that if the signature is removed successfully, you can trust this tree again.

2. Sign an unsigned tree coming from a trusted source

In the previous step we built a potentially dangerous tree of vnodes. Then, we used the `removeSignature` function to remove automatically added signatures (after verifying if all nodes were correctly signed).

Let's say that `unsigned` is that signature-less tree received from a trusted source. In order to be able to use it, we need to add all the signatures again.
```javascript
const snabbdomSignature = require('snabbdom-signature');
const sign = snabbdomSignature.sign;

// This form is accepted by the patch function.
const signedAgain = sign(unsigned);
```
__Please, make sure that you're not calling `trust` on trees coming from untrusted sources, like user-supplied JSON etc.__ Otherwise, there's a risk of XSS. Also, make sure that the unsigned node you're trusting has been somehow verified earlier, either by the `removeSignature` function or by successfully `patch`ing the DOM with it.

## Development
If you found a security vulnerability in this package, please write to me at kontakt@lukaszmakuch.pl.

If you know a way to improve the performance or fix a bug which is not related to security, feel free to create an issue or submit a pull request.