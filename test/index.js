const assert = require('assert');
const snabbdom = require('snabbdom');
const snabbdomSignature = require('./../dist/index');
const signingH = snabbdomSignature.signingH;
const removeSignature = snabbdomSignature.removeSignature;
const sign = snabbdomSignature.sign;
const patch = snabbdom.init([
  snabbdomSignature.denyUnlessSigned,
  require('snabbdom/modules/class').default,
  require('snabbdom/modules/props').default,
  require('snabbdom/modules/style').default,
  require('snabbdom/modules/eventlisteners').default,
]);
const defaultH = require('snabbdom/h').default;

const h = signingH(defaultH);

const expectedError = /not correctly signed/;
const complexVnode = /* sel, data, children */ h('p', {style: {fontWeight: 'bold'}}, [
  // sel, data, child
  h('span', {}, /* sel, primitive */h('b', 'text')),
  // primitive
  'text',
  // sel
  h('u'),
  // sel, data
  h('i', {style: {fontWeight: 'bold'}})
]);
const complexVnodeHTML = '<p style="font-weight: bold;"><span><b>text</b></span>text<u></u><i style="font-weight: bold;"></i></p>';

describe('snabbdom-signature', () => {

  it('does not change the regular workflow', () => {
    const container = document.createElement('div');
    const patched = patch(container, complexVnode);
    assert.equal(patched.elm.outerHTML, complexVnodeHTML);
  });

  xit('exports a piece of signed data', () => {
    const manuallySigned = defaultH('b', snabbdomSignature.signedData, 'test');
    const container = document.createElement('div');
    const patched = patch(container, manuallySigned);
    assert.equal(patched.elm.outerHTML, '<b>test</b>');
  });

  describe('removing signatures', () => {

    it('gives a way to remove the signature', () => {
      const unsigned = removeSignature(complexVnode);
      const assertNoSignature = tree => {
        assert((tree.data === undefined) || (tree.data.snabbdom_signature === undefined));
        if (tree.children) tree.children.forEach(assertNoSignature);
      }
      assertNoSignature(unsigned);
      assert.throws(() => {
        const container = document.createElement('div');
        patch(container, unsigned);
      }, expectedError);
    });

    const assertImpossibleToRemoveSignature = (tree) => () => {
      assert.throws(() => removeSignature(tree), /is not signed/);
    };

    it('throws an error when the parent node is not signed', 
      assertImpossibleToRemoveSignature(
        defaultH('p', [
          'unsigned, but just text', 
          h('span', 'signed')
        ])
      )
    );

    it('throws an error when a child is not signed', 
      assertImpossibleToRemoveSignature(
        h('p', [
          'unsigned, but just text', 
          defaultH('span', 'unsigned')
        ])
      )
    );

  });

  it('gives a way to trust untrusted vnodes', () => {
    const signedAgain = sign(removeSignature(complexVnode));
    const container = document.createElement('div');
    const patched = patch(container, signedAgain);
    assert.equal(patched.elm.outerHTML, complexVnodeHTML);
  });

  it('does NOT allow to create a DOM element based on an unsigned vnode', () => {
    assert.throws(() => {
      const unsignedVnode = {sel: 'span', data: {}, text: 'a'};
      const container = document.createElement('div');
      patch(container, unsignedVnode);
    }, expectedError);
  });

  it('does NOT allow to update a DOM element based on an unsigned vnode', () => {
    assert.throws(() => {
      const signedVnode = h('span', 'aa');
      const unsignedVnode = {sel: 'span', data: {}, text: 'ab'};
      const container = document.createElement('div');
      patch(patch(container, signedVnode), unsignedVnode);
    }, expectedError);
  });

});