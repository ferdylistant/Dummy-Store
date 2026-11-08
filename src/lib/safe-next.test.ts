import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { safeNext } from './safe-next.ts'

describe('safeNext', () => {
  it('keeps paths on this site', () => {
    assert.equal(safeNext('/akun/pesanan'), '/akun/pesanan')
    assert.equal(safeNext('/produk?q=kaos#hasil'), '/produk?q=kaos#hasil')
    assert.equal(safeNext(['/keranjang', '/lain']), '/keranjang')
  })

  it('refuses every way of pointing at another site', () => {
    for (const attack of [
      '//evil.com',
      '/\\evil.com',
      '/\\/evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      'evil.com',
    ]) {
      const result = safeNext(attack)
      assert.ok(result.startsWith('/') && !result.startsWith('//'), `${JSON.stringify(attack)} gave ${result}`)
      assert.equal(new URL(result, 'https://toko.example').origin, 'https://toko.example', JSON.stringify(attack))
    }
  })

  it('falls back when there is nothing usable', () => {
    assert.equal(safeNext(undefined), '/akun')
    assert.equal(safeNext(''), '/akun')
    assert.equal(safeNext(null, '/'), '/')
  })
})
