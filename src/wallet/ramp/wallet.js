import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'
import { Store } from 'src/store'

export class RampWallet {
  constructor (walletHash, walletIndex, connectedAddressIndex, lastAddressIndex, address, isChipnet = false) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.connectedAddressIndex = connectedAddressIndex
    this.lastAddressIndex = lastAddressIndex
    this.address = address
    this.isChipnet = isChipnet
  }

  async raw () {
    const rawWallet = await markRaw(loadWallet('BCH', this.walletIndex))
    if (this.isChipnet) return rawWallet.BCH_CHIP
    return rawWallet.BCH
  }

  async keypair () {
    const raw = await this.raw()
    const privateKeyWif = await raw.getPrivateKey(this.connectedAddressIndex)
    const publicKey = await raw.getPublicKey(this.connectedAddressIndex)
    return {
      privateKey: privateKeyWif,
      publicKey: publicKey
    }
  }

  async pubkey () {
    const raw = await this.raw()
    const publicKey = await raw.getPublicKey(this.connectedAddressIndex)
    return publicKey
  }

  async privkey () {
    const raw = await this.raw()
    const privateKeyWif = await raw.getPrivateKey(this.connectedAddressIndex)
    return privateKeyWif
  }

  async signMessage (message, timestamp) {
    const wif = await this.privkey()
    // hash the message
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = await sha256.hash(utf8ToBin(message))
    const privateKeyBin = decodePrivateKeyWif(wif).privateKey
    if (typeof privateKeyBin === 'string') throw (new IncorrectWIFError(wif))
    // sign
    const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
    if (typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin)
    return signature
  }
}

const isChipnet = Store.getters['global/isChipnet']
const walletIndex = Store.getters['global/getWalletIndex']
const wallet = Store.getters['global/getWallet']('bch')
const { connectedAddressIndex } = Store.getters['global/getWallet']('bch')
const address = Store.getters['global/getAddress']('bch')
const lastAddressIndex = Store.getters['global/getLastAddressIndex']('bch')

export const rampWallet = new RampWallet(wallet.walletHash, walletIndex, connectedAddressIndex, lastAddressIndex, address, isChipnet)
